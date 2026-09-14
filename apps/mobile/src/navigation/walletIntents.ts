import type { PaymentMethod } from "@bingmoney/shared";

// Any action gated behind the SecurityAuth PIN screen, wallet moves and
// tontine subscription alike.
export type WalletIntent =
  | { kind: "TRANSFER"; toPhoneNumber: string; amount: number }
  | { kind: "WITHDRAW"; amount: number; method: PaymentMethod }
  | { kind: "PAY"; qrCode: string; amount: number }
  | { kind: "AIRTIME"; phoneNumber: string; provider: string; amount: number }
  | { kind: "SUBSCRIBE"; groupId: string; amount: number }
  | { kind: "PAY_CONTRIBUTION"; contributionId: string; amount: number };
