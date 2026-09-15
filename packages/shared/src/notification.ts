// Cahier des charges V4 §18 (event catalog) + §15 (rappels/relances/pénalités).
export enum NotificationType {
  ADHESION_CONFIRMED = "ADHESION_CONFIRMED",
  DUE_SOON = "DUE_SOON",
  DUE_TODAY = "DUE_TODAY",
  LATE = "LATE",
  TURN_APPROACHING = "TURN_APPROACHING",
  DISBURSEMENT_RECEIVED = "DISBURSEMENT_RECEIVED",
  GOODS_READY = "GOODS_READY",
  TRANSFER_RECEIVED = "TRANSFER_RECEIVED",
  QR_PAYMENT_VALIDATED = "QR_PAYMENT_VALIDATED",
  KYC_ACTION_REQUIRED = "KYC_ACTION_REQUIRED",
}

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCount {
  count: number;
}
