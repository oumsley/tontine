import type { NotificationSummary, UnreadCount } from "@bingmoney/shared";
import { apiRequest } from "./client";

export const notificationsApi = {
  list: () => apiRequest<NotificationSummary[]>("/notifications", { authenticated: true }),

  unreadCount: () => apiRequest<UnreadCount>("/notifications/unread-count", { authenticated: true }),

  markRead: (id: string) =>
    apiRequest<void>(`/notifications/${id}/read`, { method: "POST", authenticated: true }),

  markAllRead: () => apiRequest<void>("/notifications/read-all", { method: "POST", authenticated: true }),
};
