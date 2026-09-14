-- CreateEnum
CREATE TYPE "TontineKind" AS ENUM ('CLASSIQUE', 'PROJET');

-- CreateEnum
CREATE TYPE "ContributionFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TontineGroupStatus" AS ENUM ('OPEN', 'FULL', 'COMPLETED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'TONTINE_CONTRIBUTION';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TontineProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TontineKind" NOT NULL,
    "theme" TEXT,
    "description" TEXT NOT NULL,
    "contributionAmount" INTEGER NOT NULL,
    "frequency" "ContributionFrequency" NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "minTrustScore" INTEGER NOT NULL DEFAULT 0,
    "lateGracePeriodDays" INTEGER NOT NULL,
    "latePenaltyRateBps" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "TontineGroupStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineSubscription" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsAcceptance" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termsSnapshot" JSONB NOT NULL,

    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineContribution" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,

    CONSTRAINT "TontineContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TontineSubscription_userId_idx" ON "TontineSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineSubscription_groupId_userId_key" ON "TontineSubscription"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineSubscription_groupId_turnNumber_key" ON "TontineSubscription"("groupId", "turnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TermsAcceptance_subscriptionId_key" ON "TermsAcceptance"("subscriptionId");

-- CreateIndex
CREATE INDEX "TontineContribution_subscriptionId_idx" ON "TontineContribution"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineContribution_subscriptionId_cycleNumber_key" ON "TontineContribution"("subscriptionId", "cycleNumber");

-- AddForeignKey
ALTER TABLE "TontineGroup" ADD CONSTRAINT "TontineGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TontineProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineSubscription" ADD CONSTRAINT "TontineSubscription_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TontineGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineSubscription" ADD CONSTRAINT "TontineSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TontineSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineContribution" ADD CONSTRAINT "TontineContribution_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TontineSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
