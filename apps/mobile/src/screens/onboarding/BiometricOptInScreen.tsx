import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import Svg, { Path } from "react-native-svg";
import { Button, ScreenContainer, StepDots } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { pinCache } from "@/auth/pinCache";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type Props = NativeStackScreenProps<OnboardingStackParamList, "BiometricOptIn">;

export function BiometricOptInScreen({ navigation }: Props) {
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnable() {
    setError(null);
    setEnabling(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setError("Aucune biométrie disponible sur cet appareil pour le moment.");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Activer la biométrie pour BingMoney",
      });
      if (result.success) {
        await pinCache.setBiometricsEnabled(true);
        navigation.navigate("KycCapture");
      } else {
        setError("Authentification biométrique annulée.");
      }
    } finally {
      setEnabling(false);
    }
  }

  return (
    <ScreenContainer>
      <StepDots total={6} current={3} />

      <View style={{ alignItems: "center", gap: spacing.xl, flex: 1, justifyContent: "center" }}>
        <View style={styles.badge}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 3a7 7 0 0 0-7 7c0 3 1 4.5 1 7" />
            <Path d="M12 3a7 7 0 0 1 7 7c0 1.5-.1 2.6-.4 3.6" />
            <Path d="M8.5 20c-.6-1.2-1-2.5-1-5a4.5 4.5 0 0 1 9 0c0 1 0 1.7-.1 2.3" />
            <Path d="M12 10a3 3 0 0 0-3 3c0 3 1 5 2 7" />
            <Path d="M12 10a3 3 0 0 1 3 3c0 1.3-.1 2.3-.4 3.2" />
          </Svg>
        </View>
        <View style={{ gap: spacing.sm, alignItems: "center" }}>
          <Text style={typography.title}>Sécurisez votre compte</Text>
          <Text style={[typography.bodySoft, { textAlign: "center" }]}>
            Activez la biométrie pour confirmer vos transferts et paiements plus rapidement, en toute
            sécurité.
          </Text>
        </View>
        {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}
      </View>

      <View style={{ gap: spacing.lg }}>
        <Button label="Activer la biométrie" onPress={handleEnable} loading={enabling} />
        <Pressable onPress={() => navigation.navigate("KycCapture")} style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: fontFamily.semiBold, color: colors.inkSoft, fontSize: 13.5 }}>
            Plus tard
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = {
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.md + 4,
    backgroundColor: colors.accentTint,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
