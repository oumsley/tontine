import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AmountInput, BackButton, Button, ScreenContainer, TextField } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { merchantsApi } from "@/api/merchants";
import { ApiError } from "@/api/client";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "ScanToPay">;

export function ScanToPayScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState("");
  const [scanned, setScanned] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<{ qrCode: string; displayName: string } | null>(null);
  const [amount, setAmount] = useState("");

  async function resolveCode(qrCode: string) {
    if (!qrCode || checking) return;
    setScanned(true);
    setChecking(true);
    setError(null);
    try {
      const result = await merchantsApi.lookup(qrCode);
      setMerchant({ qrCode, displayName: result.displayName });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "QR code invalide.");
      setScanned(false);
    } finally {
      setChecking(false);
    }
  }

  function handleContinue() {
    if (!merchant) return;
    navigation.navigate("SecurityAuth", {
      intent: { kind: "PAY", qrCode: merchant.qrCode, amount: Number(amount) },
      targetLabel: merchant.displayName,
    });
  }

  if (merchant) {
    const numericAmount = Number(amount);
    return (
      <ScreenContainer
        footer={
          <View style={{ padding: spacing.xl }}>
            <Button label="Continuer" onPress={handleContinue} disabled={!(numericAmount > 0)} />
          </View>
        }
      >
        <BackButton onPress={() => setMerchant(null)} />
        <Text style={typography.title}>{merchant.displayName}</Text>
        <Text style={typography.bodySoft}>Montant à payer</Text>
        <View style={{ paddingVertical: spacing.xxl }}>
          <AmountInput value={amount} onChangeText={setAmount} autoFocus />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Scanner pour payer</Text>

      <View style={styles.cameraFrame}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : (result) => resolveCode(result.data)}
          />
        ) : (
          <View style={styles.permissionPrompt}>
            <Text style={[typography.bodySoft, { textAlign: "center" }]}>
              L'accès à la caméra est nécessaire pour scanner un QR code marchand.
            </Text>
            <Button label="Autoriser la caméra" onPress={() => requestPermission()} />
          </View>
        )}
      </View>

      {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}

      <View style={{ gap: spacing.md }}>
        <TextField
          label="Ou saisir le code manuellement"
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="QR-XXXX"
          autoCapitalize="characters"
        />
        <Pressable onPress={() => resolveCode(manualCode.trim())} disabled={!manualCode.trim() || checking}>
          <Text style={{ fontFamily: fontFamily.semiBold, color: colors.accent, fontSize: 13.5 }}>
            {checking ? "Vérification…" : "Valider le code"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cameraFrame: {
    height: 320,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.ink,
  },
  permissionPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
});
