import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Min, MinLength } from "class-validator";
import { ContributionFrequency, TontineKind } from "@bingmoney/shared";

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(TontineKind)
  kind!: TontineKind;

  @IsOptional()
  @IsString()
  theme?: string;

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
  minTrustScore!: number;

  @IsInt()
  @Min(0)
  lateGracePeriodDays!: number;

  @IsInt()
  @Min(0)
  latePenaltyRateBps!: number;

  @IsOptional()
  @IsString()
  exitPolicy?: string;

  @IsOptional()
  @IsString()
  replacementPolicy?: string;

  @IsOptional()
  @IsString()
  feesNote?: string;
}
