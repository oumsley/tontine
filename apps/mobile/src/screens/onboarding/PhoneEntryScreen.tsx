import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { Button, ScreenContainer, StepDots, TextField } from "@/components";
import { colors, fontFamily, spacing, typography } from "@/theme";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type Props = NativeStackScreenProps<OnboardingStackParamList, "PhoneEntry">;

export function PhoneEntryScreen({ navigation }: Props) {
  const [phoneNumber, setPhoneNumber] = useState("+221");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = /^\+\d{9,15}$/.test(phoneNumber);

  async function handleContinue() {
    setError(null);
    setLoading(true);
    try {
      const { devOtp } = await authApi.requestOtp(phoneNumber);
      navigation.navigate("OtpVerification", { phoneNumber, devOtp });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le code, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <StepDots total={6} current={0} />
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.title}>Quel est votre numéro ?</Text>
        <Text style={typography.bodySoft}>
          Nous vous envoyons un code à usage unique pour vérifier votre identité.
        </Text>
      </View>

      <TextField
        label="Numéro de téléphone"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        autoFocus
        placeholder="+221 77 000 00 00"
      />

      {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}

      <View style={{ flex: 1 }} />
      <Button label="Continuer" onPress={handleContinue} disabled={!isValid} loading={loading} />
    </ScreenContainer>
  );
}
