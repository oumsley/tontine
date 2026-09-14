import { Matches } from "class-validator";
import type { VerifyPinDto as VerifyPinShape } from "@bingmoney/shared";

export class VerifyPinDto implements VerifyPinShape {
  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;
}
