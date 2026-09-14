import { IsInt, IsNotEmpty, IsPhoneNumber, IsPositive, IsString, Matches, MinLength } from "class-validator";
import type { AirtimePurchaseDto as AirtimePurchaseShape } from "@bingmoney/shared";

export class AirtimePurchaseDto implements AirtimePurchaseShape {
  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
