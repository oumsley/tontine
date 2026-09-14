-- CreateEnum
CREATE TYPE "TontineVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ValidationDecision" AS ENUM ('APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "TontineGroup" ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TontineProduct" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "visibility" "TontineVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOrganizer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizerActivatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrganizerActivation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termsSnapshot" JSONB NOT NULL,

    CONSTRAINT "OrganizerActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineValidator" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineValidator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "DisbursementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementValidation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "validatorUserId" TEXT NOT NULL,
    "decision" "ValidationDecision" NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisbursementValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerActivation_userId_key" ON "OrganizerActivation"("userId");

-- CreateIndex
CREATE INDEX "TontineValidator_groupId_idx" ON "TontineValidator"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineValidator_groupId_userId_key" ON "TontineValidator"("groupId", "userId");

-- CreateIndex
CREATE INDEX "DisbursementRequest_groupId_idx" ON "DisbursementRequest"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "DisbursementValidation_requestId_validatorUserId_key" ON "DisbursementValidation"("requestId", "validatorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineGroup_walletId_key" ON "TontineGroup"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineGroup_inviteCode_key" ON "TontineGroup"("inviteCode");

-- AddForeignKey
ALTER TABLE "OrganizerActivation" ADD CONSTRAINT "OrganizerActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineProduct" ADD CONSTRAINT "TontineProduct_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineGroup" ADD CONSTRAINT "TontineGroup_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineValidator" ADD CONSTRAINT "TontineValidator_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TontineGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineValidator" ADD CONSTRAINT "TontineValidator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TontineGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TontineSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementValidation" ADD CONSTRAINT "DisbursementValidation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DisbursementRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementValidation" ADD CONSTRAINT "DisbursementValidation_validatorUserId_fkey" FOREIGN KEY ("validatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

