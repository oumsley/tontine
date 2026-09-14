import { IsEnum, Matches } from "class-validator";
import { ValidationDecision, type ValidateDisbursementDto as ValidateDisbursementShape } from "@bingmoney/shared";

export class ValidateDisbursementDto implements ValidateDisbursementShape {
  @IsEnum(ValidationDecision)
  decision!: ValidationDecision;

  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;
}
