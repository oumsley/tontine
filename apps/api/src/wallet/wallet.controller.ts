import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { TransactionSummary, WalletSummary } from "@bingmoney/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { WalletService } from "./wallet.service";
import { TopUpDto } from "./dto/top-up.dto";
import { TransferDto } from "./dto/transfer.dto";
import { WithdrawDto } from "./dto/withdraw.dto";
import { PayMerchantDto } from "./dto/pay-merchant.dto";
import { AirtimePurchaseDto } from "./dto/airtime-purchase.dto";

@UseGuards(JwtAuthGuard)
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getSummary(@CurrentUser() user: JwtPayload): Promise<WalletSummary> {
    return this.walletService.getSummary(user.sub);
  }

  @Get("transactions")
  getHistory(@CurrentUser() user: JwtPayload, @Query("limit") limit?: string): Promise<TransactionSummary[]> {
    return this.walletService.getHistory(user.sub, limit ? Number(limit) : undefined);
  }

  @Get("transactions/:id")
  getTransaction(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<TransactionSummary> {
    return this.walletService.getTransaction(user.sub, id);
  }

  @Post("topup")
  topUp(@CurrentUser() user: JwtPayload, @Body() dto: TopUpDto): Promise<TransactionSummary> {
    return this.walletService.topUp(user.sub, dto.amount, dto.method, dto.idempotencyKey);
  }

  @Post("transfer")
  transfer(@CurrentUser() user: JwtPayload, @Body() dto: TransferDto): Promise<TransactionSummary> {
    return this.walletService.transfer(user.sub, dto.toPhoneNumber, dto.amount, dto.pin, dto.idempotencyKey);
  }

  @Post("withdraw")
  withdraw(@CurrentUser() user: JwtPayload, @Body() dto: WithdrawDto): Promise<TransactionSummary> {
    return this.walletService.withdraw(user.sub, dto.amount, dto.method, dto.pin, dto.idempotencyKey);
  }

  @Post("pay")
  pay(@CurrentUser() user: JwtPayload, @Body() dto: PayMerchantDto): Promise<TransactionSummary> {
    return this.walletService.payMerchant(user.sub, dto.qrCode, dto.amount, dto.pin, dto.idempotencyKey);
  }

  @Post("airtime")
  buyAirtime(@CurrentUser() user: JwtPayload, @Body() dto: AirtimePurchaseDto): Promise<TransactionSummary> {
    return this.walletService.buyAirtime(
      user.sub,
      dto.phoneNumber,
      dto.provider,
      dto.amount,
      dto.pin,
      dto.idempotencyKey,
    );
  }
}
