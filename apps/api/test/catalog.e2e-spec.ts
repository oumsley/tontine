import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Catalog (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const phones = {
    a: "+221772220001",
    b: "+221772220002",
    c: "+221772220003",
    unverified: "+221772220004",
  };
  const users: Record<string, { accessToken: string; id: string }> = {};
  let productId: string;
  let groupId: string;

  async function registerUser(phoneNumber: string, pin: string, verifyKyc: boolean) {
    const otpRes = await request(app.getHttpServer()).post("/auth/otp/request").send({ phoneNumber });
    const verifyRes = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ phoneNumber, code: otpRes.body.devOtp })
      .expect(200);
    const accessToken: string = verifyRes.body.accessToken;
    await request(app.getHttpServer())
      .post("/auth/pin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ pin })
      .expect(204);
    const id = decodeJwt(accessToken).sub;

    if (verifyKyc) {
      const tinyBase64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAP/2wBDAQP/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
      await request(app.getHttpServer())
        .post("/kyc/submit")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ fullName: "Test User", idDocumentBase64: tinyBase64, selfieBase64: tinyBase64 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/kyc/${id}/review`)
        .set("x-admin-key", "dev-admin-key")
        .send({ status: "VERIFIED" })
        .expect(201);
    }

    return { accessToken, id };
  }

  async function fundWallet(accessToken: string, amount: number) {
    await request(app.getHttpServer())
      .post("/wallet/topup")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount, method: "MOBILE_MONEY", idempotencyKey: randomUUID() })
      .expect(201);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    users.a = await registerUser(phones.a, "1111", true);
    users.b = await registerUser(phones.b, "2222", true);
    users.c = await registerUser(phones.c, "3333", true);
    users.unverified = await registerUser(phones.unverified, "4444", false);

    await fundWallet(users.a.accessToken, 20000);
    await fundWallet(users.b.accessToken, 20000);
    await fundWallet(users.c.accessToken, 20000);

    const productRes = await request(app.getHttpServer())
      .post("/catalog/products")
      .set("x-admin-key", "dev-admin-key")
      .send({
        name: "Tontine Test",
        kind: "PROJET",
        theme: "Test",
        description: "Produit de test e2e",
        contributionAmount: 5000,
        frequency: "MONTHLY",
        totalSlots: 2,
        minTrustScore: 50,
        lateGracePeriodDays: 7,
        latePenaltyRateBps: 200,
      })
      .expect(201);
    productId = productRes.body.id;

    const groupRes = await request(app.getHttpServer())
      .post(`/catalog/products/${productId}/groups`)
      .set("x-admin-key", "dev-admin-key")
      .send({ label: "Groupe Test" })
      .expect(201);
    groupId = groupRes.body.id;
  });

  afterAll(async () => {
    await prisma.tontineContribution.deleteMany({});
    await prisma.termsAcceptance.deleteMany({});
    await prisma.tontineSubscription.deleteMany({});
    await prisma.tontineGroup.deleteMany({});
    await prisma.tontineProduct.deleteMany({});
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.otpCode.deleteMany({});
    const ids = Object.values(users).map((u) => u.id);
    await prisma.kycDocument.deleteMany({ where: { userId: { in: ids } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it("lists the product in the catalog and shows eligibility for a verified user", async () => {
    const listRes = await request(app.getHttpServer())
      .get("/catalog/products")
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    expect(listRes.body.some((p: { id: string }) => p.id === productId)).toBe(true);

    const detailRes = await request(app.getHttpServer())
      .get(`/catalog/products/${productId}`)
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    expect(detailRes.body.eligibility).toEqual({ eligible: true, reasons: [] });
    expect(detailRes.body.joinableGroupId).toBe(groupId);
  });

  it("blocks subscription for a user whose identity is not verified", async () => {
    const detailRes = await request(app.getHttpServer())
      .get(`/catalog/products/${productId}`)
      .set("Authorization", `Bearer ${users.unverified.accessToken}`)
      .expect(200);
    expect(detailRes.body.eligibility.eligible).toBe(false);
    expect(detailRes.body.eligibility.reasons).toContain("Identité non vérifiée");

    await request(app.getHttpServer())
      .post("/catalog/subscribe")
      .set("Authorization", `Bearer ${users.unverified.accessToken}`)
      .send({ groupId, pin: "4444", idempotencyKey: randomUUID() })
      .expect(400);
  });

  it("subscribes user A with an explicit, timestamped terms acceptance and takes the first contribution", async () => {
    const res = await request(app.getHttpServer())
      .post("/catalog/subscribe")
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .send({ groupId, pin: "1111", idempotencyKey: randomUUID() })
      .expect(201);

    expect(res.body.turnNumber).toBe(1);
    expect(res.body.firstContributionPaid).toBe(true);

    const subscription = await prisma.tontineSubscription.findFirst({ where: { userId: users.a.id, groupId } });
    expect(subscription).not.toBeNull();
    const acceptance = await prisma.termsAcceptance.findUnique({
      where: { subscriptionId: subscription!.id },
    });
    expect(acceptance).not.toBeNull();
    expect(acceptance!.acceptedAt).toBeInstanceOf(Date);
    expect((acceptance!.termsSnapshot as { contributionAmount: number }).contributionAmount).toBe(5000);

    const walletRes = await request(app.getHttpServer())
      .get("/wallet")
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    expect(walletRes.body.balance).toBe(15000); // 20000 - 5000 first contribution
  });

  it("fills the group's last slot with user B, then rejects a third subscriber", async () => {
    const res = await request(app.getHttpServer())
      .post("/catalog/subscribe")
      .set("Authorization", `Bearer ${users.b.accessToken}`)
      .send({ groupId, pin: "2222", idempotencyKey: randomUUID() })
      .expect(201);
    expect(res.body.turnNumber).toBe(2);

    await request(app.getHttpServer())
      .post("/catalog/subscribe")
      .set("Authorization", `Bearer ${users.c.accessToken}`)
      .send({ groupId, pin: "3333", idempotencyKey: randomUUID() })
      .expect(400);
  });

  it("tracks the full contribution cycle: schedule, running status, then paying the remaining cycle", async () => {
    const subsRes = await request(app.getHttpServer())
      .get("/catalog/subscriptions")
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    const mySub = subsRes.body[0];
    expect(mySub.totalSlots).toBe(2);
    expect(mySub.currentCycle).toBe(1);
    expect(mySub.memberStatus).toBe("UPCOMING"); // cycle 1 paid, cycle 2 not yet due

    const detailRes = await request(app.getHttpServer())
      .get(`/catalog/subscriptions/${mySub.subscriptionId}`)
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    expect(detailRes.body.contributions).toHaveLength(2);
    expect(detailRes.body.contributions[0].status).toBe("PAID");
    expect(detailRes.body.contributions[1].status).toBe("UPCOMING");
    expect(detailRes.body.members).toHaveLength(2);
    expect(detailRes.body.members.find((m: { isYou: boolean }) => m.isYou).turnNumber).toBe(1);

    const secondContributionId = detailRes.body.contributions[1].id;
    const payRes = await request(app.getHttpServer())
      .post(`/catalog/contributions/${secondContributionId}/pay`)
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .send({ pin: "1111", idempotencyKey: randomUUID() })
      .expect(201);
    expect(payRes.body.status).toBe("PAID");

    const finalSubsRes = await request(app.getHttpServer())
      .get("/catalog/subscriptions")
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    expect(finalSubsRes.body[0].memberStatus).toBe("PAID");

    const walletRes = await request(app.getHttpServer())
      .get("/wallet")
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    expect(walletRes.body.balance).toBe(10000); // 20000 - 5000 - 5000

    const historyRes = await request(app.getHttpServer())
      .get("/wallet/transactions")
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .expect(200);
    expect(
      historyRes.body.filter((t: { type: string }) => t.type === "TONTINE_CONTRIBUTION"),
    ).toHaveLength(2);

    // Paying an already-paid contribution is rejected, not double-charged.
    await request(app.getHttpServer())
      .post(`/catalog/contributions/${secondContributionId}/pay`)
      .set("Authorization", `Bearer ${users.a.accessToken}`)
      .send({ pin: "1111", idempotencyKey: randomUUID() })
      .expect(400);
  });
});

function decodeJwt(token: string): { sub: string } {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}
