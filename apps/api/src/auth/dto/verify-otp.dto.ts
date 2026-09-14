import { IsPhoneNumber, Matches } from "class-validator";
import type { VerifyOtpDto as VerifyOtpShape } from "@bingmoney/shared";

export class VerifyOtpDto implements VerifyOtpShape {
  @IsPhoneNumber()
  phoneNumber!: string;

  @Matches(/^\d{6}$/, { message: "code must be a 6-digit number" })
  code!: string;
}
