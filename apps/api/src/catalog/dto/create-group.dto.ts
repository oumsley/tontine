import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  startedAt?: string;
}
