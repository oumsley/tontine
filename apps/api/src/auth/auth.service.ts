import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomInt, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthTokens } from "@bingmoney/shared";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

const OTP_LENGTH = 6;
const PIN_SALT_ROUNDS = 10;
const OTP_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get otpTtlSeconds(): number {
    return Number(this.config.get("OTP_TTL_SECONDS") ?? 300);
  }

  private get isDev(): boolean {
    return this.config.get("NODE_ENV") !== "production";
  }

  async requestOtp(phoneNumber: string): Promise<{ devOtp?: string }> {
    const user = await this.prisma.user.upsert({
      where: { phoneNumber },
      create: { phoneNumber },
      update: {},
    });

    const code = randomInt(0, 10 ** OTP_LENGTH)
      .toString()
      .padStart(OTP_LENGTH, "0");
    const codeHash = await bcrypt.hash(code, OTP_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + this.otpTtlSeconds * 1000);

    await this.prisma.otpCode.create({
      data: { userId: user.id, codeHash, expiresAt },
    });

    // In production this would dispatch through an SMS gateway instead of
    // returning the code — no aggregator is wired up in this environment.
    return this.isDev ? { devOtp: code } : {};
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      throw new BadRequestException("No OTP was requested for this phone number");
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      throw new BadRequestException("OTP expired or not found, request a new one");
    }

    const matches = await bcrypt.compare(code, otp.codeHash);
    if (!matches) {
      throw new BadRequestException("Invalid OTP code");
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    return this.issueTokens(user.id, user.phoneNumber);
  }

  async setPin(userId: string, pin: string): Promise<void> {
    const pinHash = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { pinHash } });
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pinHash) {
      throw new BadRequestException("No PIN has been set for this account");
    }
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      throw new UnauthorizedException("Incorrect PIN");
    }
    return true;
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await this.prisma.session.findFirst({
      where: {
        userId: payload.sub,
        refreshTokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) {
      throw new UnauthorizedException("Refresh token has been revoked or expired");
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(payload.sub, payload.phoneNumber);
  }

  private async issueTokens(userId: string, phoneNumber: string): Promise<AuthTokens> {
    // A random jti guarantees each refresh token is unique even when issued
    // within the same second, so rotation reliably invalidates the old one.
    const payload: JwtPayload = { sub: userId, phoneNumber, jti: randomUUID() };
    const accessExpiresIn = this.config.get("JWT_ACCESS_EXPIRES_IN") ?? "15m";
    const refreshExpiresIn = this.config.get("JWT_REFRESH_EXPIRES_IN") ?? "30d";

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get("JWT_ACCESS_SECRET"),
      expiresIn: accessExpiresIn,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get("JWT_REFRESH_SECRET"),
      expiresIn: refreshExpiresIn,
    });

    // Refresh tokens are already high-entropy secrets, so a fast
    // cryptographic hash is used for storage instead of bcrypt: bcrypt
    // silently truncates its input at 72 bytes, which would make two JWTs
    // sharing a common prefix (e.g. same header + start of payload) collide.
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + msFromDuration(refreshExpiresIn));
    await this.prisma.session.create({
      data: { userId, refreshTokenHash, expiresAt },
    });

    const decoded = this.jwt.decode(accessToken) as { exp: number; iat: number };
    return {
      accessToken,
      refreshToken,
      expiresIn: decoded.exp - decoded.iat,
    };
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function msFromDuration(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return value * unitMs;
}
