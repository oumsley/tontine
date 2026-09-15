import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ContributionStatus, type SubscriptionSummary } from "@bingmoney/shared";
import { BackButton, Button, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { catalogApi } from "@/api/catalog";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "MyTontines">;

export function MyTontinesScreen({ navigation }: Props) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      catalogApi.listMySubscriptions().then((res) => {
        if (!cancelled) setSubscriptions(res);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScreenContainer>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Mes tontines</Text>

      {subscriptions?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={typography.body}>Aucune tontine pour le moment</Text>
          <Text style={[typography.caption, { textAlign: "center" }]}>
            Parcourez les offres pour adhérer à un groupe BingMoney.
          </Text>
          <Button label="Voir les offres" variant="secondary" onPress={() => navigation.navigate("Offers")} />
        </View>
      ) : (
        subscriptions?.map((sub) => (
          <Pressable
            key={sub.subscriptionId}
            onPress={() => navigation.navigate("TontineTracking", { subscriptionId: sub.subscriptionId })}
            style={styles.card}
          >
            <View style={styles.topRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>{sub.theme ?? "Tontine"}</Text>
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

            <Text style={typography.sectionTitle}>
              {sub.productName} · {sub.groupLabel}
            </Text>
            <Text style={typography.bodySoft} numberOfLines={2}>
              {sub.description}
            </Text>

            <View style={styles.metaRow}>
              <MetaCell label="Prochaine échéance" value={sub.nextDueDate ? new Date(sub.nextDueDate).toLocaleDateString("fr-FR") : "—"} />
              <MetaCell label="Membres" value={`${sub.totalSlots}`} />
              <MetaCell label="À jour / En retard" value={`${sub.membersUpToDate} / ${sub.membersLate}`} />
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(sub.currentCycle / sub.totalSlots) * 100}%` }]} />
            </View>
            <Text style={typography.caption}>
              Tour {sub.currentCycle} / {sub.totalSlots} · Cotisation {sub.nextDueAmount ? `${formatAmount(sub.nextDueAmount)} F` : "—"}
            </Text>
          </Pressable>
        ))
      )}
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

const styles = StyleSheet.create({
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { backgroundColor: colors.accentTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  badgeLabel: { fontSize: 12, fontWeight: "700", color: colors.accentDark },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  statusPillSuccess: { backgroundColor: colors.successTint },
  statusPillDanger: { backgroundColor: colors.dangerTint },
  statusPillLabel: { fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaValue: { fontSize: 14, fontWeight: "700", color: colors.ink },
  progressTrack: { height: 6, borderRadius: radii.full, backgroundColor: colors.accentTint, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: radii.full },
});
