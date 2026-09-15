import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";
import { NotificationType, type NotificationSummary } from "@bingmoney/shared";
import { BackButton, ScreenContainer } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { notificationsApi } from "@/api/notifications";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Notifications">;

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: colors.accentDark,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case NotificationType.ADHESION_CONFIRMED:
      return (
        <Svg {...iconProps}>
          <Circle cx="12" cy="12" r="9" />
          <Polyline points="8 12.5 11 15.5 16 9" />
        </Svg>
      );
    case NotificationType.DUE_SOON:
    case NotificationType.DUE_TODAY:
      return (
        <Svg {...iconProps}>
          <Circle cx="12" cy="12" r="8.5" />
          <Polyline points="12 7.5 12 12 15.5 14" />
        </Svg>
      );
    case NotificationType.LATE:
      return (
        <Svg {...iconProps} stroke={colors.danger}>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 8v5" />
          <Circle cx="12" cy="16" r="0.5" fill={colors.danger} />
        </Svg>
      );
    case NotificationType.TURN_APPROACHING:
      return (
        <Svg {...iconProps}>
          <Path d="M4 12a8 8 0 0 1 14-5" />
          <Polyline points="18 3 18 7 14 7" />
        </Svg>
      );
    case NotificationType.DISBURSEMENT_RECEIVED:
    case NotificationType.TRANSFER_RECEIVED:
      return (
        <Svg {...iconProps}>
          <Path d="M12 4v11" />
          <Polyline points="7 10 12 15 17 10" />
          <Path d="M5 19h14" />
        </Svg>
      );
    case NotificationType.GOODS_READY:
      return (
        <Svg {...iconProps}>
          <Path d="M22 10L12 5 2 10l10 5 10-5z" />
          <Path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
        </Svg>
      );
    case NotificationType.QR_PAYMENT_VALIDATED:
      return (
        <Svg {...iconProps}>
          <Path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <Path d="M4 16v2a2 2 0 0 0 2 2h2" />
          <Path d="M20 8V6a2 2 0 0 0-2-2h-2" />
          <Path d="M20 16v2a2 2 0 0 1-2 2h-2" />
        </Svg>
      );
    case NotificationType.KYC_ACTION_REQUIRED:
    default:
      return (
        <Svg {...iconProps}>
          <Rect x="7" y="2.5" width="10" height="19" rx="2" />
        </Svg>
      );
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<NotificationSummary[] | null>(null);

  const load = useCallback(() => {
    notificationsApi.list().then(setNotifications);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handlePress(notification: NotificationSummary) {
    if (!notification.readAt) {
      await notificationsApi.markRead(notification.id);
      load();
    }
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    load();
  }

  const hasUnread = notifications?.some((n) => !n.readAt) ?? false;

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <BackButton onPress={() => navigation.goBack()} />
        {hasUnread ? (
          <Pressable onPress={handleMarkAllRead}>
            <Text style={styles.markAllLabel}>Tout marquer comme lu</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={typography.title}>Notifications</Text>

      {notifications?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={typography.body}>Aucune notification pour le moment</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications?.map((n, index) => (
            <Pressable
              key={n.id}
              onPress={() => handlePress(n)}
              style={[styles.row, index < notifications.length - 1 && styles.rowBorder]}
            >
              <View style={[styles.icon, !n.readAt && styles.iconUnread]}>
                <NotificationIcon type={n.type} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.body, !n.readAt && styles.titleUnread]}>{n.title}</Text>
                <Text style={typography.bodySoft}>{n.body}</Text>
                <Text style={typography.caption}>{timeAgo(n.createdAt)}</Text>
              </View>
              {!n.readAt ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  markAllLabel: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.accent },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  iconUnread: { backgroundColor: colors.accentTint },
  titleUnread: { fontFamily: fontFamily.bold },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
});
