import { IsString, Matches, MinLength } from "class-validator";
import type { PayContributionDto as PayContributionShape } from "@bingmoney/shared";

export class PayContributionDto implements PayContributionShape {
  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
