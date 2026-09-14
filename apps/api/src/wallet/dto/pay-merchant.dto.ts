import { IsInt, IsNotEmpty, IsPositive, IsString, Matches, MinLength } from "class-validator";
import type { PayMerchantDto as PayMerchantShape } from "@bingmoney/shared";

export class PayMerchantDto implements PayMerchantShape {
  @IsString()
  @IsNotEmpty()
  qrCode!: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
