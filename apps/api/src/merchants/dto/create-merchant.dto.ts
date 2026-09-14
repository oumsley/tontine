import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateMerchantDto {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  qrCode!: string;
}
