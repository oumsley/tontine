import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotificationType, type NotificationSummary } from "@bingmoney/shared";
import { PrismaService } from "../prisma/prisma.service";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a notification, idempotent on dedupeKey — the same underlying
   * event (or the same day's reminder scan) never produces a duplicate row.
   * Returns whether a new row was actually created.
   */
  async notify(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    dedupeKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body,
          dedupeKey: params.dedupeKey,
          metadata: params.metadata as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (err) {
      if (isUniqueConstraintViolation(err)) return false;
      throw err;
    }
  }

  async list(userId: string, limit = 50): Promise<NotificationSummary[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => this.toSummary(row));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Simulates the daily cron a real deployment would run: scans unpaid
   * contributions for the reminder windows Cahier V4 §15 requires (rappel
   * avant échéance, rappel à échéance, retard) and subscriptions whose next
   * turn is coming up. Dedupe-keyed per calendar day, so a contribution
   * still unpaid tomorrow gets a fresh LATE notification — the "relances
   * graduées" the spec asks for, without a separate escalation model.
   */
  async runReminders(): Promise<{ created: number }> {
    const dateBucket = new Date().toISOString().slice(0, 10);
    let created = 0;

    const contributions = await this.prisma.tontineContribution.findMany({
      where: { paidAt: null },
      include: { subscription: { include: { group: { include: { product: true } } } } },
    });

    for (const c of contributions) {
      const { product } = c.subscription.group;
      const dueTime = c.dueDate.getTime();
      const now = Date.now();
      const graceMs = product.lateGracePeriodDays * ONE_DAY_MS;

      if (now >= dueTime - ONE_DAY_MS && now < dueTime) {
        if (
          await this.notify({
            userId: c.subscription.userId,
            type: NotificationType.DUE_SOON,
            title: "Cotisation à venir",
            body: `Votre cotisation de ${c.amount} FCFA pour ${product.name} est due demain.`,
            dedupeKey: `DUE_SOON:${c.id}:${dateBucket}`,
            metadata: { contributionId: c.id },
          })
        ) {
          created++;
        }
      } else if (now >= dueTime && now < dueTime + ONE_DAY_MS) {
        if (
          await this.notify({
            userId: c.subscription.userId,
            type: NotificationType.DUE_TODAY,
            title: "Cotisation due aujourd'hui",
            body: `Votre cotisation de ${c.amount} FCFA pour ${product.name} est due aujourd'hui.`,
            dedupeKey: `DUE_TODAY:${c.id}:${dateBucket}`,
            metadata: { contributionId: c.id },
          })
        ) {
          created++;
        }
      } else if (now > dueTime + graceMs) {
        if (
          await this.notify({
            userId: c.subscription.userId,
            type: NotificationType.LATE,
            title: "Cotisation en retard",
            body: `Votre cotisation pour ${product.name} est en retard ; régularisez pour rester à jour.`,
            dedupeKey: `LATE:${c.id}:${dateBucket}`,
            metadata: { contributionId: c.id },
          })
        ) {
          created++;
        }
      }
    }

    const subscriptions = await this.prisma.tontineSubscription.findMany({
      include: { contributions: true, group: { include: { product: true } } },
    });
    for (const sub of subscriptions) {
      const currentCycle = sub.contributions.filter((c) => c.dueDate.getTime() <= Date.now()).length;
      if (sub.turnNumber === currentCycle + 1) {
        if (
          await this.notify({
            userId: sub.userId,
            type: NotificationType.TURN_APPROACHING,
            title: "Votre tour approche",
            body: `Votre tour de réception pour ${sub.group.product.name} approche.`,
            dedupeKey: `TURN_APPROACHING:${sub.id}`,
            metadata: { subscriptionId: sub.id },
          })
        ) {
          created++;
        }
      }
    }

    return { created };
  }

  private toSummary(row: {
    id: string;
    type: string;
    title: string;
    body: string;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationSummary {
    return {
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
