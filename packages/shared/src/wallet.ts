export enum TransactionType {
  TOPUP = "TOPUP",
  TRANSFER = "TRANSFER",
  WITHDRAWAL = "WITHDRAWAL",
  PAYMENT = "PAYMENT",
  AIRTIME_PURCHASE = "AIRTIME_PURCHASE",
  TONTINE_CONTRIBUTION = "TONTINE_CONTRIBUTION",
}

export enum TransactionStatus {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum LedgerDirection {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

export enum PaymentMethod {
  MOBILE_MONEY = "MOBILE_MONEY",
  CARD = "CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
}

export interface WalletSummary {
  balance: number;
  currency: string;
}

export interface TransactionSummary {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  direction: LedgerDirection;
  counterpartyLabel: string | null;
  createdAt: string;
}

export interface TopUpDto {
  amount: number;
  method: PaymentMethod;
  idempotencyKey: string;
}

export interface TransferDto {
  toPhoneNumber: string;
  amount: number;
  pin: string;
  idempotencyKey: string;
}

export interface WithdrawDto {
  amount: number;
  method: PaymentMethod;
  pin: string;
  idempotencyKey: string;
}

export interface PayMerchantDto {
  qrCode: string;
  amount: number;
  pin: string;
  idempotencyKey: string;
}

export interface AirtimePurchaseDto {
  phoneNumber: string;
  provider: string;
  amount: number;
  pin: string;
  idempotencyKey: string;
}
