import { apiRequest } from "./client";

export const merchantsApi = {
  lookup: (qrCode: string) =>
    apiRequest<{ displayName: string }>(`/merchants/lookup?qrCode=${encodeURIComponent(qrCode)}`, {
      authenticated: true,
    }),
};
