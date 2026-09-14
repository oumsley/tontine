import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsEnum, IsInt, IsPositive, IsString, Min, MinLength } from "class-validator";
import { ContributionFrequency, TontineKind, TontineVisibility, type CreateTontineDto as CreateTontineShape } from "@bingmoney/shared";

export class CreateTontineDto implements CreateTontineShape {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(TontineKind)
  kind!: TontineKind;

  @IsString()
  @MinLength(2)
  description!: string;

  @IsInt()
  @IsPositive()
  contributionAmount!: number;

  @IsEnum(ContributionFrequency)
  frequency!: ContributionFrequency;

  @IsInt()
  @IsPositive()
  totalSlots!: number;

  @IsInt()
  @Min(0)
  lateGracePeriodDays!: number;

  @IsInt()
  @Min(0)
  latePenaltyRateBps!: number;

  @IsEnum(TontineVisibility)
  visibility!: TontineVisibility;

  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsString({ each: true })
  validatorPhoneNumbers!: [string, string, string];
}
