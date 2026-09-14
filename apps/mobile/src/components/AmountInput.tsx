import React from "react";
import { Platform, StyleSheet, Text, TextInput, TextStyle, View } from "react-native";
import { colors, fontFamily, spacing } from "@/theme";

// react-native-web renders TextInput as a real <input>, which picks up the
// browser's default focus ring; native iOS/Android never shows this.
// outlineStyle is a react-native-web-only passthrough, not in RN's types.
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
}

export function AmountInput({ value, onChangeText, autoFocus }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, webNoOutline]}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.inkFaint}
        autoFocus={autoFocus}
      />
      <Text style={styles.suffix}>FCFA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: spacing.sm },
  input: {
    fontSize: 44,
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    letterSpacing: -0.5,
    minWidth: 60,
    textAlign: "center",
    padding: 0,
  },
  suffix: { fontSize: 16, fontFamily: fontFamily.semiBold, color: colors.inkSoft },
});
