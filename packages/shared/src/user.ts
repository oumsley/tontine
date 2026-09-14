export enum KycStatus {
  UNVERIFIED = "UNVERIFIED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export interface UserSummary {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  kycStatus: KycStatus;
  trustScore: number;
  isOrganizer: boolean;
  createdAt: string;
}
