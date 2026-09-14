import type { KycStatusResponse } from "@bingmoney/shared";
import { apiRequest } from "./client";

export const kycApi = {
  submit: (fullName: string, idDocumentBase64: string, selfieBase64: string) =>
    apiRequest<KycStatusResponse>("/kyc/submit", {
      method: "POST",
      body: { fullName, idDocumentBase64, selfieBase64 },
      authenticated: true,
    }),

  getStatus: () => apiRequest<KycStatusResponse>("/kyc/status", { authenticated: true }),
};
