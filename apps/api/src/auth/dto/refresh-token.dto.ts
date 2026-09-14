import { IsString, MinLength } from "class-validator";
import type { RefreshTokenDto as RefreshTokenShape } from "@bingmoney/shared";

export class RefreshTokenDto implements RefreshTokenShape {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
