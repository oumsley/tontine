import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, NotificationType, type KycStatusResponse } from "@bingmoney/shared";
import { PrismaService } from "../prisma/prisma.service";
import { KycStorageService } from "./storage/kyc-storage.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TrustService } from "../trust/trust.service";

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: KycStorageService,
    private readonly notificationsService: NotificationsService,
    private readonly trustService: TrustService,
  ) {}

  async submit(
    userId: string,
    fullName: string,
    idDocumentBase64: string,
    selfieBase64: string,
  ): Promise<KycStatusResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.kycStatus === KycStatus.VERIFIED) {
      throw new BadRequestException("Identity is already verified");
    }

    const idDocumentPath = await this.storage.saveDocument(userId, "id", idDocumentBase64);
    const selfiePath = await this.storage.saveDocument(userId, "selfie", selfieBase64);

    const document = await this.prisma.kycDocument.create({
      data: { userId, idDocumentPath, selfiePath, status: KycStatus.PENDING },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { fullName, kycStatus: KycStatus.PENDING },
    });

    return {
      status: document.status as KycStatus,
      submittedAt: document.submittedAt.toISOString(),
      reviewedAt: null,
      rejectionReason: null,
    };
  }

  async getStatus(userId: string): Promise<KycStatusResponse> {
    const document = await this.prisma.kycDocument.findFirst({
      where: { userId },
      orderBy: { submittedAt: "desc" },
    });

    if (!document) {
      return {
        status: KycStatus.UNVERIFIED,
        submittedAt: null,
        reviewedAt: null,
        rejectionReason: null,
      };
    }

    return {
      status: document.status as KycStatus,
      submittedAt: document.submittedAt.toISOString(),
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      rejectionReason: document.rejectionReason,
    };
  }

  async review(
    userId: string,
    status: KycStatus.VERIFIED | KycStatus.REJECTED,
    rejectionReason?: string,
  ): Promise<KycStatusResponse> {
    const document = await this.prisma.kycDocument.findFirst({
      where: { userId, status: KycStatus.PENDING },
      orderBy: { submittedAt: "desc" },
    });
    if (!document) {
      throw new NotFoundException("No pending KYC submission for this user");
    }

    const reviewedAt = new Date();
    await this.prisma.kycDocument.update({
      where: { id: document.id },
      data: { status, reviewedAt, rejectionReason: rejectionReason ?? null },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { kycStatus: status } });
    // Recomputed after the status change so the Sécurité dimension reflects it.
    await this.trustService.recompute(userId);

    if (status === KycStatus.REJECTED) {
      await this.notificationsService.notify({
        userId,
        type: NotificationType.KYC_ACTION_REQUIRED,
        title: "Vérification à finaliser",
        body: "Une action est requise pour finaliser votre vérification d'identité.",
        dedupeKey: `KYC_ACTION_REQUIRED:${document.id}`,
        metadata: { kycDocumentId: document.id },
      });
    }

    return {
      status,
      submittedAt: document.submittedAt.toISOString(),
      reviewedAt: reviewedAt.toISOString(),
      rejectionReason: rejectionReason ?? null,
    };
  }
}
