import { IsInt, IsPositive } from "class-validator";

export class DisburseCycleDto {
  @IsInt()
  @IsPositive()
  cycleNumber!: number;
}
