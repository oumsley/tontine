import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { ContributionLine, ProductDetail, ProductSummary, SubscriptionDetail, SubscriptionSummary } from "@bingmoney/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AdminGuard } from "../common/guards/admin.guard";
import { CatalogService } from "./catalog.service";
import { SubscribeDto } from "./dto/subscribe.dto";
import { PayContributionDto } from "./dto/pay-contribution.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { CreateGroupDto } from "./dto/create-group.dto";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @UseGuards(JwtAuthGuard)
  @Get("products")
  listProducts(
    @Query("theme") theme?: string,
    @Query("minAmount") minAmount?: string,
    @Query("maxAmount") maxAmount?: string,
    @Query("hasAvailableSlots") hasAvailableSlots?: string,
  ): Promise<ProductSummary[]> {
    return this.catalogService.listProducts({
      theme,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      hasAvailableSlots: hasAvailableSlots === "true",
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("products/:id")
  getProduct(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<ProductDetail> {
    return this.catalogService.getProductDetail(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("subscribe")
  subscribe(@CurrentUser() user: JwtPayload, @Body() dto: SubscribeDto) {
    return this.catalogService.subscribe(user.sub, dto.groupId, dto.pin, dto.idempotencyKey);
  }

  @UseGuards(JwtAuthGuard)
  @Get("subscriptions")
  listMySubscriptions(@CurrentUser() user: JwtPayload): Promise<SubscriptionSummary[]> {
    return this.catalogService.listMySubscriptions(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("subscriptions/:id")
  getSubscription(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<SubscriptionDetail> {
    return this.catalogService.getSubscriptionDetail(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("contributions/:id/pay")
  payContribution(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: PayContributionDto,
  ): Promise<ContributionLine> {
    return this.catalogService.payContribution(user.sub, id, dto.pin, dto.idempotencyKey);
  }

  @UseGuards(AdminGuard)
  @Post("products")
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @UseGuards(AdminGuard)
  @Post("products/:id/groups")
  createGroup(@Param("id") id: string, @Body() dto: CreateGroupDto) {
    return this.catalogService.createGroup(id, dto);
  }
}
