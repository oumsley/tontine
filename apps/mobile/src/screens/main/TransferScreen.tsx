import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { AmountInput, BackButton, Button, ScreenContainer, TextField } from "@/components";
import { spacing, typography } from "@/theme";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Transfer">;

export function TransferScreen({ navigation }: Props) {
  const [phoneNumber, setPhoneNumber] = useState("+221");
  const [amount, setAmount] = useState("");

  const numericAmount = Number(amount);
  const canSubmit = /^\+\d{9,15}$/.test(phoneNumber) && numericAmount > 0;

  function handleContinue() {
    navigation.navigate("SecurityAuth", {
      intent: { kind: "TRANSFER", toPhoneNumber: phoneNumber, amount: numericAmount },
      targetLabel: phoneNumber,
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
      <Text style={typography.title}>Transférer de l'argent</Text>

      <TextField
        label="Numéro du destinataire"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholder="+221 77 000 00 00"
      />

      <View style={{ paddingVertical: spacing.xxl }}>
        <AmountInput value={amount} onChangeText={setAmount} />
      </View>
    </ScreenContainer>
  );
}
