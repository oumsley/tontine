import { IsBoolean } from "class-validator";
import type { ActivateOrganizerDto as ActivateOrganizerShape } from "@bingmoney/shared";

export class ActivateOrganizerDto implements ActivateOrganizerShape {
  @IsBoolean()
  acceptedResponsibilities!: boolean;
}
