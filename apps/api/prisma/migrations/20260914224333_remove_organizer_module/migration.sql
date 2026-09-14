-- AlterEnum
BEGIN;
CREATE TYPE "TontineKind_new" AS ENUM ('ARGENT', 'BIENS', 'PROJET');
ALTER TABLE "TontineProduct" ALTER COLUMN "kind" TYPE "TontineKind_new" USING ("kind"::text::"TontineKind_new");
ALTER TYPE "TontineKind" RENAME TO "TontineKind_old";
ALTER TYPE "TontineKind_new" RENAME TO "TontineKind";
DROP TYPE "TontineKind_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "DisbursementRequest" DROP CONSTRAINT "DisbursementRequest_groupId_fkey";

-- DropForeignKey
ALTER TABLE "DisbursementRequest" DROP CONSTRAINT "DisbursementRequest_requestedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "DisbursementRequest" DROP CONSTRAINT "DisbursementRequest_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "DisbursementValidation" DROP CONSTRAINT "DisbursementValidation_requestId_fkey";

-- DropForeignKey
ALTER TABLE "DisbursementValidation" DROP CONSTRAINT "DisbursementValidation_validatorUserId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizerActivation" DROP CONSTRAINT "OrganizerActivation_userId_fkey";

-- DropForeignKey
ALTER TABLE "TontineProduct" DROP CONSTRAINT "TontineProduct_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "TontineValidator" DROP CONSTRAINT "TontineValidator_groupId_fkey";

-- DropForeignKey
ALTER TABLE "TontineValidator" DROP CONSTRAINT "TontineValidator_userId_fkey";

-- DropIndex
DROP INDEX "TontineGroup_inviteCode_key";

-- AlterTable
ALTER TABLE "TontineGroup" DROP COLUMN "inviteCode";

-- AlterTable
ALTER TABLE "TontineProduct" DROP COLUMN "createdByUserId",
DROP COLUMN "visibility";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isOrganizer",
DROP COLUMN "organizerActivatedAt";

-- DropTable
DROP TABLE "DisbursementRequest";

-- DropTable
DROP TABLE "DisbursementValidation";

-- DropTable
DROP TABLE "OrganizerActivation";

-- DropTable
DROP TABLE "TontineValidator";

-- DropEnum
DROP TYPE "DisbursementStatus";

-- DropEnum
DROP TYPE "TontineVisibility";

-- DropEnum
DROP TYPE "ValidationDecision";

