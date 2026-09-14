import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { BackButton, Button, Card, ScreenContainer } from "@/components";
import { colors, spacing, typography } from "@/theme";
import { authApi } from "@/api/auth";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Receive">;

export function ReceiveScreen({ navigation }: Props) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      authApi.getProfile().then((res) => {
        if (!cancelled) setPhoneNumber(res.phoneNumber);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function handleShare() {
    if (!phoneNumber) return;
    await Share.share({
      message: `Envoyez-moi de l'argent sur BingMoney au ${phoneNumber}.`,
    });
  }

  return (
    <ScreenContainer
      footer={
        <View style={{ padding: spacing.xl }}>
          <Button label="Partager mon numéro" onPress={handleShare} disabled={!phoneNumber} />
        </View>
      }
    >
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Recevoir de l'argent</Text>
      <Text style={typography.bodySoft}>
        Partagez ce code ou votre numéro pour recevoir un transfert BingMoney.
      </Text>

      <Card style={styles.qrCard}>
        {phoneNumber ? (
          <QRCode value={`bingmoney://transfer?phone=${encodeURIComponent(phoneNumber)}`} size={200} color={colors.ink} backgroundColor={colors.surface} />
        ) : (
          <View style={{ width: 200, height: 200 }} />
        )}
        <Text style={styles.phoneNumber}>{phoneNumber ?? "…"}</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  qrCard: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xxxl },
  phoneNumber: { fontSize: 18, fontWeight: "800", color: colors.ink, letterSpacing: 0.5 },
});
