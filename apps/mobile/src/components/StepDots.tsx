import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Étape ${current + 1} sur ${total}`}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} style={[styles.dot, index === current && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 20 },
});
