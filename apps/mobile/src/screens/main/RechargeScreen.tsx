import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { PaymentMethod } from "@bingmoney/shared";
import { AmountInput, BackButton, Button, MethodSelector, ScreenContainer } from "@/components";
import { colors, fontFamily, spacing, typography } from "@/theme";
import { walletApi } from "@/api/wallet";
import { ApiError } from "@/api/client";
import { generateIdempotencyKey } from "@/utils/idempotency";
import { formatAmount } from "@/utils/formatCurrency";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Recharge">;

export function RechargeScreen({ navigation }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.MOBILE_MONEY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount);
  const canSubmit = numericAmount > 0;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await walletApi.topUp(numericAmount, method, generateIdempotencyKey());
      navigation.replace("ActionSuccess", {
        title: "Recharge effectuée",
        subtitle: `${formatAmount(numericAmount)} FCFA ont été ajoutés à votre solde.`,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "La recharge a échoué, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer
      footer={
        <View style={{ padding: spacing.xl }}>
          <Button label="Recharger" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
        </View>
      }
    >
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Recharger mon wallet</Text>

      <View style={{ paddingVertical: spacing.xxl }}>
        <AmountInput value={amount} onChangeText={setAmount} autoFocus />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={typography.label}>Méthode de recharge</Text>
        <MethodSelector value={method} onChange={setMethod} />
      </View>

      {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}
    </ScreenContainer>
  );
}
