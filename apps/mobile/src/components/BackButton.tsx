import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { colors, minTapTarget, radii } from "@/theme";

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Retour" onPress={onPress} style={styles.button}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="15 6 9 12 15 18" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: minTapTarget - 4,
    height: minTapTarget - 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
