import { randomBytes } from "crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ContributionFrequency,
  DisbursementStatus,
  TontineVisibility,
  ValidationDecision,
  type DisbursementRequestSummary,
  type OrganizerMemberLine,
  type OrganizerStatus,
  type OrganizerTontineDetail,
  type OrganizerTontineSummary,
  type ValidatorLine,
} from "@bingmoney/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { WalletService } from "../wallet/wallet.service";
import { CreateTontineDto } from "./dto/create-tontine.dto";
import { ValidateDisbursementDto } from "./dto/validate-disbursement.dto";

const REQUIRED_VALIDATOR_COUNT = 3;

@Injectable()
export class OrganizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly walletService: WalletService,
  ) {}

  async getStatus(userId: string): Promise<OrganizerStatus> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      isOrganizer: user.isOrganizer,
      organizerActivatedAt: user.organizerActivatedAt?.toISOString() ?? null,
      kycVerified: user.kycStatus === "VERIFIED",
    };
  }

  async activate(userId: string, acceptedResponsibilities: boolean): Promise<OrganizerStatus> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.kycStatus !== "VERIFIED") {
      throw new BadRequestException("Identité non vérifiée : terminez votre KYC avant de devenir organisateur");
    }
    if (!acceptedResponsibilities) {
      throw new BadRequestException("Vous devez accepter les responsabilités de l'organisateur");
    }

    if (!user.isOrganizer) {
      const termsSnapshot = { version: "v1", acceptedResponsibilities: true };
      await this.prisma.$transaction([
        this.prisma.organizerActivation.upsert({
          where: { userId },
          create: { userId, termsSnapshot },
          update: { termsSnapshot, acceptedAt: new Date() },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { isOrganizer: true, organizerActivatedAt: new Date() },
        }),
      ]);
    }

    return this.getStatus(userId);
  }

  async createTontine(userId: string, dto: CreateTontineDto): Promise<OrganizerTontineSummary> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.isOrganizer) {
      throw new BadRequestException("Devenez organisateur avant de créer une tontine");
    }
    if (dto.visibility === TontineVisibility.PUBLIC && user.kycStatus !== "VERIFIED") {
      throw new BadRequestException("Identité non vérifiée : requis pour une tontine publique");
    }

    const validators = await this.prisma.user.findMany({
      where: { phoneNumber: { in: dto.validatorPhoneNumbers } },
    });
    if (validators.length !== REQUIRED_VALIDATOR_COUNT) {
      const found = new Set(validators.map((v) => v.phoneNumber));
      const missing = dto.validatorPhoneNumbers.filter((p) => !found.has(p));
      throw new BadRequestException(`Numéro(s) BingMoney introuvable(s) : ${missing.join(", ")}`);
    }

    const inviteCode = dto.visibility === TontineVisibility.PRIVATE ? await this.generateInviteCode() : null;

    const groupId = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.create({ data: {} });
      const product = await tx.tontineProduct.create({
        data: {
          name: dto.name,
          kind: dto.kind,
          description: dto.description,
          contributionAmount: dto.contributionAmount,
          frequency: dto.frequency,
          totalSlots: dto.totalSlots,
          minTrustScore: 0,
          lateGracePeriodDays: dto.lateGracePeriodDays,
          latePenaltyRateBps: dto.latePenaltyRateBps,
          visibility: dto.visibility,
          createdByUserId: userId,
        },
      });
      const group = await tx.tontineGroup.create({
        data: { productId: product.id, label: dto.name, walletId: wallet.id, inviteCode },
      });
      await tx.tontineValidator.createMany({
        data: validators.map((v) => ({ groupId: group.id, userId: v.id })),
      });
      return group.id;
    });

    return this.buildTontineSummary(groupId);
  }

  async listMyTontines(userId: string): Promise<OrganizerTontineSummary[]> {
    const groups = await this.prisma.tontineGroup.findMany({
      where: { product: { createdByUserId: userId } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(groups.map((g) => this.buildTontineSummary(g.id)));
  }

  async getTontineDetail(userId: string, groupId: string): Promise<OrganizerTontineDetail> {
    const group = await this.loadOrganizerGroup(userId, groupId);
    const summary = await this.buildTontineSummary(groupId, group);

    const members: OrganizerMemberLine[] = group.subscriptions
      .sort((a, b) => a.turnNumber - b.turnNumber)
      .map((sub) => ({
        turnNumber: sub.turnNumber,
        fullName: sub.user.fullName,
        phoneNumber: sub.user.phoneNumber,
        status: this.overallMemberStatus(sub.contributions),
      }));

    const validators: ValidatorLine[] = group.validators.map((v) => ({
      userId: v.userId,
      fullName: v.user.fullName,
      phoneNumber: v.user.phoneNumber,
    }));

    const disbursementRequests: DisbursementRequestSummary[] = group.disbursementRequests
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => this.toDisbursementRequestSummary(r, group.validators, group.label, group.product.name));

    const completedCycles = new Set(
      group.disbursementRequests.filter((r) => r.status === DisbursementStatus.COMPLETED).map((r) => r.cycleNumber),
    );
    const nextBeneficiary = group.subscriptions
      .sort((a, b) => a.turnNumber - b.turnNumber)
      .find((sub) => !completedCycles.has(sub.turnNumber));
    const activeCycles = new Set(
      group.disbursementRequests
        .filter((r) => r.status === DisbursementStatus.PENDING || r.status === DisbursementStatus.COMPLETED)
        .map((r) => r.cycleNumber),
    );

    return {
      ...summary,
      members,
      validators,
      disbursementRequests,
      nextBeneficiaryTurnNumber: nextBeneficiary?.turnNumber ?? null,
      nextCycleReadyForDisbursement: nextBeneficiary ? !activeCycles.has(nextBeneficiary.turnNumber) : false,
    };
  }

  async listPendingValidations(userId: string): Promise<DisbursementRequestSummary[]> {
    const requests = await this.prisma.disbursementRequest.findMany({
      where: { status: DisbursementStatus.PENDING, group: { validators: { some: { userId } } } },
      include: {
        group: { include: { product: true, validators: { include: { user: true } } } },
        subscription: { include: { user: true } },
        validations: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return requests
      .filter((r) => !r.validations.some((v) => v.validatorUserId === userId))
      .map((r) => this.toDisbursementRequestSummary(r, r.group.validators, r.group.label, r.group.product.name));
  }

  async requestDisbursement(userId: string, groupId: string, cycleNumber: number): Promise<DisbursementRequestSummary> {
    const group = await this.loadOrganizerGroup(userId, groupId);

    const beneficiary = group.subscriptions.find((s) => s.turnNumber === cycleNumber);
    if (!beneficiary) throw new BadRequestException("Aucun bénéficiaire pour ce cycle");

    const active = group.disbursementRequests.find(
      (r) => r.cycleNumber === cycleNumber && r.status !== DisbursementStatus.REJECTED,
    );
    if (active) throw new BadRequestException("Une demande de décaissement existe déjà pour ce cycle");

    const amount = group.subscriptions.reduce(
      (sum, sub) =>
        sum + sub.contributions.filter((c) => c.cycleNumber === cycleNumber && c.paidAt).reduce((s, c) => s + c.amount, 0),
      0,
    );

    const request = await this.prisma.disbursementRequest.create({
      data: {
        groupId,
        subscriptionId: beneficiary.id,
        cycleNumber,
        amount,
        requestedByUserId: userId,
      },
    });

    return this.toDisbursementRequestSummary(
      { ...request, subscription: beneficiary, validations: [] },
      group.validators,
      group.label,
      group.product.name,
    );
  }

  async validateDisbursement(
    userId: string,
    requestId: string,
    dto: ValidateDisbursementDto,
  ): Promise<DisbursementRequestSummary> {
    const request = await this.prisma.disbursementRequest.findUnique({
      where: { id: requestId },
      include: {
        group: { include: { product: true, validators: { include: { user: true } } } },
        subscription: { include: { user: true, contributions: true } },
        validations: true,
      },
    });
    if (!request) throw new NotFoundException("Demande introuvable");
    if (request.status !== DisbursementStatus.PENDING) {
      throw new BadRequestException("Cette demande n'est plus en attente de validation");
    }

    const isValidator = request.group.validators.some((v) => v.userId === userId);
    if (!isValidator) throw new ForbiddenException("Vous n'êtes pas validateur de cette tontine");

    await this.authService.verifyPin(userId, dto.pin);

    try {
      await this.prisma.disbursementValidation.create({
        data: { requestId, validatorUserId: userId, decision: dto.decision },
      });
    } catch (err) {
      if (isUniqueConstraintViolation(err)) {
        throw new BadRequestException("Vous avez déjà voté sur cette demande");
      }
      throw err;
    }

    if (dto.decision === ValidationDecision.REJECTED) {
      await this.prisma.disbursementRequest.update({
        where: { id: requestId },
        data: { status: DisbursementStatus.REJECTED, decidedAt: new Date() },
      });
    } else {
      const approvedCount = request.validations.filter((v) => v.decision === ValidationDecision.APPROVED).length + 1;
      if (approvedCount >= request.group.validators.length) {
        const txn = await this.walletService.disburseTontine(
          request.group.walletId,
          request.subscription.userId,
          request.amount,
          `disbursement-${requestId}`,
          `Décaissement · ${request.subscription.user.fullName ?? request.subscription.user.phoneNumber}`,
          { requestId, cycleNumber: request.cycleNumber },
        );
        await this.prisma.disbursementRequest.update({
          where: { id: requestId },
          data: { status: DisbursementStatus.COMPLETED, transactionId: txn.id, decidedAt: new Date() },
        });
      }
    }

    const updated = await this.prisma.disbursementRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { subscription: { include: { user: true } }, validations: true },
    });
    return this.toDisbursementRequestSummary(updated, request.group.validators, request.group.label, request.group.product.name);
  }

  // --- helpers ---

  private async loadOrganizerGroup(userId: string, groupId: string) {
    const group = await this.prisma.tontineGroup.findUnique({
      where: { id: groupId },
      include: {
        product: true,
        subscriptions: { include: { user: true, contributions: true } },
        validators: { include: { user: true } },
        disbursementRequests: { include: { subscription: { include: { user: true } }, validations: true } },
      },
    });
    if (!group || group.product.createdByUserId !== userId) {
      throw new NotFoundException("Tontine introuvable");
    }
    return group;
  }

  private async buildTontineSummary(
    groupId: string,
    preloaded?: Awaited<ReturnType<OrganizerService["loadOrganizerGroup"]>>,
  ): Promise<OrganizerTontineSummary> {
    const group =
      preloaded ??
      (await this.prisma.tontineGroup.findUniqueOrThrow({
        where: { id: groupId },
        include: {
          product: true,
          subscriptions: { include: { user: true, contributions: true } },
          validators: { include: { user: true } },
          disbursementRequests: { include: { subscription: { include: { user: true } }, validations: true } },
        },
      }));
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { id: group.walletId } });
    const statuses = group.subscriptions.map((s) => this.overallMemberStatus(s.contributions));
    const membersLate = statuses.filter((s) => s === "LATE").length;

    return {
      groupId: group.id,
      productId: group.productId,
      name: group.product.name,
      kind: group.product.kind as OrganizerTontineSummary["kind"],
      description: group.product.description,
      contributionAmount: group.product.contributionAmount,
      frequency: group.product.frequency as ContributionFrequency,
      totalSlots: group.product.totalSlots,
      memberCount: group.subscriptions.length,
      membersUpToDate: statuses.length - membersLate,
      membersLate,
      visibility: group.product.visibility as TontineVisibility,
      inviteCode: group.inviteCode,
      potBalance: wallet.balance,
      status: group.status as OrganizerTontineSummary["status"],
    };
  }

  private overallMemberStatus(contributions: { paidAt: Date | null; dueDate: Date }[]): "PAID" | "UPCOMING" | "LATE" {
    const hasLate = contributions.some((c) => !c.paidAt && c.dueDate.getTime() < Date.now());
    if (hasLate) return "LATE";
    return contributions.every((c) => c.paidAt) ? "PAID" : "UPCOMING";
  }

  private toDisbursementRequestSummary(
    request: {
      id: string;
      groupId: string;
      cycleNumber: number;
      amount: number;
      status: string;
      createdAt: Date;
      subscription: { user: { fullName: string | null; phoneNumber: string } };
      validations: { validatorUserId: string; decision: string }[];
    },
    validators: { userId: string; user: { fullName: string | null } }[],
    groupLabel: string,
    productName: string,
  ): DisbursementRequestSummary {
    return {
      id: request.id,
      groupId: request.groupId,
      groupLabel,
      productName,
      cycleNumber: request.cycleNumber,
      amount: request.amount,
      status: request.status as DisbursementStatus,
      beneficiaryFullName: request.subscription.user.fullName,
      beneficiaryPhoneNumber: request.subscription.user.phoneNumber,
      requiredValidations: REQUIRED_VALIDATOR_COUNT,
      validations: validators.map((v) => {
        const vote = request.validations.find((x) => x.validatorUserId === v.userId);
        return {
          validatorUserId: v.userId,
          fullName: v.user.fullName,
          decision: (vote?.decision as ValidationDecision | undefined) ?? null,
        };
      }),
      createdAt: request.createdAt.toISOString(),
    };
  }

  private async generateInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(4).toString("hex").toUpperCase();
      const existing = await this.prisma.tontineGroup.findUnique({ where: { inviteCode: code } });
      if (!existing) return code;
    }
    throw new BadRequestException("Impossible de générer un code d'invitation, réessayez");
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
