-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ADHESION_CONFIRMED', 'DUE_SOON', 'DUE_TODAY', 'LATE', 'TURN_APPROACHING', 'DISBURSEMENT_RECEIVED', 'GOODS_READY', 'TRANSFER_RECEIVED', 'QR_PAYMENT_VALIDATED', 'KYC_ACTION_REQUIRED');

-- AlterTable
ALTER TABLE "TontineContribution" ADD COLUMN     "penaltyApplied" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

