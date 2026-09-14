import type { PaymentMethod } from "@bingmoney/shared";

export type WalletIntent =
  | { kind: "TRANSFER"; toPhoneNumber: string; amount: number }
  | { kind: "WITHDRAW"; amount: number; method: PaymentMethod }
  | { kind: "PAY"; qrCode: string; amount: number }
  | { kind: "AIRTIME"; phoneNumber: string; provider: string; amount: number };
