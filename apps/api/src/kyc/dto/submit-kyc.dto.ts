import { IsNotEmpty, IsString, MinLength } from "class-validator";
import type { SubmitKycDto as SubmitKycShape } from "@bingmoney/shared";

export class SubmitKycDto implements SubmitKycShape {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  idDocumentBase64!: string;

  @IsString()
  @IsNotEmpty()
  selfieBase64!: string;
}
