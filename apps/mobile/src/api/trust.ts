import type { TrustScoreDetail } from "@bingmoney/shared";
import { apiRequest } from "./client";

export const trustApi = {
  getMine: () => apiRequest<TrustScoreDetail>("/trust/me", { authenticated: true }),
};
