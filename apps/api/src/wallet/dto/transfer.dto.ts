import { IsInt, IsPhoneNumber, IsPositive, IsString, Matches, MinLength } from "class-validator";
import type { TransferDto as TransferShape } from "@bingmoney/shared";

export class TransferDto implements TransferShape {
  @IsPhoneNumber()
  toPhoneNumber!: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
