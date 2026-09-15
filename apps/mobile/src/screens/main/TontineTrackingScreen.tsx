import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { ContributionStatus, type SubscriptionDetail } from "@bingmoney/shared";
import { BackButton, Button, Card, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { catalogApi } from "@/api/catalog";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "TontineTracking">;

const STATUS_LABEL: Record<ContributionStatus, string> = {
  [ContributionStatus.PAID]: "Payée",
  [ContributionStatus.UPCOMING]: "À venir",
  [ContributionStatus.LATE]: "En retard",
};

const MEMBER_STATUS_LABEL: Record<ContributionStatus, string> = {
  [ContributionStatus.PAID]: "À jour",
  [ContributionStatus.UPCOMING]: "À jour",
  [ContributionStatus.LATE]: "En retard",
};

export function TontineTrackingScreen({ navigation, route }: Props) {
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);

  const load = useCallback(() => {
    return catalogApi.getSubscription(route.params.subscriptionId).then(setDetail);
  }, [route.params.subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load().catch(() => {
        if (cancelled) return;
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  if (!detail) {
    return (
      <ScreenContainer>
        <BackButton onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const nextDue = detail.contributions.find((c) => !c.paidAt);

  return (
    <ScreenContainer>
      <BackButton onPress={() => navigation.goBack()} />

      <View style={{ gap: spacing.xs }}>
        <Text style={typography.title}>{detail.productName}</Text>
        <Text style={typography.bodySoft}>{detail.groupLabel}</Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryTile label="Tour actuel" value={`${detail.currentCycle} / ${detail.totalSlots}`} />
        <SummaryTile label="Votre tour" value={`#${detail.turnNumber}`} />
        <SummaryTile
          label="Statut"
          value={MEMBER_STATUS_LABEL[detail.memberStatus]}
          tone={detail.memberStatus === ContributionStatus.LATE ? "danger" : "success"}
        />
      </View>

      {nextDue ? (
        <Card>
          <Text style={typography.label}>Prochaine échéance</Text>
          <Text style={styles.dueAmount}>{formatAmount(nextDue.totalDue)} FCFA</Text>
          {nextDue.penaltyAmount > 0 ? (
            <Text style={styles.penaltyNote}>
              Dont {formatAmount(nextDue.penaltyAmount)} F de pénalité de retard
            </Text>
          ) : null}
          <Text style={typography.bodySoft}>
            {nextDue.status === ContributionStatus.LATE ? "En retard depuis le " : "Attendue le "}
            {new Date(nextDue.dueDate).toLocaleDateString("fr-FR")}
          </Text>
          <Button
            label="Payer maintenant"
            onPress={() =>
              navigation.navigate("SecurityAuth", {
                intent: { kind: "PAY_CONTRIBUTION", contributionId: nextDue.id, amount: nextDue.totalDue },
                targetLabel: `${detail.productName} · Tour ${detail.currentCycle}`,
                returnTo: "Home",
              })
            }
          />
        </Card>
      ) : (
        <Card>
          <Text style={typography.body}>Toutes les cotisations sont à jour. 🎉</Text>
        </Card>
      )}

      <Text style={typography.sectionTitle}>Historique des cotisations</Text>
      <View style={styles.list}>
        {detail.contributions.map((c, index) => (
          <View key={c.id} style={[styles.row, index === detail.contributions.length - 1 && { borderBottomWidth: 0 }]}>
            <View>
              <Text style={typography.body}>Tour {c.cycleNumber}</Text>
              <Text style={typography.caption}>{new Date(c.dueDate).toLocaleDateString("fr-FR")}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={typography.body}>{formatAmount(c.totalDue)} F</Text>
              {c.penaltyAmount > 0 ? (
                <Text style={styles.penaltyNoteSmall}>dont {formatAmount(c.penaltyAmount)} F pénalité</Text>
              ) : null}
              <StatusBadge status={c.status} />
            </View>
          </View>
        ))}
      </View>

      <Text style={typography.sectionTitle}>Transparence du groupe</Text>
      <View style={styles.list}>
        {detail.members.map((m, index) => (
          <View key={m.turnNumber} style={[styles.row, index === detail.members.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={typography.body}>
              Tour {m.turnNumber}
              {m.isYou ? " (vous)" : ""}
            </Text>
            <StatusBadge status={m.status} label={MEMBER_STATUS_LABEL[m.status]} />
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={typography.caption}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          tone === "danger" && { color: colors.danger },
          tone === "success" && { color: colors.success },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({ status, label }: { status: ContributionStatus; label?: string }) {
  const isLate = status === ContributionStatus.LATE;
  const isPaid = status === ContributionStatus.PAID;
  return (
    <View
      style={[
        styles.badge,
        isLate ? styles.badgeDanger : isPaid ? styles.badgeSuccess : styles.badgeNeutral,
      ]}
    >
      <Text
        style={[
          styles.badgeLabel,
          isLate ? { color: colors.danger } : isPaid ? { color: colors.success } : { color: colors.inkSoft },
        ]}
      >
        {label ?? STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  summaryValue: { fontSize: 16, fontWeight: "800", color: colors.ink },
  dueAmount: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  penaltyNote: { fontSize: 12.5, fontWeight: "600", color: colors.danger },
  penaltyNoteSmall: { fontSize: 11, fontWeight: "600", color: colors.danger },
  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full, marginTop: 2 },
  badgeLabel: { fontSize: 11, fontWeight: "700" },
  badgeSuccess: { backgroundColor: colors.successTint },
  badgeDanger: { backgroundColor: colors.dangerTint },
  badgeNeutral: { backgroundColor: colors.accentTint },
});
