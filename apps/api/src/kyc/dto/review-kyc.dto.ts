import { IsEnum, IsNotEmpty, IsString, ValidateIf } from "class-validator";
import { KycStatus } from "@bingmoney/shared";

export class ReviewKycDto {
  @IsEnum([KycStatus.VERIFIED, KycStatus.REJECTED])
  status!: KycStatus.VERIFIED | KycStatus.REJECTED;

  @ValidateIf((dto) => dto.status === KycStatus.REJECTED)
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string;
}
