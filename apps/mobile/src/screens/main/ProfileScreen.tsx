import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { KycStatus, type UserSummary } from "@bingmoney/shared";
import { BottomNavBar, Card, ScreenContainer } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { authApi } from "@/api/auth";
import { useSession } from "@/auth/SessionContext";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { useMainNav } from "./useMainNav";

const KYC_LABEL: Record<KycStatus, string> = {
  [KycStatus.UNVERIFIED]: "Non vérifiée",
  [KycStatus.PENDING]: "En cours de vérification",
  [KycStatus.VERIFIED]: "Vérifiée",
  [KycStatus.REJECTED]: "Refusée",
};

type Props = NativeStackScreenProps<MainStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const onNavigate = useMainNav(navigation);
  const session = useSession();
  const [profile, setProfile] = useState<UserSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      authApi.getProfile().then((res) => {
        if (!cancelled) setProfile(res);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const trustLevel = !profile ? "" : profile.trustScore >= 70 ? "Bon niveau" : profile.trustScore >= 40 ? "Niveau moyen" : "À renforcer";

  return (
    <ScreenContainer footer={<BottomNavBar active="profile" onNavigate={onNavigate} />}>
      <Text style={typography.title}>Profil</Text>

      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="8" r="3.4" />
            <Path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
          </Svg>
        </View>
        <View>
          <Text style={typography.sectionTitle}>{profile?.fullName ?? "Utilisateur BingMoney"}</Text>
          <Text style={typography.bodySoft}>{profile?.phoneNumber ?? ""}</Text>
        </View>
      </View>

      <Card>
        <View style={styles.row}>
          <Text style={typography.label}>Identité (KYC)</Text>
          <Text style={typography.body}>{profile ? KYC_LABEL[profile.kycStatus] : "—"}</Text>
        </View>
      </Card>

      <View style={styles.trustCard}>
        <Text style={styles.trustLabel}>Trust Score</Text>
        <View style={styles.trustRow}>
          <Text style={styles.trustNumber}>{profile?.trustScore ?? "—"}</Text>
          <Text style={styles.trustMax}>/ 100</Text>
        </View>
        {profile ? (
          <View style={styles.trustPill}>
            <Text style={styles.trustPillLabel}>{trustLevel}</Text>
          </View>
        ) : null}
        <Text style={styles.trustNote}>
          Le détail par dimension (paiements, historique, réputation, sécurité) arrivera avec le Trust
          Score complet.
        </Text>
      </View>

      <Pressable onPress={() => void session.signOut()} style={styles.signOut}>
        <Text style={styles.signOutLabel}>Se déconnecter</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  identityRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.md + 4,
    backgroundColor: colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  trustCard: {
    backgroundColor: colors.accentDark,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.xs,
  },
  trustLabel: { fontSize: 13, fontFamily: fontFamily.medium, color: "rgba(255,255,255,0.72)" },
  trustRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  trustNumber: { fontSize: 40, fontFamily: fontFamily.extraBold, color: colors.white, letterSpacing: -1 },
  trustMax: { fontSize: 15, fontFamily: fontFamily.semiBold, color: "rgba(255,255,255,0.65)" },
  trustPill: {
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  trustPillLabel: { fontSize: 12.5, fontFamily: fontFamily.bold, color: colors.white },
  trustNote: {
    marginTop: spacing.md,
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  signOut: { alignItems: "center", padding: spacing.md },
  signOutLabel: { fontSize: 14, fontFamily: fontFamily.semiBold, color: colors.danger },
});
