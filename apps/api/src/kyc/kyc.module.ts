import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";
import { KycStorageService } from "./storage/kyc-storage.service";

@Module({
  imports: [NotificationsModule],
  controllers: [KycController],
  providers: [KycService, KycStorageService],
})
export class KycModule {}
