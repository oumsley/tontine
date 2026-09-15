import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  LedgerDirection,
  NotificationType,
  PaymentMethod,
  TransactionType,
  type TransactionSummary,
  type WalletSummary,
} from "@bingmoney/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOrCreateWallet(userId: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { userId } });
  }

  async getSummary(userId: string): Promise<WalletSummary> {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: wallet.balance, currency: wallet.currency };
  }

  async getHistory(userId: string, limit = 20): Promise<TransactionSummary[]> {
    const wallet = await this.getOrCreateWallet(userId);
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      include: { transaction: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return entries.map((entry) => this.toSummary(entry));
  }

  async getTransaction(userId: string, transactionId: string): Promise<TransactionSummary> {
    const wallet = await this.getOrCreateWallet(userId);
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { transactionId_walletId: { transactionId, walletId: wallet.id } },
      include: { transaction: true },
    });
    if (!entry) throw new NotFoundException("Transaction not found");
    return this.toSummary(entry);
  }

  async topUp(userId: string, amount: number, method: PaymentMethod, idempotencyKey: string) {
    // No real Mobile Money / card aggregator is wired up in this environment:
    // the credit is applied synchronously as soon as the request is accepted,
    // standing in for the aggregator's payment-confirmation webhook.
    const wallet = await this.getOrCreateWallet(userId);
    return this.runIdempotentTransaction({
      idempotencyKey,
      type: TransactionType.TOPUP,
      amount,
      initiatorUserId: userId,
      counterpartyLabel: method,
      metadata: { method },
      work: async (tx, transactionId) => {
        await this.postEntry(tx, wallet.id, LedgerDirection.CREDIT, amount, transactionId);
      },
    });
  }

  async transfer(userId: string, toPhoneNumber: string, amount: number, pin: string, idempotencyKey: string) {
    await this.authService.verifyPin(userId, pin);

    const senderWallet = await this.getOrCreateWallet(userId);
    const recipient = await this.prisma.user.findUnique({ where: { phoneNumber: toPhoneNumber } });
    if (!recipient) throw new BadRequestException("Aucun compte BingMoney pour ce numéro");
    if (recipient.id === userId) throw new BadRequestException("Impossible de vous transférer à vous-même");
    const recipientWallet = await this.getOrCreateWallet(recipient.id);

    const result = await this.runIdempotentTransaction({
      idempotencyKey,
      type: TransactionType.TRANSFER,
      amount,
      initiatorUserId: userId,
      counterpartyLabel: toPhoneNumber,
      metadata: { toPhoneNumber },
      work: async (tx, transactionId) => {
        await this.postEntry(tx, senderWallet.id, LedgerDirection.DEBIT, amount, transactionId);
        await this.postEntry(tx, recipientWallet.id, LedgerDirection.CREDIT, amount, transactionId);
      },
    });

    await this.notificationsService.notify({
      userId: recipient.id,
      type: NotificationType.TRANSFER_RECEIVED,
      title: "Transfert reçu",
      body: `Vous avez reçu ${amount} FCFA.`,
      dedupeKey: `TRANSFER_RECEIVED:${result.id}`,
      metadata: { transactionId: result.id },
    });

    return result;
  }

  async withdraw(userId: string, amount: number, method: PaymentMethod, pin: string, idempotencyKey: string) {
    await this.authService.verifyPin(userId, pin);
    const wallet = await this.getOrCreateWallet(userId);

    return this.runIdempotentTransaction({
      idempotencyKey,
      type: TransactionType.WITHDRAWAL,
      amount,
      initiatorUserId: userId,
      counterpartyLabel: method,
      metadata: { method },
      work: async (tx, transactionId) => {
        await this.postEntry(tx, wallet.id, LedgerDirection.DEBIT, amount, transactionId);
      },
    });
  }

  async payMerchant(userId: string, qrCode: string, amount: number, pin: string, idempotencyKey: string) {
    await this.authService.verifyPin(userId, pin);

    const merchant = await this.prisma.merchant.findUnique({ where: { qrCode } });
    if (!merchant) throw new BadRequestException("QR code marchand invalide");

    const payerWallet = await this.getOrCreateWallet(userId);
    if (merchant.walletId === payerWallet.id) {
      throw new BadRequestException("Impossible de vous payer vous-même");
    }

    const result = await this.runIdempotentTransaction({
      idempotencyKey,
      type: TransactionType.PAYMENT,
      amount,
      initiatorUserId: userId,
      counterpartyLabel: merchant.displayName,
      metadata: { merchantId: merchant.id },
      work: async (tx, transactionId) => {
        await this.postEntry(tx, payerWallet.id, LedgerDirection.DEBIT, amount, transactionId);
        await this.postEntry(tx, merchant.walletId, LedgerDirection.CREDIT, amount, transactionId);
      },
    });

    await this.notificationsService.notify({
      userId,
      type: NotificationType.QR_PAYMENT_VALIDATED,
      title: "Paiement QR validé",
      body: `Votre paiement de ${amount} FCFA à ${merchant.displayName} a été validé.`,
      dedupeKey: `QR_PAYMENT_VALIDATED:${result.id}`,
      metadata: { transactionId: result.id },
    });

    return result;
  }

  async buyAirtime(
    userId: string,
    phoneNumber: string,
    provider: string,
    amount: number,
    pin: string,
    idempotencyKey: string,
  ) {
    // Pay-as-you-go stub: no telco aggregator is wired up in this
    // environment, so the debit represents the purchase being accepted.
    await this.authService.verifyPin(userId, pin);
    const wallet = await this.getOrCreateWallet(userId);

    return this.runIdempotentTransaction({
      idempotencyKey,
      type: TransactionType.AIRTIME_PURCHASE,
      amount,
      initiatorUserId: userId,
      counterpartyLabel: provider,
      metadata: { phoneNumber, provider },
      work: async (tx, transactionId) => {
        await this.postEntry(tx, wallet.id, LedgerDirection.DEBIT, amount, transactionId);
      },
    });
  }

  async contributeToTontine(
    userId: string,
    amount: number,
    pin: string,
    idempotencyKey: string,
    counterpartyLabel: string,
    metadata: Record<string, unknown>,
    groupWalletId: string,
  ) {
    await this.authService.verifyPin(userId, pin);
    const wallet = await this.getOrCreateWallet(userId);

    return this.runIdempotentTransaction({
      idempotencyKey,
      type: TransactionType.TONTINE_CONTRIBUTION,
      amount,
      initiatorUserId: userId,
      counterpartyLabel,
      metadata,
      work: async (tx, transactionId) => {
        await this.postEntry(tx, wallet.id, LedgerDirection.DEBIT, amount, transactionId);
        await this.postEntry(tx, groupWalletId, LedgerDirection.CREDIT, amount, transactionId);
      },
    });
  }

  /**
   * Executes a validated disbursement: moves the amount out of the group's
   * pot wallet straight into the beneficiary's personal wallet. Never
   * touches the organizer's wallet (rule 9) — this only runs once a
   * DisbursementRequest has cleared its required validations.
   */
  async disburseTontine(
    groupWalletId: string,
    beneficiaryUserId: string,
    amount: number,
    idempotencyKey: string,
    counterpartyLabel: string,
    metadata: Record<string, unknown>,
  ) {
    const beneficiaryWallet = await this.getOrCreateWallet(beneficiaryUserId);

    return this.runIdempotentTransaction({
      idempotencyKey,
      type: TransactionType.TONTINE_DISBURSEMENT,
      amount,
      initiatorUserId: beneficiaryUserId,
      counterpartyLabel,
      metadata,
      work: async (tx, transactionId) => {
        await this.postEntry(tx, groupWalletId, LedgerDirection.DEBIT, amount, transactionId);
        await this.postEntry(tx, beneficiaryWallet.id, LedgerDirection.CREDIT, amount, transactionId);
      },
    });
  }

  private toSummary(entry: {
    id: string;
    direction: string;
    amount: number;
    createdAt: Date;
    transactionId: string;
    transaction: {
      type: string;
      status: string;
      currency: string;
      counterpartyLabel: string | null;
    };
  }): TransactionSummary {
    return {
      id: entry.transactionId,
      type: entry.transaction.type as TransactionType,
      status: entry.transaction.status as TransactionSummary["status"],
      amount: entry.amount,
      currency: entry.transaction.currency,
      direction: entry.direction as LedgerDirection,
      counterpartyLabel: entry.transaction.counterpartyLabel,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  /**
   * Wraps a multi-wallet ledger mutation in one DB transaction, keyed by a
   * client-supplied idempotency key so a retried request (e.g. after a
   * dropped connection) can never double-apply. The Transaction row's
   * unique idempotencyKey is the source of truth: a concurrent duplicate
   * loses the insert race and is handed back the winner's result instead
   * of throwing.
   */
  private async runIdempotentTransaction(options: {
    idempotencyKey: string;
    type: TransactionType;
    amount: number;
    initiatorUserId: string;
    counterpartyLabel?: string;
    metadata?: Record<string, unknown>;
    work: (tx: Tx, transactionId: string) => Promise<void>;
  }): Promise<TransactionSummary> {
    const existing = await this.findByIdempotencyKey(options.initiatorUserId, options.idempotencyKey);
    if (existing) return existing;

    try {
      const transactionId = await this.prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            type: options.type,
            amount: options.amount,
            initiatorUserId: options.initiatorUserId,
            counterpartyLabel: options.counterpartyLabel,
            metadata: options.metadata as Prisma.InputJsonValue,
            idempotencyKey: options.idempotencyKey,
          },
        });
        await options.work(tx, created.id);
        return created.id;
      });

      // The initiator is always a party to their own transaction's ledger
      // (the wallet being credited or debited), so this always resolves.
      const own = await this.findOwnEntry(options.initiatorUserId, transactionId);
      if (!own) throw new NotFoundException("Transaction not found");
      return own;
    } catch (err) {
      if (isUniqueConstraintViolation(err, "idempotencyKey")) {
        const replay = await this.findByIdempotencyKey(options.initiatorUserId, options.idempotencyKey);
        if (replay) return replay;
      }
      throw err;
    }
  }

  private async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<TransactionSummary | null> {
    const transaction = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
    if (!transaction) return null;
    return this.getTransaction(userId, transaction.id);
  }

  private async findOwnEntry(userId: string, transactionId: string): Promise<TransactionSummary | null> {
    const wallet = await this.getOrCreateWallet(userId);
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { transactionId_walletId: { transactionId, walletId: wallet.id } },
      include: { transaction: true },
    });
    return entry ? this.toSummary(entry) : null;
  }

  /**
   * Locks the wallet row (SELECT ... FOR UPDATE) before mutating its
   * balance so concurrent operations on the same wallet serialize instead
   * of racing on a stale balance read.
   */
  private async postEntry(
    tx: Tx,
    walletId: string,
    direction: LedgerDirection,
    amount: number,
    transactionId: string,
  ): Promise<void> {
    const rows = await tx.$queryRaw<{ id: string; balance: number }[]>(
      Prisma.sql`SELECT id, balance FROM "Wallet" WHERE id = ${walletId} FOR UPDATE`,
    );
    const wallet = rows[0];
    if (!wallet) throw new NotFoundException("Wallet not found");

    const delta = direction === LedgerDirection.CREDIT ? amount : -amount;
    const balanceAfter = wallet.balance + delta;
    if (balanceAfter < 0) {
      throw new BadRequestException("Solde insuffisant");
    }

    await tx.wallet.update({ where: { id: walletId }, data: { balance: balanceAfter } });
    await tx.ledgerEntry.create({
      data: { walletId, transactionId, direction, amount, balanceAfter },
    });
  }
}

function isUniqueConstraintViolation(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    (err.meta?.target as string[] | undefined)?.includes(field) === true
  );
}
