import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { KycModule } from "./kyc/kyc.module";
import { WalletModule } from "./wallet/wallet.module";
import { MerchantsModule } from "./merchants/merchants.module";
import { CatalogModule } from "./catalog/catalog.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    KycModule,
    WalletModule,
    MerchantsModule,
    CatalogModule,
    NotificationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
