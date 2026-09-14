import { IsString, Matches, MinLength } from "class-validator";
import type { SubscribeDto as SubscribeShape } from "@bingmoney/shared";

export class SubscribeDto implements SubscribeShape {
  @IsString()
  groupId!: string;

  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
