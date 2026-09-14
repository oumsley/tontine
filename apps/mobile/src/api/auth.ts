import type { AuthTokens, UserSummary } from "@bingmoney/shared";
import { apiRequest } from "./client";

export const authApi = {
  requestOtp: (phoneNumber: string) =>
    apiRequest<{ devOtp?: string }>("/auth/otp/request", { method: "POST", body: { phoneNumber } }),

  getProfile: () => apiRequest<UserSummary>("/auth/me", { authenticated: true }),

  verifyOtp: (phoneNumber: string, code: string) =>
    apiRequest<AuthTokens>("/auth/otp/verify", { method: "POST", body: { phoneNumber, code } }),

  setPin: (pin: string) =>
    apiRequest<void>("/auth/pin", { method: "POST", body: { pin }, authenticated: true }),

  verifyPin: (pin: string) =>
    apiRequest<{ valid: boolean }>("/auth/pin/verify", {
      method: "POST",
      body: { pin },
      authenticated: true,
    }),
};
