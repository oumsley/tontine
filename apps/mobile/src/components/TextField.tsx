import React, { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View } from "react-native";
import { colors, fontFamily, radii, spacing } from "@/theme";

// react-native-web renders TextInput as a real <input>, which picks up the
// browser's default focus ring on top of our own focus border; native
// iOS/Android never shows this. outlineStyle is a react-native-web-only
// passthrough, not in RN's types.
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

interface Props extends TextInputProps {
  label: string;
}

export function TextField({ label, style, onFocus, onBlur, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, webNoOutline, focused && styles.inputFocused, style]}
        placeholderTextColor={colors.inkFaint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.inkSoft },
  input: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
});
