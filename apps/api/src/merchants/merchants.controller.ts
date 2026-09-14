import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MerchantsService } from "./merchants.service";
import { CreateMerchantDto } from "./dto/create-merchant.dto";

@Controller("merchants")
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(dto.displayName, dto.qrCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get("lookup")
  lookup(@Query("qrCode") qrCode: string) {
    return this.merchantsService.findByQrCode(qrCode);
  }
}
