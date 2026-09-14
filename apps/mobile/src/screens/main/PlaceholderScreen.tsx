import React from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { BottomNavBar, NavKey, ScreenContainer } from "@/components";
import { spacing, typography } from "@/theme";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { useMainNav } from "./useMainNav";

type Props = NativeStackScreenProps<
  MainStackParamList,
  "CataloguePlaceholder" | "TrustPlaceholder" | "ProfilePlaceholder"
>;

function PlaceholderBody({ navigation, active, title }: Props & { active: NavKey; title: string }) {
  const onNavigate = useMainNav(navigation);
  return (
    <ScreenContainer scroll={false} footer={<BottomNavBar active={active} onNavigate={onNavigate} />}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
        <Text style={typography.title}>{title}</Text>
        <Text style={typography.bodySoft}>Bientôt disponible.</Text>
      </View>
    </ScreenContainer>
  );
}

export function CataloguePlaceholderScreen(props: Props) {
  return <PlaceholderBody {...props} active="catalogue" title="Catalogue" />;
}

export function TrustPlaceholderScreen(props: Props) {
  return <PlaceholderBody {...props} active="trust" title="Trust Score" />;
}

export function ProfilePlaceholderScreen(props: Props) {
  return <PlaceholderBody {...props} active="profile" title="Profil" />;
}
