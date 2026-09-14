import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import { BackButton, Button, ScreenContainer, StepDots, TextField } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { kycApi } from "@/api/kyc";
import { ApiError } from "@/api/client";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type Props = NativeStackScreenProps<OnboardingStackParamList, "KycCapture">;

export function KycCaptureScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fullName.trim().length > 1 && idPhoto && selfie;

  async function pick(kind: "id" | "selfie") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("L'accès à la caméra est nécessaire pour continuer.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      cameraType: kind === "selfie" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    if (kind === "id") setIdPhoto(dataUri);
    else setSelfie(dataUri);
  }

  async function handleSubmit() {
    if (!canSubmit || !idPhoto || !selfie) return;
    setSubmitting(true);
    setError(null);
    try {
      await kycApi.submit(fullName.trim(), idPhoto, selfie);
      navigation.navigate("KycPending");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer vos documents.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <BackButton onPress={() => navigation.goBack()} />
      <StepDots total={6} current={4} />

      <View style={{ gap: spacing.sm }}>
        <Text style={typography.title}>Vérifions votre identité</Text>
        <Text style={typography.bodySoft}>
          Une pièce d'identité et un selfie suffisent pour activer votre compte.
        </Text>
      </View>

      <TextField label="Nom complet" value={fullName} onChangeText={setFullName} placeholder="Aïcha Diallo" />

      <CaptureSlot
        label="Pièce d'identité"
        image={idPhoto}
        icon={
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="5" width="18" height="14" rx="2" />
            <Circle cx="8.5" cy="11" r="1.8" />
            <Line x1="13" y1="9.5" x2="18" y2="9.5" />
            <Line x1="13" y1="12.5" x2="18" y2="12.5" />
          </Svg>
        }
        onPress={() => pick("id")}
      />

      <CaptureSlot
        label="Selfie"
        image={selfie}
        icon={
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="8" r="3.4" />
            <Path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
          </Svg>
        }
        onPress={() => pick("selfie")}
      />

      {error ? <Text style={{ fontFamily: fontFamily.medium, color: colors.danger }}>{error}</Text> : null}

      <View style={{ flex: 1 }} />
      <Button label="Envoyer" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
    </ScreenContainer>
  );
}

function CaptureSlot({
  label,
  image,
  icon,
  onPress,
}: {
  label: string;
  image: string | null;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.slot} accessibilityLabel={`Ajouter : ${label}`}>
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} />
      ) : (
        <View style={styles.iconCircle}>{icon}</View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={typography.body}>{label}</Text>
        <Text style={typography.caption}>{image ? "Photo capturée" : "Appuyer pour prendre une photo"}</Text>
      </View>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.inkFaint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="9 6 15 12 9 18" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
  },
});
