import React, { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";

interface Props {
  label: string;
  amount: number;
  currency?: string;
}

export function BalanceCard({ label, amount, currency = "FCFA", children }: PropsWithChildren<Props>) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{formatAmount(amount)}</Text>
        <Text style={styles.currency}>{currency}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentDark,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.xs,
  },
  label: { fontSize: 13, fontFamily: fontFamily.medium, color: "rgba(255,255,255,0.72)" },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  amount: { fontSize: 34, fontFamily: fontFamily.extraBold, color: colors.white, letterSpacing: -0.5 },
  currency: { fontSize: 14, fontFamily: fontFamily.semiBold, color: "rgba(255,255,255,0.75)" },
});
