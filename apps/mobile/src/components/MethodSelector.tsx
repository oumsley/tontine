import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PaymentMethod } from "@bingmoney/shared";
import { colors, fontFamily, minTapTarget, radii, spacing } from "@/theme";

const LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.MOBILE_MONEY]: "Mobile Money",
  [PaymentMethod.CARD]: "Carte bancaire",
  [PaymentMethod.BANK_TRANSFER]: "Virement",
};

interface Props {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function MethodSelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {(Object.values(PaymentMethod) as PaymentMethod[]).map((method) => {
        const selected = method === value;
        return (
          <Pressable
            key={method}
            onPress={() => onChange(method)}
            style={[styles.pill, selected && styles.pillSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{LABELS[method]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    minHeight: minTapTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  label: { fontSize: 13.5, fontFamily: fontFamily.semiBold, color: colors.inkSoft },
  labelSelected: { color: colors.accentDark },
});
