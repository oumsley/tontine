import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { colors, fontFamily, minTapTarget } from "@/theme";

interface Props {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinKeypad({ onDigit, onBackspace }: Props) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key, index) => {
        if (key === "") return <View key={`spacer-${index}`} style={styles.key} />;
        if (key === "back") {
          return (
            <Pressable
              key={key}
              accessibilityLabel="Effacer"
              onPress={onBackspace}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.inkSoft} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-6-6 6-6z" />
                <Line x1="13" y1="10" x2="18" y2="15" />
                <Line x1="18" y1="10" x2="13" y2="15" />
              </Svg>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={key}
            accessibilityLabel={`Chiffre ${key}`}
            onPress={() => onDigit(key)}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          >
            <Text style={styles.keyLabel}>{key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const KEY_SIZE = Math.max(minTapTarget + 24, 72);

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    maxWidth: 300,
    alignSelf: "center",
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: {
    backgroundColor: colors.accentTint,
  },
  keyLabel: {
    fontSize: 24,
    fontFamily: fontFamily.semiBold,
    color: colors.ink,
  },
});
