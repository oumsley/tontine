import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors, fontFamily } from "@/theme";

export type NavKey = "home" | "catalogue" | "wallet" | "trust" | "profile";

interface Props {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
}

const ITEMS: { key: NavKey; label: string }[] = [
  { key: "home", label: "Accueil" },
  { key: "catalogue", label: "Catalogue" },
  { key: "wallet", label: "Wallet" },
  { key: "trust", label: "Trust" },
  { key: "profile", label: "Profil" },
];

export function BottomNavBar({ active, onNavigate }: Props) {
  return (
    <View style={styles.nav}>
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        const color = isActive ? colors.accent : colors.inkFaint;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onNavigate(item.key)}
            style={styles.item}
          >
            <NavIcon item={item.key} color={color} />
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NavIcon({ item, color }: { item: NavKey; color: string }) {
  const common = { width: 23, height: 23, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (item) {
    case "home":
      return (
        <Svg {...common}>
          <Path d="M4 11l8-7 8 7" />
          <Path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
        </Svg>
      );
    case "catalogue":
      return (
        <Svg {...common}>
          <Rect x="4" y="4" width="7" height="7" rx="1.5" />
          <Rect x="13" y="4" width="7" height="7" rx="1.5" />
          <Rect x="4" y="13" width="7" height="7" rx="1.5" />
          <Rect x="13" y="13" width="7" height="7" rx="1.5" />
        </Svg>
      );
    case "wallet":
      return (
        <Svg {...common}>
          <Rect x="3" y="6" width="18" height="13" rx="2.5" />
          <Path d="M3 9h18" />
          <Circle cx="16" cy="14" r="1.1" fill={color} stroke="none" />
        </Svg>
      );
    case "trust":
      return (
        <Svg {...common}>
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </Svg>
      );
    case "profile":
      return (
        <Svg {...common}>
          <Circle cx="12" cy="8" r="3.4" />
          <Path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
        </Svg>
      );
  }
}

const styles = StyleSheet.create({
  nav: {
    height: 76,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 8,
  },
  item: {
    alignItems: "center",
    gap: 4,
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
});
