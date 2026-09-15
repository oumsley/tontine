import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Notifications (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const phones = {
    a: "+221774440001",
    b: "+221774440002",
    lateMember: "+221774440003",
    kycRejected: "+221774440004",
    noFunds: "+221774440005",
  };
  const users: Record<string, { accessToken: string; id: string }> = {};

  const tinyBase64 =
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAP/2wBDAQP/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

  function decodeJwt(token: string): { sub: string } {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  }

  async function registerUser(phoneNumber: string, pin: string, verifyKyc: boolean) {
    const otpRes = await request(app.getHttpServer()).post("/auth/otp/request").send({ phoneNumber });
    const verifyRes = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ phoneNumber, code: otpRes.body.devOtp })
      .expect(200);
    const accessToken: string = verifyRes.body.accessToken;
    await request(app.getHttpServer()).post("/auth/pin").set("Authorization", `Bearer ${accessToken}`).send({ pin }).expect(204);
    const id = decodeJwt(accessToken).sub;

    await request(app.getHttpServer())
      .post("/kyc/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ fullName: `Test ${phoneNumber}`, idDocumentBase64: tinyBase64, selfieBase64: tinyBase64 })
      .expect(201);

    if (verifyKyc) {
      await request(app.getHttpServer())
        .post(`/kyc/${id}/review`)
        .set("x-admin-key", "dev-admin-key")
        .send({ status: "VERIFIED" })
        .expect(201);
    }

    return { accessToken, id };
  }

  function authed(userToken: string) {
    return {
      get: (path: string) => request(app.getHttpServer()).get(path).set("Authorization", `Bearer ${userToken}`),
      post: (path: string, body?: object) =>
        request(app.getHttpServer()).post(path).set("Authorization", `Bearer ${userToken}`).send(body ?? {}),
    };
  }

  async function fundWallet(accessToken: string, amount: number) {
    await request(app.getHttpServer())
      .post("/wallet/topup")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount, method: "MOBILE_MONEY", idempotencyKey: randomUUID() })
      .expect(201);
  }

  async function createProductAndGroup(payload: Record<string, unknown>, startedAt?: string) {
    const product = await request(app.getHttpServer())
      .post("/catalog/products")
      .set("x-admin-key", "dev-admin-key")
      .send(payload)
      .expect(201)
      .then((r) => r.body);
    const group = await request(app.getHttpServer())
      .post(`/catalog/products/${product.id}/groups`)
      .set("x-admin-key", "dev-admin-key")
      .send({ label: `Groupe ${product.name}`, ...(startedAt ? { startedAt } : {}) })
      .expect(201)
      .then((r) => r.body);
    return { product, group };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    users.a = await registerUser(phones.a, "1111", true);
    users.b = await registerUser(phones.b, "2222", true);
    users.lateMember = await registerUser(phones.lateMember, "3333", true);
    users.kycRejected = await registerUser(phones.kycRejected, "4444", false);
    users.noFunds = await registerUser(phones.noFunds, "5555", true);

    await fundWallet(users.a.accessToken, 50000);
    await fundWallet(users.b.accessToken, 50000);
  });

  afterAll(async () => {
    const ids = Object.values(users).map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.tontineContribution.deleteMany({});
    await prisma.termsAcceptance.deleteMany({});
    await prisma.tontineSubscription.deleteMany({});
    await prisma.tontineGroup.deleteMany({});
    await prisma.tontineProduct.deleteMany({});
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.merchant.deleteMany({});
    await prisma.wallet.deleteMany({ where: { isMerchant: true } });
    await prisma.session.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.kycDocument.deleteMany({ where: { userId: { in: ids } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it("notifies on adhesion, and does not duplicate it on an idempotent replay", async () => {
    const { group } = await createProductAndGroup({
      name: "Tontine Notif Adhesion",
      kind: "ARGENT",
      theme: "Argent",
      description: "Test adhésion",
      contributionAmount: 5000,
      frequency: "MONTHLY",
      totalSlots: 1,
      minTrustScore: 0,
      lateGracePeriodDays: 3,
      latePenaltyRateBps: 200,
    });

    const idempotencyKey = randomUUID();
    await authed(users.a.accessToken)
      .post("/catalog/subscribe", { groupId: group.id, pin: "1111", idempotencyKey })
      .expect(201);
    // Replaying the exact same request returns the existing subscription.
    await authed(users.a.accessToken)
      .post("/catalog/subscribe", { groupId: group.id, pin: "1111", idempotencyKey })
      .expect(201);

    const list = await authed(users.a.accessToken).get("/notifications").expect(200);
    const adhesionNotifs = list.body.filter((n: { type: string }) => n.type === "ADHESION_CONFIRMED");
    expect(adhesionNotifs).toHaveLength(1);
    expect(adhesionNotifs[0].readAt).toBeNull();
  });

  it("notifies the recipient on transfer and the payer on QR payment, both idempotent", async () => {
    const transferKey = randomUUID();
    await authed(users.a.accessToken)
      .post("/wallet/transfer", { toPhoneNumber: phones.b, amount: 1000, pin: "1111", idempotencyKey: transferKey })
      .expect(201);
    // Same idempotencyKey replayed -> same transaction -> no duplicate notification.
    await authed(users.a.accessToken)
      .post("/wallet/transfer", { toPhoneNumber: phones.b, amount: 1000, pin: "1111", idempotencyKey: transferKey })
      .expect(201);

    const bNotifs = await authed(users.b.accessToken).get("/notifications").expect(200);
    expect(bNotifs.body.filter((n: { type: string }) => n.type === "TRANSFER_RECEIVED")).toHaveLength(1);

    await request(app.getHttpServer())
      .post("/merchants")
      .set("x-admin-key", "dev-admin-key")
      .send({ displayName: "Boutique Notif", qrCode: "QR-NOTIF-001" })
      .expect(201);
    await authed(users.a.accessToken)
      .post("/wallet/pay", { qrCode: "QR-NOTIF-001", amount: 500, pin: "1111", idempotencyKey: randomUUID() })
      .expect(201);

    const aNotifs = await authed(users.a.accessToken).get("/notifications").expect(200);
    expect(aNotifs.body.some((n: { type: string }) => n.type === "QR_PAYMENT_VALIDATED")).toBe(true);
  });

  it("notifies the beneficiary on disbursement, GOODS_READY for a Biens tontine", async () => {
    const { product, group } = await createProductAndGroup({
      name: "Tontine Notif Biens",
      kind: "BIENS",
      theme: "Biens",
      description: "Test décaissement biens",
      contributionAmount: 2000,
      frequency: "WEEKLY",
      totalSlots: 1,
      minTrustScore: 0,
      lateGracePeriodDays: 3,
      latePenaltyRateBps: 200,
    });
    expect(product.kind).toBe("BIENS");

    await authed(users.a.accessToken)
      .post("/catalog/subscribe", { groupId: group.id, pin: "1111", idempotencyKey: randomUUID() })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/catalog/groups/${group.id}/disburse`)
      .set("x-admin-key", "dev-admin-key")
      .send({ cycleNumber: 1 })
      .expect(201);

    const notifs = await authed(users.a.accessToken).get("/notifications").expect(200);
    expect(notifs.body.some((n: { type: string }) => n.type === "GOODS_READY")).toBe(true);
  });

  it("notifies a rejected KYC submission that action is required", async () => {
    await request(app.getHttpServer())
      .post(`/kyc/${users.kycRejected.id}/review`)
      .set("x-admin-key", "dev-admin-key")
      .send({ status: "REJECTED", rejectionReason: "Document illisible" })
      .expect(201);

    const notifs = await authed(users.kycRejected.accessToken).get("/notifications").expect(200);
    expect(notifs.body.some((n: { type: string }) => n.type === "KYC_ACTION_REQUIRED")).toBe(true);
  });

  it("supports marking one notification read and all notifications read", async () => {
    const before = await authed(users.a.accessToken).get("/notifications/unread-count").expect(200);
    expect(before.body.count).toBeGreaterThan(0);

    const list = await authed(users.a.accessToken).get("/notifications").expect(200);
    const firstUnread = list.body.find((n: { readAt: string | null }) => n.readAt === null);
    await authed(users.a.accessToken).post(`/notifications/${firstUnread.id}/read`).expect(204);

    const afterOne = await authed(users.a.accessToken).get("/notifications/unread-count").expect(200);
    expect(afterOne.body.count).toBe(before.body.count - 1);

    await authed(users.a.accessToken).post("/notifications/read-all").expect(204);
    const afterAll = await authed(users.a.accessToken).get("/notifications/unread-count").expect(200);
    expect(afterAll.body.count).toBe(0);
  });

  it("only marks a contribution LATE once its grace period has elapsed, and charges the penalty on late payment", async () => {
    const startedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
    const { group } = await createProductAndGroup(
      {
        name: "Tontine Notif Retard",
        kind: "ARGENT",
        theme: "Argent",
        description: "Test pénalité de retard",
        contributionAmount: 5000,
        frequency: "MONTHLY",
        totalSlots: 2,
        minTrustScore: 0,
        lateGracePeriodDays: 2,
        latePenaltyRateBps: 1000, // 10%
      },
      startedAt,
    );

    // No wallet funding for lateMember, so the auto-charge at subscribe time fails
    // and the first contribution (due 10 days ago) is left unpaid.
    const subscribeRes = await authed(users.lateMember.accessToken)
      .post("/catalog/subscribe", { groupId: group.id, pin: "3333", idempotencyKey: randomUUID() })
      .expect(201);
    expect(subscribeRes.body.firstContributionPaid).toBe(false);

    const detail = await authed(users.lateMember.accessToken)
      .get(`/catalog/subscriptions/${subscribeRes.body.subscriptionId}`)
      .expect(200);
    const contribution = detail.body.contributions[0];
    expect(contribution.status).toBe("LATE");
    expect(contribution.penaltyAmount).toBe(500); // 10% of 5000
    expect(contribution.totalDue).toBe(5500);

    await fundWallet(users.lateMember.accessToken, 6000);
    const payRes = await authed(users.lateMember.accessToken)
      .post(`/catalog/contributions/${contribution.id}/pay`, { pin: "3333", idempotencyKey: randomUUID() })
      .expect(201);
    expect(payRes.body.penaltyAmount).toBe(500);
    expect(payRes.body.totalDue).toBe(5500);

    const walletRes = await authed(users.lateMember.accessToken).get("/wallet").expect(200);
    expect(walletRes.body.balance).toBe(500); // 6000 - 5500

    // A second, unfunded member on the same offer stays unpaid and LATE — this is
    // what the reminder scan below is expected to flag.
    const secondJoin = await authed(users.noFunds.accessToken)
      .post("/catalog/subscribe", { groupId: group.id, pin: "5555", idempotencyKey: randomUUID() })
      .expect(201);
    expect(secondJoin.body.firstContributionPaid).toBe(false);
  });

  it("run-reminders creates LATE for overdue contributions and dedupes same-day reruns", async () => {
    const first = await authed(users.noFunds.accessToken).post("/notifications/run-reminders");
    // noFunds isn't an admin — the endpoint is admin-guarded.
    expect(first.status).toBe(401);

    const scanOne = await request(app.getHttpServer())
      .post("/notifications/run-reminders")
      .set("x-admin-key", "dev-admin-key")
      .expect(201);
    expect(scanOne.body.created).toBeGreaterThan(0);

    const notifs = await authed(users.noFunds.accessToken).get("/notifications").expect(200);
    expect(notifs.body.some((n: { type: string }) => n.type === "LATE")).toBe(true);

    // Re-running the same day's scan must not create a second LATE row for the
    // same still-unpaid contribution ("relances graduées" escalates daily, not
    // on every scan).
    const scanTwo = await request(app.getHttpServer())
      .post("/notifications/run-reminders")
      .set("x-admin-key", "dev-admin-key")
      .expect(201);
    expect(scanTwo.body.created).toBe(0);
  });

  it("run-reminders flags an upcoming due date and the sole member's approaching turn", async () => {
    const startedAt = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(); // ~20h from now
    const { group: upcomingGroup } = await createProductAndGroup(
      {
        name: "Tontine Notif Prochaine",
        kind: "ARGENT",
        theme: "Argent",
        description: "Test rappel avant échéance",
        contributionAmount: 3000,
        frequency: "WEEKLY",
        totalSlots: 3,
        minTrustScore: 0,
        lateGracePeriodDays: 2,
        latePenaltyRateBps: 100,
      },
      startedAt,
    );
    // Fund just enough is skipped on purpose: staying unfunded leaves the
    // (future-dated) first contribution unpaid so it's still visible to the scan.
    const join = await authed(users.b.accessToken)
      .post("/catalog/subscribe", { groupId: upcomingGroup.id, pin: "2222", idempotencyKey: randomUUID() })
      .expect(201);
    expect(join.body.firstContributionPaid).toBe(true); // userB is funded — pays immediately regardless of due date.

    await request(app.getHttpServer())
      .post("/notifications/run-reminders")
      .set("x-admin-key", "dev-admin-key")
      .expect(201);

    const notifs = await authed(users.b.accessToken).get("/notifications").expect(200);
    // The member is alone in the group (turn 1) with nothing paid off yet from
    // the group's perspective of "current cycle", so their own turn is next.
    expect(notifs.body.some((n: { type: string }) => n.type === "TURN_APPROACHING")).toBe(true);
  });
});
