import { IsString, Matches, MinLength } from "class-validator";
import type { JoinByCodeDto as JoinByCodeShape } from "@bingmoney/shared";

export class JoinByCodeDto implements JoinByCodeShape {
  @IsString()
  @MinLength(4)
  inviteCode!: string;

  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
