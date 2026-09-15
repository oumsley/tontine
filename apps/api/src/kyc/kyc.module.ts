import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { TrustModule } from "../trust/trust.module";
import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";
import { KycStorageService } from "./storage/kyc-storage.service";

@Module({
  imports: [NotificationsModule, TrustModule],
  controllers: [KycController],
  providers: [KycService, KycStorageService],
})
export class KycModule {}
