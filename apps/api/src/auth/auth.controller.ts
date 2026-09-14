import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { AuthTokens } from "@bingmoney/shared";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { SetPinDto } from "./dto/set-pin.dto";
import { VerifyPinDto } from "./dto/verify-pin.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/request")
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto): Promise<{ devOtp?: string }> {
    return this.authService.requestOtp(dto.phoneNumber);
  }

  @Post("otp/verify")
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthTokens> {
    return this.authService.verifyOtp(dto.phoneNumber, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post("pin")
  @HttpCode(204)
  async setPin(@CurrentUser() user: JwtPayload, @Body() dto: SetPinDto): Promise<void> {
    await this.authService.setPin(user.sub, dto.pin);
  }

  @UseGuards(JwtAuthGuard)
  @Post("pin/verify")
  @HttpCode(200)
  async verifyPin(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyPinDto,
  ): Promise<{ valid: boolean }> {
    const valid = await this.authService.verifyPin(user.sub, dto.pin);
    return { valid };
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshTokens(dto.refreshToken);
  }
}
