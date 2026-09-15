import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { KycStatus, TrustLevel } from "@bingmoney/shared";
import { TrustService } from "./trust.service";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;

function contribution(overrides: {
  dueDate: Date;
  paidAt?: Date | null;
  penaltyApplied?: number;
  lateGracePeriodDays?: number;
}) {
  return {
    dueDate: overrides.dueDate,
    paidAt: overrides.paidAt ?? null,
    penaltyApplied: overrides.penaltyApplied ?? 0,
    subscription: { group: { product: { lateGracePeriodDays: overrides.lateGracePeriodDays ?? 3 } } },
  };
}

describe("TrustService", () => {
  let service: TrustService;
  let prisma: {
    user: Record<string, jest.Mock>;
    tontineContribution: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      tontineContribution: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [TrustService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(TrustService);
  });

  it("throws when the user does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.compute("ghost")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("gives a brand-new unverified user a middling, explainable score with no payment history held against them", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", kycStatus: KycStatus.UNVERIFIED, createdAt: new Date() });
    prisma.tontineContribution.findMany.mockResolvedValue([]);

    const detail = await service.compute("u1");

    const byKey = Object.fromEntries(detail.dimensions.map((d) => [d.key, d.score]));
    expect(byKey.PAYMENTS).toBe(30); // no history yet — nothing counts against them
    expect(byKey.TENURE).toBe(0);
    expect(byKey.ENGAGEMENT).toBe(0);
    expect(byKey.SECURITY).toBe(0); // not verified
    expect(byKey.CONSISTENCY).toBe(15); // nothing currently late
    expect(detail.total).toBe(45);
    expect(detail.level).toBe(TrustLevel.NIVEAU_MOYEN);
  });

  it("rewards a long-tenured, verified, consistently on-time payer with a good score", async () => {
    const createdAt = new Date(Date.now() - 200 * DAY_MS);
    prisma.user.findUnique.mockResolvedValue({ id: "u2", kycStatus: KycStatus.VERIFIED, createdAt });
    const paidPast = Array.from({ length: 5 }, (_, i) =>
      contribution({ dueDate: new Date(Date.now() - (i + 1) * DAY_MS), paidAt: new Date(), penaltyApplied: 0 }),
    );
    prisma.tontineContribution.findMany.mockResolvedValue(paidPast);

    const detail = await service.compute("u2");
    const byKey = Object.fromEntries(detail.dimensions.map((d) => [d.key, d.score]));

    expect(byKey.PAYMENTS).toBe(30); // 5/5 on time
    expect(byKey.TENURE).toBe(15); // capped at the 180-day target
    expect(byKey.ENGAGEMENT).toBe(10); // 5 paid * 2
    expect(byKey.SECURITY).toBe(20);
    expect(byKey.CONSISTENCY).toBe(15);
    expect(detail.total).toBe(90);
    expect(detail.level).toBe(TrustLevel.BON_NIVEAU);
  });

  it("penalizes a currently-late contribution on both Paiements and Constance", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u3", kycStatus: KycStatus.VERIFIED, createdAt: new Date() });
    // Due 10 days ago with only a 2-day grace period — well past grace, still unpaid.
    prisma.tontineContribution.findMany.mockResolvedValue([
      contribution({ dueDate: new Date(Date.now() - 10 * DAY_MS), paidAt: null, lateGracePeriodDays: 2 }),
    ]);

    const detail = await service.compute("u3");
    const byKey = Object.fromEntries(detail.dimensions.map((d) => [d.key, d.score]));

    expect(byKey.PAYMENTS).toBe(0); // 0 of 1 due contributions paid on time
    expect(byKey.CONSISTENCY).toBe(10); // 15 - 5 for the one currently-late contribution
  });

  it("does not count a contribution still within its grace period as late", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u4", kycStatus: KycStatus.VERIFIED, createdAt: new Date() });
    // Due yesterday with a 3-day grace period — overdue but not yet "late".
    prisma.tontineContribution.findMany.mockResolvedValue([
      contribution({ dueDate: new Date(Date.now() - 1 * DAY_MS), paidAt: null, lateGracePeriodDays: 3 }),
    ]);

    const detail = await service.compute("u4");
    const byKey = Object.fromEntries(detail.dimensions.map((d) => [d.key, d.score]));

    expect(byKey.CONSISTENCY).toBe(15); // still within grace, not counted as late
  });

  it("never lets the total exceed 100 or drop below 0", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u5",
      kycStatus: KycStatus.VERIFIED,
      createdAt: new Date(Date.now() - 365 * DAY_MS),
    });
    const manyPaid = Array.from({ length: 50 }, (_, i) =>
      contribution({ dueDate: new Date(Date.now() - (i + 1) * DAY_MS), paidAt: new Date(), penaltyApplied: 0 }),
    );
    prisma.tontineContribution.findMany.mockResolvedValue(manyPaid);

    const detail = await service.compute("u5");
    expect(detail.total).toBeLessThanOrEqual(100);
    expect(detail.total).toBeGreaterThanOrEqual(0);
  });

  it("recompute persists the freshly computed total on the user", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u6", kycStatus: KycStatus.VERIFIED, createdAt: new Date() });
    prisma.tontineContribution.findMany.mockResolvedValue([]);
    prisma.user.update.mockResolvedValue({});

    const detail = await service.recompute("u6");

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "u6" }, data: { trustScore: detail.total } });
  });
});
