import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { KycStatusResponse } from "@bingmoney/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AdminGuard } from "../common/guards/admin.guard";
import { KycService } from "./kyc.service";
import { SubmitKycDto } from "./dto/submit-kyc.dto";
import { ReviewKycDto } from "./dto/review-kyc.dto";

@Controller("kyc")
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Post("submit")
  submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitKycDto): Promise<KycStatusResponse> {
    return this.kycService.submit(user.sub, dto.fullName, dto.idDocumentBase64, dto.selfieBase64);
  }

  @UseGuards(JwtAuthGuard)
  @Get("status")
  getStatus(@CurrentUser() user: JwtPayload): Promise<KycStatusResponse> {
    return this.kycService.getStatus(user.sub);
  }

  @UseGuards(AdminGuard)
  @Post(":userId/review")
  review(@Param("userId") userId: string, @Body() dto: ReviewKycDto): Promise<KycStatusResponse> {
    return this.kycService.review(userId, dto.status, dto.rejectionReason);
  }
}
