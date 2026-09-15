import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Trust Score (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const phoneNumber = "+221775550001";
  let user: { accessToken: string; id: string };

  function decodeJwt(token: string): { sub: string } {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  }

  function authed(userToken: string) {
    return {
      get: (path: string) => request(app.getHttpServer()).get(path).set("Authorization", `Bearer ${userToken}`),
      post: (path: string, body?: object) =>
        request(app.getHttpServer()).post(path).set("Authorization", `Bearer ${userToken}`).send(body ?? {}),
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const otpRes = await request(app.getHttpServer()).post("/auth/otp/request").send({ phoneNumber });
    const verifyRes = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ phoneNumber, code: otpRes.body.devOtp })
      .expect(200);
    const accessToken: string = verifyRes.body.accessToken;
    await request(app.getHttpServer()).post("/auth/pin").set("Authorization", `Bearer ${accessToken}`).send({ pin: "1111" }).expect(204);
    user = { accessToken, id: decodeJwt(accessToken).sub };
  });

  afterAll(async () => {
    await prisma.tontineContribution.deleteMany({});
    await prisma.termsAcceptance.deleteMany({});
    await prisma.tontineSubscription.deleteMany({});
    await prisma.tontineGroup.deleteMany({});
    await prisma.tontineProduct.deleteMany({});
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.kycDocument.deleteMany({ where: { userId: user.id } });
    await prisma.wallet.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await app.close();
  });

  it("scores an unverified, brand-new user without holding a lack of history against them", async () => {
    const res = await authed(user.accessToken).get("/trust/me").expect(200);
    const byKey = Object.fromEntries(res.body.dimensions.map((d: { key: string; score: number }) => [d.key, d.score]));

    expect(byKey.PAYMENTS).toBe(30);
    expect(byKey.SECURITY).toBe(0);
    expect(byKey.CONSISTENCY).toBe(15);
    expect(res.body.total).toBe(res.body.dimensions.reduce((s: number, d: { score: number }) => s + d.score, 0));
  });

  it("raises the Sécurité dimension the moment KYC is verified, and persists the new total", async () => {
    const tinyBase64 =
      "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAP/2wBDAQP/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
    await authed(user.accessToken)
      .post("/kyc/submit", { fullName: "Trust Test", idDocumentBase64: tinyBase64, selfieBase64: tinyBase64 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/kyc/${user.id}/review`)
      .set("x-admin-key", "dev-admin-key")
      .send({ status: "VERIFIED" })
      .expect(201);

    const trust = await authed(user.accessToken).get("/trust/me").expect(200);
    const byKey = Object.fromEntries(trust.body.dimensions.map((d: { key: string; score: number }) => [d.key, d.score]));
    expect(byKey.SECURITY).toBe(20);

    const me = await authed(user.accessToken).get("/auth/me").expect(200);
    expect(me.body.trustScore).toBe(trust.body.total);
  });

  it("reflects an on-time contribution in Paiements and Réputation after paying it", async () => {
    await request(app.getHttpServer())
      .post("/wallet/topup")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ amount: 20000, method: "MOBILE_MONEY", idempotencyKey: randomUUID() })
      .expect(201);

    const product = await request(app.getHttpServer())
      .post("/catalog/products")
      .set("x-admin-key", "dev-admin-key")
      .send({
        name: "Tontine Trust Test",
        kind: "ARGENT",
        theme: "Argent",
        description: "Test trust score",
        contributionAmount: 5000,
        frequency: "MONTHLY",
        totalSlots: 2,
        minTrustScore: 0,
        lateGracePeriodDays: 3,
        latePenaltyRateBps: 200,
      })
      .expect(201)
      .then((r) => r.body);
    const group = await request(app.getHttpServer())
      .post(`/catalog/products/${product.id}/groups`)
      .set("x-admin-key", "dev-admin-key")
      .send({ label: "Groupe Trust Test" })
      .expect(201)
      .then((r) => r.body);

    const subscribeRes = await authed(user.accessToken)
      .post("/catalog/subscribe", { groupId: group.id, pin: "1111", idempotencyKey: randomUUID() })
      .expect(201);
    expect(subscribeRes.body.firstContributionPaid).toBe(true);

    const trust = await authed(user.accessToken).get("/trust/me").expect(200);
    const byKey = Object.fromEntries(trust.body.dimensions.map((d: { key: string; score: number }) => [d.key, d.score]));
    expect(byKey.PAYMENTS).toBe(30); // the one due-so-far contribution was paid on time
    expect(byKey.ENGAGEMENT).toBe(2); // 1 paid contribution * 2
  });

  it("requires admin credentials for the recompute-all endpoint", async () => {
    await authed(user.accessToken).post("/trust/recompute-all").expect(401);

    const res = await request(app.getHttpServer())
      .post("/trust/recompute-all")
      .set("x-admin-key", "dev-admin-key")
      .expect(201);
    expect(res.body.updated).toBeGreaterThan(0);
  });
});
