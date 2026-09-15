import { Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, TrustDimensionKey, TrustLevel, type TrustDimension, type TrustScoreDetail } from "@bingmoney/shared";
import { PrismaService } from "../prisma/prisma.service";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TENURE_TARGET_DAYS = 180;

@Injectable()
export class TrustService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pure computation — never touches the database beyond reading. */
  async compute(userId: string): Promise<TrustScoreDetail> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Utilisateur introuvable");

    const contributions = await this.prisma.tontineContribution.findMany({
      where: { subscription: { userId } },
      include: { subscription: { include: { group: { include: { product: true } } } } },
    });

    const now = Date.now();
    const dueSoFar = contributions.filter((c) => c.dueDate.getTime() <= now);
    const onTimeCount = dueSoFar.filter((c) => c.paidAt && c.penaltyApplied === 0).length;
    const paidCount = contributions.filter((c) => c.paidAt).length;
    const lateNow = contributions.filter((c) => {
      if (c.paidAt) return false;
      const graceMs = c.subscription.group.product.lateGracePeriodDays * ONE_DAY_MS;
      return now > c.dueDate.getTime() + graceMs;
    }).length;

    const daysSinceCreation = (now - user.createdAt.getTime()) / ONE_DAY_MS;

    const dimensions: TrustDimension[] = [
      {
        key: TrustDimensionKey.PAYMENTS,
        label: "Paiements",
        description: "Part de vos cotisations payées à temps, sans pénalité de retard.",
        maxScore: 30,
        score:
          dueSoFar.length === 0
            ? 30 // No history yet — nothing counts against a new member.
            : Math.round((30 * onTimeCount) / dueSoFar.length),
      },
      {
        key: TrustDimensionKey.TENURE,
        label: "Historique",
        description: "Ancienneté de votre compte BingMoney.",
        maxScore: 15,
        score: Math.min(15, Math.round((15 * daysSinceCreation) / TENURE_TARGET_DAYS)),
      },
      {
        key: TrustDimensionKey.ENGAGEMENT,
        label: "Réputation",
        description: "Nombre de cotisations menées à bien sur la plateforme.",
        maxScore: 20,
        score: Math.min(20, paidCount * 2),
      },
      {
        key: TrustDimensionKey.SECURITY,
        label: "Sécurité",
        description: "Vérification de votre identité (KYC).",
        maxScore: 20,
        score: user.kycStatus === KycStatus.VERIFIED ? 20 : user.kycStatus === KycStatus.PENDING ? 5 : 0,
      },
      {
        key: TrustDimensionKey.CONSISTENCY,
        label: "Constance",
        description: "Absence de cotisations actuellement en retard.",
        maxScore: 15,
        score: Math.max(0, 15 - lateNow * 5),
      },
    ];

    const total = Math.max(0, Math.min(100, dimensions.reduce((sum, d) => sum + d.score, 0)));
    const { level, levelLabel } = this.levelFor(total);

    return { total, level, levelLabel, dimensions };
  }

  /** Computes and persists — call after anything that could move the score. */
  async recompute(userId: string): Promise<TrustScoreDetail> {
    const detail = await this.compute(userId);
    await this.prisma.user.update({ where: { id: userId }, data: { trustScore: detail.total } });
    return detail;
  }

  async recomputeAll(): Promise<{ updated: number }> {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    for (const { id } of users) {
      await this.recompute(id);
    }
    return { updated: users.length };
  }

  private levelFor(total: number): { level: TrustLevel; levelLabel: string } {
    if (total >= 70) return { level: TrustLevel.BON_NIVEAU, levelLabel: "Bon niveau" };
    if (total >= 40) return { level: TrustLevel.NIVEAU_MOYEN, levelLabel: "Niveau moyen" };
    return { level: TrustLevel.A_RENFORCER, levelLabel: "À renforcer" };
  }
}
