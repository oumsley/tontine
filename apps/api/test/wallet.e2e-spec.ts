import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Wallet (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const phoneA = "+221771110001";
  const phoneB = "+221771110002";
  let userA: { accessToken: string; id: string };
  let userB: { accessToken: string; id: string };

  async function registerUser(phoneNumber: string, pin: string) {
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
    return { accessToken, id };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    userA = await registerUser(phoneA, "1111");
    userB = await registerUser(phoneB, "2222");
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.merchant.deleteMany({});
    await prisma.wallet.deleteMany({ where: { isMerchant: true } });
    await prisma.session.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.wallet.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.notification.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { phoneNumber: { in: [phoneA, phoneB] } } });
    await app.close();
  });

  function authed(userToken: string) {
    return {
      get: (path: string) =>
        request(app.getHttpServer()).get(path).set("Authorization", `Bearer ${userToken}`),
      post: (path: string, body: object) =>
        request(app.getHttpServer())
          .post(path)
          .set("Authorization", `Bearer ${userToken}`)
          .send(body),
    };
  }

  it("starts every wallet at a zero balance", async () => {
    const res = await authed(userA.accessToken).get("/wallet").expect(200);
    expect(res.body).toEqual({ balance: 0, currency: "XOF" });
  });

  it("credits the wallet on top-up", async () => {
    const res = await authed(userA.accessToken)
      .post("/wallet/topup", { amount: 50000, method: "MOBILE_MONEY", idempotencyKey: randomUUID() })
      .expect(201);
    expect(res.body.amount).toBe(50000);
    expect(res.body.direction).toBe("CREDIT");

    const summary = await authed(userA.accessToken).get("/wallet").expect(200);
    expect(summary.body.balance).toBe(50000);
  });

  it("replays a repeated top-up idempotency key instead of double-crediting", async () => {
    const idempotencyKey = randomUUID();
    const first = await authed(userA.accessToken)
      .post("/wallet/topup", { amount: 1000, method: "CARD", idempotencyKey })
      .expect(201);
    const second = await authed(userA.accessToken)
      .post("/wallet/topup", { amount: 1000, method: "CARD", idempotencyKey })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);

    const summary = await authed(userA.accessToken).get("/wallet").expect(200);
    // 50000 (previous test) + 1000 exactly once, not 2000.
    expect(summary.body.balance).toBe(51000);
  });

  it("transfers wallet-to-wallet, moving funds atomically between both parties", async () => {
    await authed(userA.accessToken)
      .post("/wallet/transfer", {
        toPhoneNumber: phoneB,
        amount: 15000,
        pin: "1111",
        idempotencyKey: randomUUID(),
      })
      .expect(201);

    const [balanceA, balanceB] = await Promise.all([
      authed(userA.accessToken).get("/wallet"),
      authed(userB.accessToken).get("/wallet"),
    ]);
    expect(balanceA.body.balance).toBe(36000);
    expect(balanceB.body.balance).toBe(15000);
  });

  it("rejects a transfer with the wrong PIN and leaves balances untouched", async () => {
    await authed(userA.accessToken)
      .post("/wallet/transfer", {
        toPhoneNumber: phoneB,
        amount: 1000,
        pin: "0000",
        idempotencyKey: randomUUID(),
      })
      .expect(401);

    const balanceA = await authed(userA.accessToken).get("/wallet").expect(200);
    expect(balanceA.body.balance).toBe(36000);
  });

  it("rejects a transfer that would overdraw the sender", async () => {
    await authed(userB.accessToken)
      .post("/wallet/transfer", {
        toPhoneNumber: phoneA,
        amount: 999999,
        pin: "2222",
        idempotencyKey: randomUUID(),
      })
      .expect(400);

    const balanceB = await authed(userB.accessToken).get("/wallet").expect(200);
    expect(balanceB.body.balance).toBe(15000);
  });

  it("pays a merchant via scan-to-pay, crediting the merchant's own wallet", async () => {
    await request(app.getHttpServer())
      .post("/merchants")
      .set("x-admin-key", "dev-admin-key")
      .send({ displayName: "Boutique Kady", qrCode: "QR-KADY-001" })
      .expect(201);

    await authed(userA.accessToken)
      .post("/wallet/pay", {
        qrCode: "QR-KADY-001",
        amount: 2500,
        pin: "1111",
        idempotencyKey: randomUUID(),
      })
      .expect(201);

    const balanceA = await authed(userA.accessToken).get("/wallet").expect(200);
    expect(balanceA.body.balance).toBe(33500);

    const merchant = await prisma.merchant.findUniqueOrThrow({ where: { qrCode: "QR-KADY-001" } });
    const merchantWallet = await prisma.wallet.findUniqueOrThrow({ where: { id: merchant.walletId } });
    expect(merchantWallet.balance).toBe(2500);
  });

  it("debits the wallet for an airtime purchase", async () => {
    await authed(userA.accessToken)
      .post("/wallet/airtime", {
        phoneNumber: phoneA,
        provider: "Orange",
        amount: 1000,
        pin: "1111",
        idempotencyKey: randomUUID(),
      })
      .expect(201);

    const balanceA = await authed(userA.accessToken).get("/wallet").expect(200);
    expect(balanceA.body.balance).toBe(32500);
  });

  it("debits the wallet on withdrawal", async () => {
    await authed(userB.accessToken)
      .post("/wallet/withdraw", {
        amount: 5000,
        method: "MOBILE_MONEY",
        pin: "2222",
        idempotencyKey: randomUUID(),
      })
      .expect(201);

    const balanceB = await authed(userB.accessToken).get("/wallet").expect(200);
    expect(balanceB.body.balance).toBe(10000);
  });

  it("lists a unified transaction history with a fetchable receipt", async () => {
    const history = await authed(userA.accessToken).get("/wallet/transactions").expect(200);
    expect(history.body.length).toBeGreaterThan(0);

    const first = history.body[0];
    const receipt = await authed(userA.accessToken).get(`/wallet/transactions/${first.id}`).expect(200);
    expect(receipt.body.id).toBe(first.id);
  });
});

function decodeJwt(token: string): { sub: string } {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}
