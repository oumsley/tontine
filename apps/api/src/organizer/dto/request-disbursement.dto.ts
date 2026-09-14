import { IsInt, IsPositive } from "class-validator";
import type { RequestDisbursementDto as RequestDisbursementShape } from "@bingmoney/shared";

export class RequestDisbursementDto implements RequestDisbursementShape {
  @IsInt()
  @IsPositive()
  cycleNumber!: number;
}
