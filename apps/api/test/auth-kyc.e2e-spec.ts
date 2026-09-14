import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth + KYC (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const phoneNumber = "+221770001122";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.session.deleteMany({});
    await prisma.kycDocument.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.user.deleteMany({ where: { phoneNumber } });
    await app.close();
  });

  it("registers via OTP, sets a PIN, submits KYC and gets reviewed", async () => {
    const requestOtpRes = await request(app.getHttpServer())
      .post("/auth/otp/request")
      .send({ phoneNumber })
      .expect(200);

    const otp = requestOtpRes.body.devOtp;
    expect(otp).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ phoneNumber, code: "000000" })
      .expect(400);

    const verifyRes = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ phoneNumber, code: otp })
      .expect(200);

    const { accessToken, refreshToken } = verifyRes.body;
    expect(accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post("/auth/pin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ pin: "4242" })
      .expect(204);

    await request(app.getHttpServer())
      .post("/auth/pin/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ pin: "0000" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/auth/pin/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ pin: "4242" })
      .expect(200)
      .expect((res: request.Response) => expect(res.body.valid).toBe(true));

    const refreshRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));

    // The rotated refresh token can no longer be reused.
    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(401);

    const tinyBase64 =
      "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

    await request(app.getHttpServer())
      .post("/kyc/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fullName: "Aïcha Diallo",
        idDocumentBase64: tinyBase64,
        selfieBase64: tinyBase64,
      })
      .expect(201);

    const statusRes = await request(app.getHttpServer())
      .get("/kyc/status")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(statusRes.body.status).toBe("PENDING");

    const decoded = decodeJwt(accessToken);

    await request(app.getHttpServer())
      .post(`/kyc/${decoded.sub}/review`)
      .set("x-admin-key", "dev-admin-key")
      .send({ status: "VERIFIED" })
      .expect(201);

    const finalStatusRes = await request(app.getHttpServer())
      .get("/kyc/status")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(finalStatusRes.body.status).toBe("VERIFIED");
  });

  it("rejects the admin review endpoint without the shared secret", async () => {
    await request(app.getHttpServer())
      .post("/kyc/some-user-id/review")
      .send({ status: "VERIFIED" })
      .expect(401);
  });
});

function decodeJwt(token: string): { sub: string } {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}
