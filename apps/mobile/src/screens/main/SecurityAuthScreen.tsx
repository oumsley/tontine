import React, { useEffect, useRef, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import Svg, { Path } from "react-native-svg";
import { PinDots, PinKeypad, ScreenContainer } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { walletApi } from "@/api/wallet";
import { catalogApi } from "@/api/catalog";
import { ApiError } from "@/api/client";
import { pinCache } from "@/auth/pinCache";
import { generateIdempotencyKey } from "@/utils/idempotency";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { WalletIntent } from "@/navigation/walletIntents";

const PIN_LENGTH = 4;

type Props = NativeStackScreenProps<MainStackParamList, "SecurityAuth">;

function actionCopy(intent: WalletIntent, targetLabel: string): { title: string; subtitle: string } {
  const amount = `${formatAmount(intent.amount)} FCFA`;
  switch (intent.kind) {
    case "TRANSFER":
      return { title: "Transfert envoyé", subtitle: `${amount} envoyés à ${targetLabel}.` };
    case "WITHDRAW":
      return { title: "Retrait effectué", subtitle: `${amount} en cours de retrait.` };
    case "PAY":
      return { title: "Paiement effectué", subtitle: `${amount} payés à ${targetLabel}.` };
    case "AIRTIME":
      return { title: "Crédit envoyé", subtitle: `${amount} envoyés au ${targetLabel}.` };
    case "SUBSCRIBE":
      return { title: "Adhésion confirmée", subtitle: `Vous avez rejoint ${targetLabel}.` };
    case "PAY_CONTRIBUTION":
      return { title: "Cotisation payée", subtitle: `${amount} réglés pour ${targetLabel}.` };
  }
}

async function executeIntent(intent: WalletIntent, pin: string, idempotencyKey: string) {
  switch (intent.kind) {
    case "TRANSFER":
      return walletApi.transfer(intent.toPhoneNumber, intent.amount, pin, idempotencyKey);
    case "WITHDRAW":
      return walletApi.withdraw(intent.amount, intent.method, pin, idempotencyKey);
    case "PAY":
      return walletApi.payMerchant(intent.qrCode, intent.amount, pin, idempotencyKey);
    case "AIRTIME":
      return walletApi.buyAirtime(intent.phoneNumber, intent.provider, intent.amount, pin, idempotencyKey);
    case "SUBSCRIBE":
      return catalogApi.subscribe(intent.groupId, pin, idempotencyKey);
    case "PAY_CONTRIBUTION":
      return catalogApi.payContribution(intent.contributionId, pin, idempotencyKey);
  }
}

export function SecurityAuthScreen({ navigation, route }: Props) {
  const { intent, targetLabel, returnTo = "Wallet" } = route.params;
  const idempotencyKey = useRef(generateIdempotencyKey()).current;

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    pinCache.isBiometricsEnabled().then(setBiometricsAvailable);
  }, []);

  async function submit(pin: string) {
    setSubmitting(true);
    setError(null);
    try {
      await executeIntent(intent, pin, idempotencyKey);
      const copy = actionCopy(intent, targetLabel);
      navigation.reset({ index: 1, routes: [{ name: returnTo }, { name: "ActionSuccess", params: copy }] });
    } catch (err) {
      setCode("");
      setError(err instanceof ApiError ? err.message : "L'opération a échoué, réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDigit(digit: string) {
    if (submitting || code.length >= PIN_LENGTH) return;
    const next = code + digit;
    setCode(next);
    if (next.length === PIN_LENGTH) void submit(next);
  }

  function handleBackspace() {
    setCode((c) => c.slice(0, -1));
  }

  async function handleBiometric() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirmer avec la biométrie",
    });
    if (!result.success) return;
    const cachedPin = await pinCache.getPin();
    if (cachedPin) void submit(cachedPin);
  }

  return (
    <ScreenContainer scroll={false}>
      <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Annuler" style={{ alignSelf: "flex-end" }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.inkSoft} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      </Pressable>

      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <View style={styles.lockBadge}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 10.5h14v9.5H5z" />
            <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </Svg>
        </View>
        <Text style={typography.bodySoft}>Confirmer l'opération</Text>
        <Text style={styles.amount}>{formatAmount(intent.amount)} FCFA</Text>
        <Text style={typography.bodySoft}>{targetLabel}</Text>
      </View>

      <View style={{ alignItems: "center", gap: spacing.xl }}>
        <PinDots length={PIN_LENGTH} filled={code.length} />
        {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}
        {biometricsAvailable ? (
          <Pressable onPress={handleBiometric} style={styles.biometricHint}>
            <Text style={styles.biometricLabel}>Utiliser la biométrie</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />
      <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} />
    </ScreenContainer>
  );
}

const styles = {
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.md + 4,
    backgroundColor: colors.accentTint,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  amount: { fontSize: 30, fontFamily: fontFamily.extraBold, color: colors.ink, letterSpacing: -0.5 },
  biometricHint: {
    backgroundColor: colors.accentTint,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  biometricLabel: { fontSize: 13.5, fontFamily: fontFamily.semiBold, color: colors.accentDark },
};
