import React, { useCallback, useEffect, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { KycStatus, type KycStatusResponse } from "@bingmoney/shared";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { Button, ScreenContainer, StepDots } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { kycApi } from "@/api/kyc";
import { useSession } from "@/auth/SessionContext";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type Props = NativeStackScreenProps<OnboardingStackParamList, "KycPending">;

const POLL_INTERVAL_MS = 4000;

export function KycPendingScreen({ navigation }: Props) {
  const session = useSession();
  const [status, setStatus] = useState<KycStatusResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await kycApi.getStatus();
      setStatus(result);
    } catch {
      // Keep showing the last known status; the poll will retry.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleManualRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const isVerified = status?.status === KycStatus.VERIFIED;
  const isRejected = status?.status === KycStatus.REJECTED;

  return (
    <ScreenContainer>
      <StepDots total={6} current={5} />

      <View style={{ alignItems: "center", gap: spacing.xl, flex: 1, justifyContent: "center" }}>
        <View style={[styles.badge, isVerified && styles.badgeSuccess, isRejected && styles.badgeDanger]}>
          <StatusIcon status={status?.status ?? KycStatus.PENDING} />
        </View>

        <View style={{ gap: spacing.sm, alignItems: "center" }}>
          <Text style={typography.title}>
            {isVerified ? "Identité vérifiée" : isRejected ? "Vérification refusée" : "Vérification en cours"}
          </Text>
          <Text style={[typography.bodySoft, { textAlign: "center" }]}>
            {isVerified &&
              "Votre compte BingMoney est prêt. Vous pouvez maintenant accéder au catalogue de tontines."}
            {isRejected && (status?.rejectionReason ?? "Vos documents n'ont pas pu être validés.")}
            {!isVerified &&
              !isRejected &&
              "Nos équipes vérifient votre pièce d'identité et votre selfie. Cela prend généralement quelques minutes."}
          </Text>
        </View>
      </View>

      {isRejected ? (
        <Button label="Réessayer" onPress={() => navigation.navigate("KycCapture")} />
      ) : (
        <View style={{ gap: spacing.md }}>
          <Button label="Accéder à BingMoney" onPress={() => void session.refresh()} />
          <Pressable onPress={handleManualRefresh} disabled={refreshing} style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: fontFamily.semiBold, color: colors.inkSoft, fontSize: 13.5 }}>
              {refreshing ? "Actualisation…" : "Actualiser le statut"}
            </Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

function StatusIcon({ status }: { status: KycStatus }) {
  if (status === KycStatus.VERIFIED) {
    return (
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="9" />
        <Polyline points="8 12.5 11 15.5 16 9" />
      </Svg>
    );
  }
  if (status === KycStatus.REJECTED) {
    return (
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="9" />
        <Path d="M9 9l6 6M15 9l-6 6" />
      </Svg>
    );
  }
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="8.5" />
      <Polyline points="12 7.5 12 12 15.5 14" />
    </Svg>
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
  badgeSuccess: { backgroundColor: colors.successTint },
  badgeDanger: { backgroundColor: colors.dangerTint },
};
