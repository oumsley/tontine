import { Matches } from "class-validator";
import type { SetPinDto as SetPinShape } from "@bingmoney/shared";

export class SetPinDto implements SetPinShape {
  @Matches(/^\d{4,6}$/, { message: "pin must be 4 to 6 digits" })
  pin!: string;
}
