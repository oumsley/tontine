import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [WalletModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
