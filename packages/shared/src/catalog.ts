export enum TontineKind {
  ARGENT = "ARGENT",
  BIENS = "BIENS",
  PROJET = "PROJET",
}

export enum ContributionFrequency {
  WEEKLY = "WEEKLY",
  BIWEEKLY = "BIWEEKLY",
  MONTHLY = "MONTHLY",
}

export enum ContributionStatus {
  PAID = "PAID",
  UPCOMING = "UPCOMING",
  LATE = "LATE",
}

export interface ProductSummary {
  id: string;
  name: string;
  kind: TontineKind;
  theme: string | null;
  contributionAmount: number;
  frequency: ContributionFrequency;
  totalSlots: number;
  availableSlots: number;
  minTrustScore: number;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  lateGracePeriodDays: number;
  latePenaltyRateBps: number;
  joinableGroupId: string | null;
  eligibility: {
    eligible: boolean;
    reasons: string[];
  };
  // "Ce que je reçois" / "quand" — Cahier V4 §6.3.
  expectedReceiveAmount: number;
  receptionTiming: string;
  exitPolicy: string | null;
  replacementPolicy: string | null;
  feesNote: string | null;
}

export interface CatalogFilters {
  theme?: string;
  minAmount?: number;
  maxAmount?: number;
  hasAvailableSlots?: boolean;
}

export interface SubscribeDto {
  groupId: string;
  pin: string;
  idempotencyKey: string;
}

export interface SubscriptionSummary {
  subscriptionId: string;
  groupId: string;
  productName: string;
  description: string;
  theme: string | null;
  groupLabel: string;
  turnNumber: number;
  totalSlots: number;
  currentCycle: number;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  memberStatus: ContributionStatus;
  membersUpToDate: number;
  membersLate: number;
}

export interface ContributionLine {
  id: string;
  cycleNumber: number;
  dueDate: string;
  amount: number;
  // Live-computed while unpaid (0 before the grace deadline passes),
  // frozen to what was actually charged once paidAt is set.
  penaltyAmount: number;
  totalDue: number;
  paidAt: string | null;
  status: ContributionStatus;
}

export interface MemberStatusLine {
  turnNumber: number;
  isYou: boolean;
  status: ContributionStatus;
}

export interface SubscriptionDetail extends SubscriptionSummary {
  contributions: ContributionLine[];
  members: MemberStatusLine[];
}

export interface PayContributionDto {
  pin: string;
  idempotencyKey: string;
}

// Back-office only: BingMoney pilots every disbursement per the offer's
// calendar, there is no client-side validation step (Cahier V4, règle 16).
export interface DisburseCycleDto {
  cycleNumber: number;
}

export interface DisbursementSummary {
  transactionId: string;
  beneficiaryUserId: string;
  cycleNumber: number;
  amount: number;
}
