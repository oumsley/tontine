import type {
  CatalogFilters,
  ContributionLine,
  ProductDetail,
  ProductSummary,
  SubscriptionDetail,
  SubscriptionSummary,
} from "@bingmoney/shared";
import { apiRequest } from "./client";

function toQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.theme) params.set("theme", filters.theme);
  if (filters.minAmount) params.set("minAmount", String(filters.minAmount));
  if (filters.maxAmount) params.set("maxAmount", String(filters.maxAmount));
  if (filters.hasAvailableSlots) params.set("hasAvailableSlots", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const catalogApi = {
  listProducts: (filters: CatalogFilters = {}) =>
    apiRequest<ProductSummary[]>(`/catalog/products${toQuery(filters)}`, { authenticated: true }),

  getProduct: (id: string) =>
    apiRequest<ProductDetail>(`/catalog/products/${id}`, { authenticated: true }),

  subscribe: (groupId: string, pin: string, idempotencyKey: string) =>
    apiRequest<SubscriptionSummary & { firstContributionPaid: boolean }>("/catalog/subscribe", {
      method: "POST",
      body: { groupId, pin, idempotencyKey },
      authenticated: true,
    }),

  listMySubscriptions: () =>
    apiRequest<SubscriptionSummary[]>("/catalog/subscriptions", { authenticated: true }),

  getSubscription: (id: string) =>
    apiRequest<SubscriptionDetail>(`/catalog/subscriptions/${id}`, { authenticated: true }),

  payContribution: (contributionId: string, pin: string, idempotencyKey: string) =>
    apiRequest<ContributionLine>(`/catalog/contributions/${contributionId}/pay`, {
      method: "POST",
      body: { pin, idempotencyKey },
      authenticated: true,
    }),
};
