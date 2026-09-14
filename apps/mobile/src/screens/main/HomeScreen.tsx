import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import { BalanceCard, BottomNavBar, Button, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { walletApi } from "@/api/wallet";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { useMainNav } from "./useMainNav";

type Props = NativeStackScreenProps<MainStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const onNavigate = useMainNav(navigation);
  const [balance, setBalance] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      walletApi.getSummary().then((summary) => {
        if (!cancelled) setBalance(summary.balance);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScreenContainer footer={<BottomNavBar active="home" onNavigate={onNavigate} />}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.label}>Bonjour</Text>
        <Text style={typography.title}>Bienvenue sur BingMoney</Text>
      </View>

      <BalanceCard label="Solde disponible" amount={balance ?? 0}>
        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
          <Pressable
            onPress={() => navigation.navigate("ScanToPay")}
            style={{
              flex: 1,
              height: 52,
              borderRadius: radii.md,
              backgroundColor: colors.white,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 8V6a2 2 0 0 1 2-2h2" />
              <Path d="M4 16v2a2 2 0 0 0 2 2h2" />
              <Path d="M20 8V6a2 2 0 0 0-2-2h-2" />
              <Path d="M20 16v2a2 2 0 0 1-2 2h-2" />
              <Path d="M4 12h16" />
            </Svg>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.accentDark }}>Scanner</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Transfer")}
            style={{
              flex: 1,
              height: 52,
              borderRadius: radii.md,
              backgroundColor: "rgba(255,255,255,0.14)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.28)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M7 17L17 7" />
              <Polyline points="8 7 17 7 17 16" />
            </Svg>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.white }}>Transférer</Text>
          </Pressable>
        </View>
      </BalanceCard>

      <View style={{ gap: spacing.md }}>
        <Text style={typography.sectionTitle}>Mes tontines</Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.lg,
            padding: spacing.xl,
            alignItems: "center",
            gap: spacing.xs,
          }}
        >
          <Text style={typography.body}>Aucune tontine pour le moment</Text>
          <Text style={[typography.caption, { textAlign: "center" }]}>
            Le catalogue des groupes BingMoney arrive bientôt.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => onNavigate("trust")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.lg,
        }}
      >
        <Text style={typography.body}>Trust Score</Text>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.inkFaint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="9 6 15 12 9 18" />
        </Svg>
      </Pressable>
    </ScreenContainer>
  );
}
