import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import {
  LedgerDirection,
  type SubscriptionSummary,
  type TransactionSummary,
  type UserSummary,
} from "@bingmoney/shared";
import { BottomNavBar, Button, ScreenContainer } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { walletApi } from "@/api/wallet";
import { catalogApi } from "@/api/catalog";
import { authApi } from "@/api/auth";
import { notificationsApi } from "@/api/notifications";
import { txnLabel, TxTypeIcon } from "./WalletScreen";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { useMainNav } from "./useMainNav";

type Props = NativeStackScreenProps<MainStackParamList, "Home">;

function isSameOrBeforeToday(dateIso: string): boolean {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(dateIso).getTime() <= endOfToday.getTime();
}

export function HomeScreen({ navigation }: Props) {
  const onNavigate = useMainNav(navigation);
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [balance, setBalance] = useState(0);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<TransactionSummary[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      authApi.getProfile().then((res) => {
        if (!cancelled) setProfile(res);
      });
      walletApi.getSummary().then((summary) => {
        if (!cancelled) setBalance(summary.balance);
      });
      walletApi.getHistory().then((res) => {
        if (!cancelled) setRecentActivity(res.slice(0, 3));
      });
      catalogApi.listMySubscriptions().then((res) => {
        if (!cancelled) setSubscriptions(res);
      });
      notificationsApi.unreadCount().then((res) => {
        if (!cancelled) setUnreadNotifications(res.count);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const withDue = subscriptions.filter((s) => s.nextDueDate);
  const dueToday = withDue
    .filter((s) => isSameOrBeforeToday(s.nextDueDate!))
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());
  const dueSoon = withDue
    .filter((s) => !isSameOrBeforeToday(s.nextDueDate!))
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())
    .slice(0, 2);

  return (
    <ScreenContainer footer={<BottomNavBar active="home" onNavigate={onNavigate} />}>
      <View style={styles.headerRow}>
        <View>
          <Text style={typography.label}>Bonjour</Text>
          <Text style={typography.title}>{profile?.fullName ?? "Bienvenue"} 👋</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Notifications")}
          accessibilityLabel="Notifications"
          style={styles.notifButton}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </Svg>
          {unreadNotifications > 0 ? <View style={styles.notifBadge} /> : null}
        </Pressable>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Mon solde</Text>
          <Pressable onPress={() => setBalanceHidden((v) => !v)} accessibilityLabel="Afficher ou masquer le solde">
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              {balanceHidden ? (
                <>
                  <Path d="M3 3l18 18" />
                  <Path d="M10.6 5.1A10.9 10.9 0 0112 5c6 0 9.5 6 9.5 6a15 15 0 01-3.2 3.9M6.6 6.6C4 8.3 2.5 11 2.5 11S6 17 12 17a10 10 0 003.4-.6" />
                  <Path d="M9.9 9.9a3 3 0 004.2 4.2" />
                </>
              ) : (
                <>
                  <Path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                  <Circle cx="12" cy="12" r="3" />
                </>
              )}
            </Svg>
          </Pressable>
        </View>
        <Text style={styles.balanceAmount}>{balanceHidden ? "•••• ••" : `${formatAmount(balance)} FCFA`}</Text>
        <Button
          label="+ Recharger"
          variant="secondary"
          onPress={() => navigation.navigate("Recharge")}
          style={styles.rechargeButton}
        />
      </View>

      <View style={styles.tileGrid}>
        <HomeTile
          label="MaTontine"
          subtitle="Mes tontines"
          onPress={() => navigation.navigate("MyTontines")}
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 12a8 8 0 0 1 14-5" />
              <Polyline points="18 3 18 7 14 7" />
              <Path d="M20 12a8 8 0 0 1-14 5" />
              <Polyline points="6 21 6 17 10 17" />
            </Svg>
          }
        />
        <HomeTile
          label="LesOffres"
          subtitle="Argent & biens"
          onPress={() => navigation.navigate("Offers")}
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20.6 12.3L12.7 20.2a1.5 1.5 0 0 1-2.1 0l-6.8-6.8a1.5 1.5 0 0 1 0-2.1L11.7 3.4a1.5 1.5 0 0 1 1-.4H19a1.5 1.5 0 0 1 1.5 1.5v6.7c0 .4-.2.8-.4 1.1z" />
              <Circle cx="15.5" cy="7.5" r="1" fill={colors.accentDark} stroke="none" />
            </Svg>
          }
        />
        <HomeTile
          label="Paiement"
          subtitle="Payer, transférer"
          onPress={() => navigation.navigate("Payment")}
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Line x1="7" y1="17" x2="17" y2="7" />
              <Polyline points="8 7 17 7 17 16" />
            </Svg>
          }
        />
        <HomeTile
          label="MonCompte"
          subtitle="Mon argent"
          onPress={() => navigation.navigate("Wallet")}
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="3" y="6" width="18" height="13" rx="2.5" />
              <Path d="M3 9h18" />
              <Circle cx="16" cy="14" r="1.1" fill={colors.accentDark} stroke="none" />
            </Svg>
          }
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={typography.sectionTitle}>Mes cotisations</Text>

        {dueToday.length === 0 && dueSoon.length === 0 ? (
          <View style={styles.allGoodCard}>
            <Text style={typography.body}>Tout est à jour 🎉</Text>
            <Pressable onPress={() => navigation.navigate("MyTontines")}>
              <Text style={styles.linkLabel}>Voir mes tontines</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.dueList}>
            {dueToday.map((sub, index) => (
              <View
                key={sub.subscriptionId}
                style={[styles.dueRow, (index < dueToday.length - 1 || dueSoon.length > 0) && styles.dueRowBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>{sub.productName}</Text>
                  <Text style={styles.dueMetaDanger}>
                    {formatAmount(sub.nextDueAmount ?? 0)} F · Aujourd'hui
                  </Text>
                </View>
                <Button
                  label="Payer"
                  onPress={() => navigation.navigate("TontineTracking", { subscriptionId: sub.subscriptionId })}
                  style={styles.dueCta}
                />
              </View>
            ))}
            {dueSoon.map((sub, index) => (
              <Pressable
                key={sub.subscriptionId}
                onPress={() => navigation.navigate("TontineTracking", { subscriptionId: sub.subscriptionId })}
                style={[styles.dueRow, index < dueSoon.length - 1 && styles.dueRowBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>{sub.productName}</Text>
                  <Text style={typography.caption}>
                    {formatAmount(sub.nextDueAmount ?? 0)} F · {new Date(sub.nextDueDate!).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <Text style={styles.linkLabel}>Voir</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={styles.sectionHead}>
          <Text style={typography.sectionTitle}>Activité récente</Text>
          <Pressable onPress={() => navigation.navigate("Wallet")}>
            <Text style={styles.linkLabel}>Voir tout</Text>
          </Pressable>
        </View>
        {recentActivity.length === 0 ? (
          <Text style={typography.bodySoft}>Aucune activité pour le moment.</Text>
        ) : (
          <View style={styles.dueList}>
            {recentActivity.map((txn, index) => (
              <Pressable
                key={txn.id}
                onPress={() => navigation.navigate("TransactionReceipt", { transactionId: txn.id })}
                style={[styles.activityRow, index < recentActivity.length - 1 && styles.dueRowBorder]}
              >
                <View style={[styles.activityIcon, txn.direction === LedgerDirection.CREDIT ? styles.activityIconIn : styles.activityIconOut]}>
                  <TxTypeIcon type={txn.type} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>{txnLabel(txn)}</Text>
                  <Text style={typography.caption}>{new Date(txn.createdAt).toLocaleDateString("fr-FR")}</Text>
                </View>
                <Text
                  style={[
                    typography.body,
                    { fontWeight: "700" },
                    txn.direction === LedgerDirection.CREDIT ? { color: colors.success } : null,
                  ]}
                >
                  {txn.direction === LedgerDirection.CREDIT ? "+ " : "− "}
                  {formatAmount(txn.amount)} F
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function HomeTile({
  label,
  subtitle,
  icon,
  onPress,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={styles.tileIcon}>{icon}</View>
      <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.tileSubtitle} numberOfLines={1}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  balanceCard: {
    backgroundColor: colors.accentDark,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.xs,
  },
  balanceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontSize: 13, fontFamily: fontFamily.medium, color: "rgba(255,255,255,0.72)" },
  balanceAmount: { fontSize: 32, fontFamily: fontFamily.extraBold, color: colors.white, letterSpacing: -0.5 },
  rechargeButton: { marginTop: spacing.lg, backgroundColor: colors.white },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    width: "47.5%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 3,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileLabel: { fontSize: 14, fontFamily: fontFamily.bold, color: colors.ink },
  tileSubtitle: { fontSize: 11, fontFamily: fontFamily.medium, color: colors.inkSoft },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  linkLabel: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.accent },
  allGoodCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  dueList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  dueRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: spacing.md },
  dueRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dueMetaDanger: { fontSize: 12, fontFamily: fontFamily.semiBold, color: colors.danger, marginTop: 2 },
  dueCta: { height: 40, paddingHorizontal: spacing.lg, minHeight: 0 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  activityIcon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  activityIconIn: { backgroundColor: colors.successTint },
  activityIconOut: { backgroundColor: colors.accentTint },
});
