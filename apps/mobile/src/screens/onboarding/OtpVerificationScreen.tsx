import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { BackButton, PinDots, PinKeypad, ScreenContainer, StepDots } from "@/components";
import { colors, fontFamily, spacing, typography } from "@/theme";
import { authApi } from "@/api/auth";
import { tokenStore } from "@/auth/tokenStore";
import { ApiError } from "@/api/client";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<OnboardingStackParamList, "OtpVerification">;

export function OtpVerificationScreen({ navigation, route }: Props) {
  const { phoneNumber, devOtp } = route.params;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(fullCode: string) {
    setError(null);
    setVerifying(true);
    try {
      const tokens = await authApi.verifyOtp(phoneNumber, fullCode);
      await tokenStore.save(tokens);
      navigation.navigate("PinCreation");
    } catch (err) {
      setCode("");
      setError(err instanceof ApiError ? err.message : "Code invalide, réessayez.");
    } finally {
      setVerifying(false);
    }
  }

  function handleDigit(digit: string) {
    if (verifying || code.length >= CODE_LENGTH) return;
    const next = code + digit;
    setCode(next);
    if (next.length === CODE_LENGTH) submit(next);
  }

  function handleBackspace() {
    setCode((c) => c.slice(0, -1));
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await authApi.requestOtp(phoneNumber);
    } catch {
      setError("Impossible de renvoyer le code pour le moment.");
    } finally {
      setResending(false);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <BackButton onPress={() => navigation.goBack()} />
      <StepDots total={6} current={1} />

      <View style={{ gap: spacing.sm, alignItems: "center" }}>
        <Text style={typography.title}>Entrez le code reçu</Text>
        <Text style={[typography.bodySoft, { textAlign: "center" }]}>
          Un code à {CODE_LENGTH} chiffres a été envoyé au {phoneNumber}
          {devOtp ? ` (code de test : ${devOtp})` : ""}
        </Text>
      </View>

      <View style={{ alignItems: "center", gap: spacing.xl }}>
        <PinDots length={CODE_LENGTH} filled={code.length} />
        {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}
        <Pressable onPress={handleResend} disabled={resending}>
          <Text style={{ fontFamily: fontFamily.semiBold, color: colors.accent, fontSize: 13.5 }}>
            {resending ? "Envoi en cours…" : "Renvoyer le code"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />
      <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} />
    </ScreenContainer>
  );
}
