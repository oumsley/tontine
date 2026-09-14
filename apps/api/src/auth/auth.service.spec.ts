import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const config: Record<string, string> = {
  OTP_TTL_SECONDS: "300",
  NODE_ENV: "test",
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "30d",
};

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: Record<string, jest.Mock>;
    otpCode: Record<string, jest.Mock>;
    session: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      user: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      otpCode: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      session: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        JwtService,
        { provide: ConfigService, useValue: { get: (key: string) => config[key] } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe("requestOtp", () => {
    it("creates the user if needed and returns the OTP in non-production", async () => {
      prisma.user.upsert.mockResolvedValue({ id: "user-1", phoneNumber: "+221770000000" });
      prisma.otpCode.create.mockResolvedValue({});

      const result = await service.requestOtp("+221770000000");

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { phoneNumber: "+221770000000" },
        create: { phoneNumber: "+221770000000" },
        update: {},
      });
      expect(prisma.otpCode.create).toHaveBeenCalled();
      expect(result.devOtp).toMatch(/^\d{6}$/);
    });
  });

  describe("verifyOtp", () => {
    it("rejects when no OTP was ever requested for the phone number", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyOtp("+221770000000", "123456")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("rejects an incorrect code", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", phoneNumber: "+221770000000" });
      prisma.otpCode.findFirst.mockResolvedValue({
        id: "otp-1",
        codeHash: await bcryptHash("999999"),
      });

      await expect(service.verifyOtp("+221770000000", "123456")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("issues tokens and consumes the OTP on a correct code", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", phoneNumber: "+221770000000" });
      prisma.otpCode.findFirst.mockResolvedValue({
        id: "otp-1",
        codeHash: await bcryptHash("123456"),
      });
      prisma.otpCode.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({});

      const tokens = await service.verifyOtp("+221770000000", "123456");

      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: "otp-1" },
        data: { consumedAt: expect.any(Date) },
      });
      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));
      expect(prisma.session.create).toHaveBeenCalled();
    });
  });

  describe("pin", () => {
    it("sets a hashed pin", async () => {
      prisma.user.update.mockResolvedValue({});
      await service.setPin("user-1", "1234");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { pinHash: expect.any(String) },
      });
    });

    it("rejects verification when no pin has been set", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", pinHash: null });
      await expect(service.verifyPin("user-1", "1234")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("rejects an incorrect pin", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", pinHash: await bcryptHash("1234") });
      await expect(service.verifyPin("user-1", "9999")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("accepts the correct pin", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", pinHash: await bcryptHash("1234") });
      await expect(service.verifyPin("user-1", "1234")).resolves.toBe(true);
    });
  });
});

async function bcryptHash(value: string): Promise<string> {
  const bcrypt = await import("bcrypt");
  return bcrypt.hash(value, 4);
}
