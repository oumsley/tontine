import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AmountInput, BackButton, Button, ScreenContainer, TextField } from "@/components";
import { colors, fontFamily, minTapTarget, radii, spacing, typography } from "@/theme";
import { MainStackParamList } from "@/navigation/MainNavigator";

const PROVIDERS = ["Orange", "Free", "Expresso"];

type Props = NativeStackScreenProps<MainStackParamList, "Airtime">;

export function AirtimeScreen({ navigation }: Props) {
  const [phoneNumber, setPhoneNumber] = useState("+221");
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [amount, setAmount] = useState("");

  const numericAmount = Number(amount);
  const canSubmit = /^\+\d{9,15}$/.test(phoneNumber) && numericAmount > 0;

  function handleContinue() {
    navigation.navigate("SecurityAuth", {
      intent: { kind: "AIRTIME", phoneNumber, provider, amount: numericAmount },
      targetLabel: `${provider} · ${phoneNumber}`,
    });
  }

  return (
    <ScreenContainer
      footer={
        <View style={{ padding: spacing.xl }}>
          <Button label="Continuer" onPress={handleContinue} disabled={!canSubmit} />
        </View>
      }
    >
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Crédit & data</Text>

      <TextField label="Numéro à recharger" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

      <View style={{ gap: spacing.md }}>
        <Text style={typography.label}>Opérateur</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {PROVIDERS.map((p) => {
            const selected = p === provider;
            return (
              <Pressable
                key={p}
                onPress={() => setProvider(p)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingVertical: spacing.xxl }}>
        <AmountInput value={amount} onChangeText={setAmount} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  pillLabel: { fontSize: 13.5, fontFamily: fontFamily.semiBold, color: colors.inkSoft },
  pillLabelSelected: { color: colors.accentDark },
});
