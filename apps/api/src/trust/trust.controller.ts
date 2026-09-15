import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { TrustScoreDetail } from "@bingmoney/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AdminGuard } from "../common/guards/admin.guard";
import { TrustService } from "./trust.service";

@Controller("trust")
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  // Recomputed on every read: cheap at this scale, and keeps the score
  // reflecting live behavior (tenure especially) without needing the
  // viewer to have just triggered a payment or KYC review.
  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMine(@CurrentUser() user: JwtPayload): Promise<TrustScoreDetail> {
    return this.trustService.recompute(user.sub);
  }

  // Stands in for a periodic job that would otherwise be the only way
  // tenure-driven scores stay fresh for users who never trigger a
  // recompute themselves.
  @UseGuards(AdminGuard)
  @Post("recompute-all")
  recomputeAll(): Promise<{ updated: number }> {
    return this.trustService.recomputeAll();
  }
}
