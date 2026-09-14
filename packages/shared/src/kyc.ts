import { KycStatus } from "./user";

export interface SubmitKycDto {
  fullName: string;
  idDocumentBase64: string;
  selfieBase64: string;
}

export interface KycStatusResponse {
  status: KycStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}
