import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContributionFrequency,
  ContributionStatus,
  TontineKind,
  type ContributionLine,
  type DisbursementSummary,
  type MemberStatusLine,
  type ProductDetail,
  type ProductSummary,
  type SubscriptionDetail,
  type SubscriptionSummary,
  type TransactionSummary,
} from "@bingmoney/shared";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { addIntervals } from "./frequency.util";
import { CreateProductDto } from "./dto/create-product.dto";
import { CreateGroupDto } from "./dto/create-group.dto";

interface ProductWithGroups {
  id: string;
  name: string;
  kind: string;
  theme: string | null;
  contributionAmount: number;
  frequency: string;
  totalSlots: number;
  minTrustScore: number;
  groups: { id: string; status: string; _count: { subscriptions: number } }[];
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async listProducts(filters: {
    theme?: string;
    minAmount?: number;
    maxAmount?: number;
    hasAvailableSlots?: boolean;
  }): Promise<ProductSummary[]> {
    const products = await this.prisma.tontineProduct.findMany({
      where: {
        isActive: true,
        ...(filters.theme ? { theme: filters.theme } : {}),
        ...(filters.minAmount !== undefined ? { contributionAmount: { gte: filters.minAmount } } : {}),
        ...(filters.maxAmount !== undefined ? { contributionAmount: { lte: filters.maxAmount } } : {}),
      },
      include: { groups: { include: { _count: { select: { subscriptions: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    const summaries = products.map((p) => this.toProductSummary(p));
    return filters.hasAvailableSlots ? summaries.filter((s) => s.availableSlots > 0) : summaries;
  }

  async getProductDetail(userId: string, productId: string): Promise<ProductDetail> {
    const product = await this.prisma.tontineProduct.findUnique({
      where: { id: productId },
      include: {
        groups: {
          include: {
            _count: { select: { subscriptions: true } },
            subscriptions: { where: { userId }, select: { id: true } },
          },
        },
      },
    });
    if (!product || !product.isActive) throw new NotFoundException("Produit introuvable");

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const joinableGroup = product.groups.find(
      (g) => g.status === "OPEN" && g._count.subscriptions < product.totalSlots,
    );
    const alreadySubscribedGroup = product.groups.find((g) => g.subscriptions.length > 0);

    const reasons: string[] = [];
    if (user.kycStatus !== "VERIFIED") reasons.push("Identité non vérifiée");
    if (user.trustScore < product.minTrustScore) {
      reasons.push(`Trust Score minimum requis : ${product.minTrustScore}`);
    }
    if (alreadySubscribedGroup) reasons.push("Vous êtes déjà inscrit à ce groupe");
    if (!alreadySubscribedGroup && !joinableGroup) reasons.push("Aucune place disponible");

    return {
      ...this.toProductSummary(product),
      description: product.description,
      lateGracePeriodDays: product.lateGracePeriodDays,
      latePenaltyRateBps: product.latePenaltyRateBps,
      joinableGroupId: alreadySubscribedGroup ? null : (joinableGroup?.id ?? null),
      eligibility: { eligible: reasons.length === 0, reasons },
    };
  }

  async subscribe(
    userId: string,
    groupId: string,
    pin: string,
    idempotencyKey: string,
  ): Promise<SubscriptionSummary & { firstContributionPaid: boolean }> {
    const group = await this.prisma.tontineGroup.findUnique({
      where: { id: groupId },
      include: { product: true, _count: { select: { subscriptions: true } } },
    });
    if (!group) throw new NotFoundException("Groupe introuvable");

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const existing = await this.prisma.tontineSubscription.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing) {
      // Idempotent replay: subscribing twice with the same request just
      // returns the existing subscription instead of erroring.
      return { ...(await this.buildSubscriptionSummary(existing.id)), firstContributionPaid: true };
    }

    if (user.kycStatus !== "VERIFIED") throw new BadRequestException("Identité non vérifiée");
    if (user.trustScore < group.product.minTrustScore) {
      throw new BadRequestException(`Trust Score minimum requis : ${group.product.minTrustScore}`);
    }
    if (group.status !== "OPEN" || group._count.subscriptions >= group.product.totalSlots) {
      throw new BadRequestException("Aucune place disponible dans ce groupe");
    }

    const termsSnapshot = {
      contributionAmount: group.product.contributionAmount,
      frequency: group.product.frequency,
      totalSlots: group.product.totalSlots,
      lateGracePeriodDays: group.product.lateGracePeriodDays,
      latePenaltyRateBps: group.product.latePenaltyRateBps,
    };

    const subscriptionId = await this.prisma.$transaction(async (tx) => {
      const turnNumber = group._count.subscriptions + 1;
      const subscription = await tx.tontineSubscription.create({
        data: { groupId, userId, turnNumber },
      });
      await tx.termsAcceptance.create({
        data: { subscriptionId: subscription.id, termsSnapshot },
      });
      const contributionsData = Array.from({ length: group.product.totalSlots }, (_, i) => ({
        subscriptionId: subscription.id,
        cycleNumber: i + 1,
        dueDate: addIntervals(group.startedAt, group.product.frequency as ContributionFrequency, i),
        amount: group.product.contributionAmount,
      }));
      await tx.tontineContribution.createMany({ data: contributionsData });

      if (turnNumber >= group.product.totalSlots) {
        await tx.tontineGroup.update({ where: { id: groupId }, data: { status: "FULL" } });
      }

      return subscription.id;
    });

    // The first contribution is charged right after confirmation, but a
    // failure here (e.g. insufficient balance) does not undo the
    // subscription — the acceptance already stands, and the contribution
    // simply remains due like any other, payable from the tracking screen.
    let firstContributionPaid = false;
    const firstContribution = await this.prisma.tontineContribution.findUniqueOrThrow({
      where: { subscriptionId_cycleNumber: { subscriptionId, cycleNumber: 1 } },
    });
    try {
      const txn = await this.walletService.contributeToTontine(
        userId,
        firstContribution.amount,
        pin,
        idempotencyKey,
        `${group.product.name} · ${group.label}`,
        { subscriptionId, cycleNumber: 1 },
        group.walletId,
      );
      await this.markContributionPaid(firstContribution.id, txn);
      firstContributionPaid = true;
    } catch {
      // Left unpaid; surfaced to the caller via firstContributionPaid.
    }

    const summary = await this.buildSubscriptionSummary(subscriptionId);
    return { ...summary, firstContributionPaid };
  }

  async listMySubscriptions(userId: string): Promise<SubscriptionSummary[]> {
    const subscriptions = await this.prisma.tontineSubscription.findMany({
      where: { userId },
      select: { id: true },
      orderBy: { subscribedAt: "desc" },
    });
    return Promise.all(subscriptions.map((s) => this.buildSubscriptionSummary(s.id)));
  }

  async getSubscriptionDetail(userId: string, subscriptionId: string): Promise<SubscriptionDetail> {
    const subscription = await this.prisma.tontineSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        group: {
          include: {
            product: true,
            subscriptions: { include: { contributions: true } },
          },
        },
        contributions: { orderBy: { cycleNumber: "asc" } },
      },
    });
    if (!subscription || subscription.userId !== userId) {
      throw new NotFoundException("Souscription introuvable");
    }

    const summary = await this.buildSubscriptionSummary(subscriptionId);
    const contributions: ContributionLine[] = subscription.contributions.map((c) => ({
      id: c.id,
      cycleNumber: c.cycleNumber,
      dueDate: c.dueDate.toISOString(),
      amount: c.amount,
      paidAt: c.paidAt?.toISOString() ?? null,
      status: this.contributionStatus(c.paidAt, c.dueDate),
    }));

    const members: MemberStatusLine[] = subscription.group.subscriptions
      .sort((a, b) => a.turnNumber - b.turnNumber)
      .map((member) => ({
        turnNumber: member.turnNumber,
        isYou: member.userId === userId,
        status: this.overallMemberStatus(member.contributions),
      }));

    return { ...summary, contributions, members };
  }

  async payContribution(
    userId: string,
    contributionId: string,
    pin: string,
    idempotencyKey: string,
  ): Promise<ContributionLine> {
    const contribution = await this.prisma.tontineContribution.findUnique({
      where: { id: contributionId },
      include: { subscription: { include: { group: { include: { product: true } } } } },
    });
    if (!contribution || contribution.subscription.userId !== userId) {
      throw new NotFoundException("Cotisation introuvable");
    }
    if (contribution.paidAt) {
      throw new BadRequestException("Cette cotisation est déjà payée");
    }

    const { group } = contribution.subscription;
    const txn = await this.walletService.contributeToTontine(
      userId,
      contribution.amount,
      pin,
      idempotencyKey,
      `${group.product.name} · ${group.label}`,
      { subscriptionId: contribution.subscriptionId, cycleNumber: contribution.cycleNumber },
      group.walletId,
    );
    const updated = await this.markContributionPaid(contribution.id, txn);

    return {
      id: updated.id,
      cycleNumber: updated.cycleNumber,
      dueDate: updated.dueDate.toISOString(),
      amount: updated.amount,
      paidAt: updated.paidAt?.toISOString() ?? null,
      status: this.contributionStatus(updated.paidAt, updated.dueDate),
    };
  }

  // --- Back-office (admin-guarded in the controller) ---

  createProduct(dto: CreateProductDto) {
    return this.prisma.tontineProduct.create({ data: dto });
  }

  async createGroup(productId: string, dto: CreateGroupDto) {
    const product = await this.prisma.tontineProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Produit introuvable");
    const wallet = await this.prisma.wallet.create({ data: {} });
    return this.prisma.tontineGroup.create({
      data: {
        productId,
        label: dto.label,
        walletId: wallet.id,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
      },
    });
  }

  // Décaissement piloté par BingMoney (Cahier V4, règle 16) : pas de
  // validation communautaire — l'équipe déclenche le paiement du pot vers
  // le bénéficiaire du cycle depuis le back-office. L'idempotencyKey dérivée
  // du cycle rend l'appel sûr à rejouer sans jamais payer deux fois.
  async disburseCycle(groupId: string, cycleNumber: number): Promise<DisbursementSummary> {
    const group = await this.prisma.tontineGroup.findUnique({
      where: { id: groupId },
      include: { product: true, subscriptions: { include: { contributions: true } } },
    });
    if (!group) throw new NotFoundException("Groupe introuvable");

    const beneficiary = group.subscriptions.find((s) => s.turnNumber === cycleNumber);
    if (!beneficiary) throw new BadRequestException("Aucun bénéficiaire pour ce cycle");

    const amount = group.subscriptions.reduce(
      (sum, sub) =>
        sum + sub.contributions.filter((c) => c.cycleNumber === cycleNumber && c.paidAt).reduce((s, c) => s + c.amount, 0),
      0,
    );
    if (amount <= 0) throw new BadRequestException("Aucune cotisation payée pour ce cycle");

    const txn = await this.walletService.disburseTontine(
      group.walletId,
      beneficiary.userId,
      amount,
      `disbursement-${groupId}-${cycleNumber}`,
      `${group.product.name} · ${group.label}`,
      { groupId, cycleNumber },
    );

    return { transactionId: txn.id, beneficiaryUserId: beneficiary.userId, cycleNumber, amount };
  }

  // --- helpers ---

  private toProductSummary(product: ProductWithGroups): ProductSummary {
    const availableSlots = product.groups
      .filter((g) => g.status === "OPEN")
      .reduce((sum, g) => sum + Math.max(0, product.totalSlots - g._count.subscriptions), 0);

    return {
      id: product.id,
      name: product.name,
      kind: product.kind as TontineKind,
      theme: product.theme,
      contributionAmount: product.contributionAmount,
      frequency: product.frequency as ContributionFrequency,
      totalSlots: product.totalSlots,
      availableSlots,
      minTrustScore: product.minTrustScore,
    };
  }

  private contributionStatus(paidAt: Date | null, dueDate: Date): ContributionStatus {
    if (paidAt) return ContributionStatus.PAID;
    return dueDate.getTime() < Date.now() ? ContributionStatus.LATE : ContributionStatus.UPCOMING;
  }

  private overallMemberStatus(contributions: { paidAt: Date | null; dueDate: Date }[]): ContributionStatus {
    const hasLate = contributions.some((c) => this.contributionStatus(c.paidAt, c.dueDate) === ContributionStatus.LATE);
    if (hasLate) return ContributionStatus.LATE;
    const allPaid = contributions.every((c) => c.paidAt);
    return allPaid ? ContributionStatus.PAID : ContributionStatus.UPCOMING;
  }

  private async markContributionPaid(contributionId: string, txn: TransactionSummary) {
    return this.prisma.tontineContribution.update({
      where: { id: contributionId },
      data: { paidAt: new Date(), transactionId: txn.id },
    });
  }

  private async buildSubscriptionSummary(subscriptionId: string): Promise<SubscriptionSummary> {
    const subscription = await this.prisma.tontineSubscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: {
        group: {
          include: {
            product: true,
            subscriptions: { include: { contributions: true } },
          },
        },
        contributions: { orderBy: { cycleNumber: "asc" } },
      },
    });

    const nextDue = subscription.contributions.find((c) => !c.paidAt);
    const currentCycle = subscription.contributions.filter((c) => c.dueDate.getTime() <= Date.now()).length;

    const memberStatuses = subscription.group.subscriptions.map((m) => this.overallMemberStatus(m.contributions));
    const membersLate = memberStatuses.filter((s) => s === ContributionStatus.LATE).length;

    return {
      subscriptionId: subscription.id,
      groupId: subscription.groupId,
      productName: subscription.group.product.name,
      description: subscription.group.product.description,
      theme: subscription.group.product.theme,
      groupLabel: subscription.group.label,
      turnNumber: subscription.turnNumber,
      totalSlots: subscription.group.product.totalSlots,
      currentCycle: Math.max(1, Math.min(currentCycle, subscription.group.product.totalSlots)),
      nextDueDate: nextDue?.dueDate.toISOString() ?? null,
      nextDueAmount: nextDue?.amount ?? null,
      memberStatus: this.overallMemberStatus(subscription.contributions),
      membersUpToDate: memberStatuses.length - membersLate,
      membersLate,
    };
  }
}
