import type { ContributionFrequency, TontineKind } from "./catalog";

export enum TontineVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

export enum DisbursementStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
}

export enum ValidationDecision {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface ActivateOrganizerDto {
  acceptedResponsibilities: boolean;
}

export interface OrganizerStatus {
  isOrganizer: boolean;
  organizerActivatedAt: string | null;
  kycVerified: boolean;
}

export interface CreateTontineDto {
  name: string;
  kind: TontineKind;
  description: string;
  contributionAmount: number;
  frequency: ContributionFrequency;
  totalSlots: number;
  lateGracePeriodDays: number;
  latePenaltyRateBps: number;
  visibility: TontineVisibility;
  // Exactly 3 phone numbers of the people habilitated to validate
  // disbursements for this group (rule 8) — may include the organizer.
  validatorPhoneNumbers: [string, string, string];
}

export interface OrganizerTontineSummary {
  groupId: string;
  productId: string;
  name: string;
  kind: TontineKind;
  description: string;
  contributionAmount: number;
  frequency: ContributionFrequency;
  totalSlots: number;
  memberCount: number;
  membersUpToDate: number;
  membersLate: number;
  visibility: TontineVisibility;
  inviteCode: string | null;
  potBalance: number;
  status: "OPEN" | "FULL" | "COMPLETED";
}

export interface OrganizerMemberLine {
  turnNumber: number;
  fullName: string | null;
  phoneNumber: string;
  status: "PAID" | "UPCOMING" | "LATE";
}

export interface ValidatorLine {
  userId: string;
  fullName: string | null;
  phoneNumber: string;
}

export interface DisbursementValidationLine {
  validatorUserId: string;
  fullName: string | null;
  decision: ValidationDecision | null;
}

export interface DisbursementRequestSummary {
  id: string;
  groupId: string;
  groupLabel: string;
  productName: string;
  cycleNumber: number;
  amount: number;
  status: DisbursementStatus;
  beneficiaryFullName: string | null;
  beneficiaryPhoneNumber: string;
  requiredValidations: number;
  validations: DisbursementValidationLine[];
  createdAt: string;
}

export interface OrganizerTontineDetail extends OrganizerTontineSummary {
  members: OrganizerMemberLine[];
  validators: ValidatorLine[];
  disbursementRequests: DisbursementRequestSummary[];
  nextBeneficiaryTurnNumber: number | null;
  nextCycleReadyForDisbursement: boolean;
}

export interface RequestDisbursementDto {
  cycleNumber: number;
}

export interface ValidateDisbursementDto {
  decision: ValidationDecision;
  pin: string;
}

export interface JoinByCodeDto {
  inviteCode: string;
  pin: string;
  idempotencyKey: string;
}
