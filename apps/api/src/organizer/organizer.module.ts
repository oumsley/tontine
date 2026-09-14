import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WalletModule } from "../wallet/wallet.module";
import { OrganizerController } from "./organizer.controller";
import { OrganizerService } from "./organizer.service";

@Module({
  imports: [AuthModule, WalletModule],
  controllers: [OrganizerController],
  providers: [OrganizerService],
})
export class OrganizerModule {}
