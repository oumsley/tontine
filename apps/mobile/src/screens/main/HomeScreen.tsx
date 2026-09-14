import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import { ContributionStatus, type SubscriptionSummary } from "@bingmoney/shared";
import { BalanceCard, BottomNavBar, Button, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { walletApi } from "@/api/wallet";
import { catalogApi } from "@/api/catalog";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { useMainNav } from "./useMainNav";

type Props = NativeStackScreenProps<MainStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const onNavigate = useMainNav(navigation);
  const [balance, setBalance] = useState<number | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      walletApi.getSummary().then((summary) => {
        if (!cancelled) setBalance(summary.balance);
      });
      catalogApi.listMySubscriptions().then((res) => {
        if (!cancelled) setSubscriptions(res);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScreenContainer footer={<BottomNavBar active="home" onNavigate={onNavigate} />}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.label}>Bonjour</Text>
        <Text style={typography.title}>Bienvenue sur BingMoney</Text>
      </View>

      <BalanceCard label="Solde disponible" amount={balance ?? 0}>
        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
          <Pressable onPress={() => navigation.navigate("ScanToPay")} style={styles.primaryAction}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 8V6a2 2 0 0 1 2-2h2" />
              <Path d="M4 16v2a2 2 0 0 0 2 2h2" />
              <Path d="M20 8V6a2 2 0 0 0-2-2h-2" />
              <Path d="M20 16v2a2 2 0 0 1-2 2h-2" />
              <Path d="M4 12h16" />
            </Svg>
            <Text style={styles.primaryActionLabel}>Scanner</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Transfer")} style={styles.secondaryAction}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M7 17L17 7" />
              <Polyline points="8 7 17 7 17 16" />
            </Svg>
            <Text style={styles.secondaryActionLabel}>Transférer</Text>
          </Pressable>
        </View>
      </BalanceCard>

      <View style={{ gap: spacing.md }}>
        <View style={styles.sectionHead}>
          <Text style={typography.sectionTitle}>Mes tontines</Text>
          <Pressable onPress={() => onNavigate("catalogue")}>
            <Text style={styles.sectionLink}>Voir le catalogue</Text>
          </Pressable>
        </View>

        {subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={typography.body}>Aucune tontine pour le moment</Text>
            <Text style={[typography.caption, { textAlign: "center" }]}>
              Parcourez le catalogue pour souscrire à un groupe BingMoney.
            </Text>
            <Button label="Découvrir le catalogue" variant="secondary" onPress={() => onNavigate("catalogue")} />
          </View>
        ) : (
          subscriptions.map((sub) => (
            <Pressable
              key={sub.subscriptionId}
              onPress={() => navigation.navigate("TontineTracking", { subscriptionId: sub.subscriptionId })}
              style={styles.tontineCard}
            >
              <View style={styles.tontineTop}>
                <View style={styles.tontineBadge}>
                  <Text style={styles.tontineBadgeLabel}>{sub.theme ?? "Tontine"}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    sub.memberStatus === ContributionStatus.LATE ? styles.statusPillDanger : styles.statusPillSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillLabel,
                      { color: sub.memberStatus === ContributionStatus.LATE ? colors.danger : colors.success },
                    ]}
                  >
                    {sub.memberStatus === ContributionStatus.LATE ? "En retard" : "À jour"}
                  </Text>
                </View>
              </View>
              <Text style={typography.body}>
                {sub.productName} · {sub.groupLabel}
              </Text>
              <View style={styles.tontineMetaRow}>
                <MetaCell label="Tour actuel" value={`${sub.currentCycle} / ${sub.totalSlots}`} />
                <MetaCell
                  label="Prochaine échéance"
                  value={sub.nextDueDate ? new Date(sub.nextDueDate).toLocaleDateString("fr-FR") : "—"}
                />
                <MetaCell label="Cotisation" value={sub.nextDueAmount ? `${formatAmount(sub.nextDueAmount)} F` : "—"} />
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(sub.currentCycle / sub.totalSlots) * 100}%` }]} />
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Pressable onPress={() => onNavigate("trust")} style={styles.trustShortcut}>
        <Text style={typography.body}>Trust Score</Text>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.inkFaint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="9 6 15 12 9 18" />
        </Svg>
      </Pressable>
    </ScreenContainer>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = {
  primaryAction: {
    flex: 1,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  primaryActionLabel: { fontSize: 15, fontWeight: "700" as const, color: colors.accentDark },
  secondaryAction: {
    flex: 1,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  secondaryActionLabel: { fontSize: 15, fontWeight: "700" as const, color: colors.white },
  sectionHead: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "baseline" as const },
  sectionLink: { fontSize: 13, fontWeight: "600" as const, color: colors.accent },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center" as const,
    gap: spacing.md,
  },
  tontineCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  tontineTop: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  tontineBadge: { backgroundColor: colors.accentTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  tontineBadgeLabel: { fontSize: 12, fontWeight: "700" as const, color: colors.accentDark },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  statusPillSuccess: { backgroundColor: colors.successTint },
  statusPillDanger: { backgroundColor: colors.dangerTint },
  statusPillLabel: { fontSize: 12, fontWeight: "700" as const },
  tontineMetaRow: { flexDirection: "row" as const, justifyContent: "space-between" as const },
  metaValue: { fontSize: 14, fontWeight: "700" as const, color: colors.ink },
  progressTrack: { height: 6, borderRadius: radii.full, backgroundColor: colors.accentTint, overflow: "hidden" as const },
  progressFill: { height: "100%" as const, backgroundColor: colors.accent, borderRadius: radii.full },
  trustShortcut: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
};
