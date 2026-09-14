import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { PaymentMethod } from "@bingmoney/shared";
import { AmountInput, BackButton, Button, MethodSelector, ScreenContainer } from "@/components";
import { spacing, typography } from "@/theme";
import { MainStackParamList } from "@/navigation/MainNavigator";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.MOBILE_MONEY]: "Mobile Money",
  [PaymentMethod.CARD]: "carte bancaire",
  [PaymentMethod.BANK_TRANSFER]: "compte bancaire",
};

type Props = NativeStackScreenProps<MainStackParamList, "Withdraw">;

export function WithdrawScreen({ navigation }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.MOBILE_MONEY);

  const numericAmount = Number(amount);
  const canSubmit = numericAmount > 0;

  function handleContinue() {
    navigation.navigate("SecurityAuth", {
      intent: { kind: "WITHDRAW", amount: numericAmount, method },
      targetLabel: `Retrait vers ${METHOD_LABEL[method]}`,
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
      <Text style={typography.title}>Retirer des fonds</Text>

      <View style={{ paddingVertical: spacing.xxl }}>
        <AmountInput value={amount} onChangeText={setAmount} autoFocus />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={typography.label}>Destination du retrait</Text>
        <MethodSelector value={method} onChange={setMethod} />
      </View>
    </ScreenContainer>
  );
}
