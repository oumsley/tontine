import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { randomUUID } from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Organizer (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const phones = {
    organizer: "+221773330001",
    v2: "+221773330002",
    v3: "+221773330003",
    member: "+221773330004",
    unverified: "+221773330005",
  };
  const users: Record<string, { accessToken: string; id: string }> = {};

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
        .send({ fullName: `Test ${phoneNumber}`, idDocumentBase64: tinyBase64, selfieBase64: tinyBase64 })
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

    users.organizer = await registerUser(phones.organizer, "1111", true);
    users.v2 = await registerUser(phones.v2, "2222", true);
    users.v3 = await registerUser(phones.v3, "3333", true);
    users.member = await registerUser(phones.member, "4444", true);
    users.unverified = await registerUser(phones.unverified, "5555", false);

    await fundWallet(users.organizer.accessToken, 50000);
    await fundWallet(users.v2.accessToken, 50000);
    await fundWallet(users.v3.accessToken, 50000);
    await fundWallet(users.member.accessToken, 50000);
  });

  afterAll(async () => {
    await prisma.disbursementValidation.deleteMany({});
    await prisma.disbursementRequest.deleteMany({});
    await prisma.tontineValidator.deleteMany({});
    await prisma.tontineContribution.deleteMany({});
    await prisma.termsAcceptance.deleteMany({});
    await prisma.tontineSubscription.deleteMany({});
    await prisma.tontineGroup.deleteMany({});
    await prisma.tontineProduct.deleteMany({});
    await prisma.organizerActivation.deleteMany({});
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

  it("requires KYC verification before activating the organizer role", async () => {
    await request(app.getHttpServer())
      .post("/organizer/activate")
      .set("Authorization", `Bearer ${users.unverified.accessToken}`)
      .send({ acceptedResponsibilities: true })
      .expect(400);
  });

  it("requires explicit acceptance of organizer responsibilities", async () => {
    await request(app.getHttpServer())
      .post("/organizer/activate")
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({ acceptedResponsibilities: false })
      .expect(400);
  });

  it("activates a verified user as organizer", async () => {
    const res = await request(app.getHttpServer())
      .post("/organizer/activate")
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({ acceptedResponsibilities: true })
      .expect(201);
    expect(res.body.isOrganizer).toBe(true);
    expect(res.body.organizerActivatedAt).not.toBeNull();
  });

  it("blocks tontine creation for a user who hasn't activated the organizer role", async () => {
    await request(app.getHttpServer())
      .post("/organizer/tontines")
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .send({
        name: "Tontine sans activation",
        kind: "CLASSIQUE",
        description: "x",
        contributionAmount: 1000,
        frequency: "WEEKLY",
        totalSlots: 2,
        lateGracePeriodDays: 3,
        latePenaltyRateBps: 100,
        visibility: "PRIVATE",
        validatorPhoneNumbers: [phones.organizer, phones.v2, phones.v3],
      })
      .expect(400);
  });

  it("rejects a validator list that isn't exactly 3 known BingMoney numbers", async () => {
    await request(app.getHttpServer())
      .post("/organizer/tontines")
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({
        name: "Tontine validateur manquant",
        kind: "CLASSIQUE",
        description: "x",
        contributionAmount: 1000,
        frequency: "WEEKLY",
        totalSlots: 2,
        lateGracePeriodDays: 3,
        latePenaltyRateBps: 100,
        visibility: "PRIVATE",
        validatorPhoneNumbers: [phones.v2, phones.v3, "+221700000099"],
      })
      .expect(400);
  });

  let groupId: string;
  let inviteCode: string;

  it("lets an activated organizer create a private tontine with 3 designated validators", async () => {
    const res = await request(app.getHttpServer())
      .post("/organizer/tontines")
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({
        name: "Tontine Entre Amis",
        kind: "CLASSIQUE",
        description: "Cagnotte hebdo entre amis",
        contributionAmount: 5000,
        frequency: "WEEKLY",
        totalSlots: 2,
        lateGracePeriodDays: 3,
        latePenaltyRateBps: 200,
        visibility: "PRIVATE",
        validatorPhoneNumbers: [phones.organizer, phones.v2, phones.v3],
      })
      .expect(201);

    expect(res.body.visibility).toBe("PRIVATE");
    expect(res.body.inviteCode).toEqual(expect.any(String));
    groupId = res.body.groupId;
    inviteCode = res.body.inviteCode;
  });

  it("does not expose the private tontine in the public catalog", async () => {
    const listRes = await request(app.getHttpServer())
      .get("/catalog/products")
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .expect(200);
    expect(listRes.body.some((p: { name: string }) => p.name === "Tontine Entre Amis")).toBe(false);
  });

  it("lets the organizer and a member join via the invite code, crediting the group's pot", async () => {
    const orgJoin = await request(app.getHttpServer())
      .post("/catalog/join-by-code")
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({ inviteCode, pin: "1111", idempotencyKey: randomUUID() })
      .expect(201);
    expect(orgJoin.body.turnNumber).toBe(1);
    expect(orgJoin.body.isOrganizerOfGroup).toBe(true);

    const memberJoin = await request(app.getHttpServer())
      .post("/catalog/join-by-code")
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .send({ inviteCode, pin: "4444", idempotencyKey: randomUUID() })
      .expect(201);
    expect(memberJoin.body.turnNumber).toBe(2);
    expect(memberJoin.body.isOrganizerOfGroup).toBe(false);

    const detail = await request(app.getHttpServer())
      .get(`/organizer/tontines/${groupId}`)
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .expect(200);
    expect(detail.body.memberCount).toBe(2);
    expect(detail.body.potBalance).toBe(10000); // both paid their first 5000 contribution
    expect(detail.body.validators).toHaveLength(3);
    expect(detail.body.nextBeneficiaryTurnNumber).toBe(1);
  });

  it("rejects an outsider trying to view another organizer's tontine detail", async () => {
    await request(app.getHttpServer())
      .get(`/organizer/tontines/${groupId}`)
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .expect(404);
  });

  let requestId: string;

  it("lets the organizer request a disbursement for the first beneficiary", async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizer/tontines/${groupId}/disbursements`)
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({ cycleNumber: 1 })
      .expect(201);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.amount).toBe(10000);
    expect(res.body.beneficiaryPhoneNumber).toBe(phones.organizer);
    expect(res.body.requiredValidations).toBe(3);
    requestId = res.body.id;
  });

  it("blocks a non-validator from voting on the disbursement", async () => {
    await request(app.getHttpServer())
      .post(`/organizer/disbursements/${requestId}/validate`)
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .send({ decision: "APPROVED", pin: "4444" })
      .expect(403);
  });

  it("does not execute the payout on a single approval — the organizer alone cannot move pot funds", async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizer/disbursements/${requestId}/validate`)
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({ decision: "APPROVED", pin: "1111" })
      .expect(201);
    expect(res.body.status).toBe("PENDING");

    const walletRes = await request(app.getHttpServer())
      .get("/wallet")
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .expect(200);
    expect(walletRes.body.balance).toBe(45000); // 50000 - 5000 contribution, no payout yet
  });

  it("rejects a validator voting twice on the same request", async () => {
    await request(app.getHttpServer())
      .post(`/organizer/disbursements/${requestId}/validate`)
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({ decision: "APPROVED", pin: "1111" })
      .expect(400);
  });

  it("stays pending after the second approval (2 of 3)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizer/disbursements/${requestId}/validate`)
      .set("Authorization", `Bearer ${users.v2.accessToken}`)
      .send({ decision: "APPROVED", pin: "2222" })
      .expect(201);
    expect(res.body.status).toBe("PENDING");
  });

  it("executes the payout to the beneficiary once all 3 validators approve", async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizer/disbursements/${requestId}/validate`)
      .set("Authorization", `Bearer ${users.v3.accessToken}`)
      .send({ decision: "APPROVED", pin: "3333" })
      .expect(201);
    expect(res.body.status).toBe("COMPLETED");

    const walletRes = await request(app.getHttpServer())
      .get("/wallet")
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .expect(200);
    // 45000 after paying in, +10000 payout (both members' cycle-1 contributions: 5000 + 5000)
    expect(walletRes.body.balance).toBe(55000);

    const detail = await request(app.getHttpServer())
      .get(`/organizer/tontines/${groupId}`)
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .expect(200);
    expect(detail.body.potBalance).toBe(0);
    expect(detail.body.nextBeneficiaryTurnNumber).toBe(2);
  });

  it("rejects a request that any single validator declines", async () => {
    const memberPay = await request(app.getHttpServer())
      .get("/catalog/subscriptions")
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .expect(200);
    const nextContribution = await request(app.getHttpServer())
      .get(`/catalog/subscriptions/${memberPay.body[0].subscriptionId}`)
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .expect(200);
    const secondContribution = nextContribution.body.contributions[1];
    await request(app.getHttpServer())
      .post(`/catalog/contributions/${secondContribution.id}/pay`)
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .send({ pin: "4444", idempotencyKey: randomUUID() })
      .expect(201);

    const reqRes = await request(app.getHttpServer())
      .post(`/organizer/tontines/${groupId}/disbursements`)
      .set("Authorization", `Bearer ${users.organizer.accessToken}`)
      .send({ cycleNumber: 2 })
      .expect(201);
    const secondRequestId = reqRes.body.id;

    const rejectRes = await request(app.getHttpServer())
      .post(`/organizer/disbursements/${secondRequestId}/validate`)
      .set("Authorization", `Bearer ${users.v2.accessToken}`)
      .send({ decision: "REJECTED", pin: "2222" })
      .expect(201);
    expect(rejectRes.body.status).toBe("REJECTED");

    // A rejected request never pays out, even if the remaining validators approve.
    await request(app.getHttpServer())
      .post(`/organizer/disbursements/${secondRequestId}/validate`)
      .set("Authorization", `Bearer ${users.v3.accessToken}`)
      .send({ decision: "APPROVED", pin: "3333" })
      .expect(400);

    const walletRes = await request(app.getHttpServer())
      .get("/wallet")
      .set("Authorization", `Bearer ${users.member.accessToken}`)
      .expect(200);
    expect(walletRes.body.balance).toBe(40000); // two 5000 contributions paid, no payout received
  });
});

function decodeJwt(token: string): { sub: string } {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}
