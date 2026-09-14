import { IsEnum, IsInt, IsPositive, IsString, Matches, MinLength } from "class-validator";
import { PaymentMethod, type WithdrawDto as WithdrawShape } from "@bingmoney/shared";

export class WithdrawDto implements WithdrawShape {
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
