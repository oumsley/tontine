import { IsPhoneNumber } from "class-validator";
import type { RequestOtpDto as RequestOtpShape } from "@bingmoney/shared";

export class RequestOtpDto implements RequestOtpShape {
  @IsPhoneNumber()
  phoneNumber!: string;
}
