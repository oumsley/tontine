import { IsEnum, IsInt, IsPositive, IsString, MinLength } from "class-validator";
import { PaymentMethod, type TopUpDto as TopUpShape } from "@bingmoney/shared";

export class TopUpDto implements TopUpShape {
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
