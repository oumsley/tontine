import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_BASE64_LENGTH = 8 * 1024 * 1024; // ~6MB decoded

@Injectable()
export class KycStorageService {
  constructor(private readonly config: ConfigService) {}

  private get uploadDir(): string {
    return this.config.get("KYC_UPLOAD_DIR") ?? "./uploads/kyc";
  }

  async saveDocument(userId: string, kind: "id" | "selfie", base64: string): Promise<string> {
    const raw = base64.includes(",") ? base64.split(",").pop()! : base64;
    if (raw.length === 0 || raw.length > MAX_BASE64_LENGTH) {
      throw new BadRequestException(`${kind} document payload is empty or too large`);
    }

    const buffer = Buffer.from(raw, "base64");
    const dir = join(this.uploadDir, userId);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${Date.now()}-${randomUUID()}-${kind}.jpg`);
    await writeFile(filePath, buffer);
    return filePath;
  }
}
