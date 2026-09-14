import type { PaymentMethod, TransactionSummary, WalletSummary } from "@bingmoney/shared";
import { apiRequest } from "./client";

export const walletApi = {
  getSummary: () => apiRequest<WalletSummary>("/wallet", { authenticated: true }),

  getHistory: () => apiRequest<TransactionSummary[]>("/wallet/transactions", { authenticated: true }),

  getTransaction: (id: string) =>
    apiRequest<TransactionSummary>(`/wallet/transactions/${id}`, { authenticated: true }),

  topUp: (amount: number, method: PaymentMethod, idempotencyKey: string) =>
    apiRequest<TransactionSummary>("/wallet/topup", {
      method: "POST",
      body: { amount, method, idempotencyKey },
      authenticated: true,
    }),

  transfer: (toPhoneNumber: string, amount: number, pin: string, idempotencyKey: string) =>
    apiRequest<TransactionSummary>("/wallet/transfer", {
      method: "POST",
      body: { toPhoneNumber, amount, pin, idempotencyKey },
      authenticated: true,
    }),

  withdraw: (amount: number, method: PaymentMethod, pin: string, idempotencyKey: string) =>
    apiRequest<TransactionSummary>("/wallet/withdraw", {
      method: "POST",
      body: { amount, method, pin, idempotencyKey },
      authenticated: true,
    }),

  payMerchant: (qrCode: string, amount: number, pin: string, idempotencyKey: string) =>
    apiRequest<TransactionSummary>("/wallet/pay", {
      method: "POST",
      body: { qrCode, amount, pin, idempotencyKey },
      authenticated: true,
    }),

  buyAirtime: (phoneNumber: string, provider: string, amount: number, pin: string, idempotencyKey: string) =>
    apiRequest<TransactionSummary>("/wallet/airtime", {
      method: "POST",
      body: { phoneNumber, provider, amount, pin, idempotencyKey },
      authenticated: true,
    }),
};
