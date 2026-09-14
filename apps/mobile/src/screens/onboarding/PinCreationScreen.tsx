import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { PinDots, PinKeypad, ScreenContainer, StepDots } from "@/components";
import { colors, fontFamily, spacing, typography } from "@/theme";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

const PIN_LENGTH = 4;

type Props = NativeStackScreenProps<OnboardingStackParamList, "PinCreation">;

export function PinCreationScreen({ navigation }: Props) {
  const [stage, setStage] = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleDigit(digit: string) {
    if (saving || code.length >= PIN_LENGTH) return;
    const next = code + digit;
    setCode(next);
    if (next.length !== PIN_LENGTH) return;

    if (stage === "create") {
      setFirstPin(next);
      setCode("");
      setStage("confirm");
      return;
    }

    if (next !== firstPin) {
      setError("Les deux codes ne correspondent pas, recommencez.");
      setCode("");
      setFirstPin("");
      setStage("create");
      return;
    }

    void savePin(next);
  }

  async function savePin(pin: string) {
    setSaving(true);
    setError(null);
    try {
      await authApi.setPin(pin);
      navigation.navigate("BiometricOptIn");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer le PIN.");
      setCode("");
      setFirstPin("");
      setStage("create");
    } finally {
      setSaving(false);
    }
  }

  function handleBackspace() {
    setCode((c) => c.slice(0, -1));
  }

  return (
    <ScreenContainer scroll={false}>
      <StepDots total={6} current={2} />

      <View style={{ gap: spacing.sm, alignItems: "center" }}>
        <Text style={typography.title}>
          {stage === "create" ? "Créez votre code PIN" : "Confirmez votre code PIN"}
        </Text>
        <Text style={[typography.bodySoft, { textAlign: "center" }]}>
          Ce code vous servira à confirmer vos transferts et paiements.
        </Text>
      </View>

      <View style={{ alignItems: "center", gap: spacing.xl }}>
        <PinDots length={PIN_LENGTH} filled={code.length} />
        {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}
      </View>

      <View style={{ flex: 1 }} />
      <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} />
    </ScreenContainer>
  );
}
