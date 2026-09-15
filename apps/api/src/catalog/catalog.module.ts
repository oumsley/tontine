import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TrustModule } from "../trust/trust.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [WalletModule, NotificationsModule, TrustModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
