import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`${filled} sur ${length} chiffres saisis`}>
      {Array.from({ length }).map((_, index) => (
        <View key={index} style={[styles.dot, index < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 16 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dotFilled: {
    backgroundColor: colors.accent,
  },
});
