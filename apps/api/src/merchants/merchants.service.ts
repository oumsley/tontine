import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(displayName: string, qrCode: string) {
    const wallet = await this.prisma.wallet.create({ data: { isMerchant: true } });
    return this.prisma.merchant.create({
      data: { displayName, qrCode, walletId: wallet.id },
    });
  }

  async findByQrCode(qrCode: string): Promise<{ displayName: string }> {
    const merchant = await this.prisma.merchant.findUnique({ where: { qrCode } });
    if (!merchant) throw new NotFoundException("QR code marchand invalide");
    return { displayName: merchant.displayName };
  }
}
