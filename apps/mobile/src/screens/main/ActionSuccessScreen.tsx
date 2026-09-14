import React from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Button, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { MainStackParamList } from "@/navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "ActionSuccess">;

export function ActionSuccessScreen({ navigation, route }: Props) {
  const { title, subtitle } = route.params;

  return (
    <ScreenContainer
      scroll={false}
      footer={
        <View style={{ padding: spacing.xl }}>
          <Button label="Terminé" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg }}>
        <View style={styles.badge}>
          <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="9" />
            <Polyline points="8 12.5 11 15.5 16 9" />
          </Svg>
        </View>
        <View style={{ gap: spacing.sm, alignItems: "center" }}>
          <Text style={typography.title}>{title}</Text>
          <Text style={[typography.bodySoft, { textAlign: "center" }]}>{subtitle}</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = {
  badge: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.successTint,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
