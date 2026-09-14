import { TextStyle } from "react-native";
import { colors } from "./colors";

// Font family names come from @expo-google-fonts/inter, loaded once in App.tsx.
export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
} as const;

type TypeStyle = Pick<TextStyle, "fontSize" | "fontFamily" | "color" | "letterSpacing">;

export const typography: Record<string, TypeStyle> = {
  displayAmount: { fontSize: 38, fontFamily: fontFamily.extraBold, color: colors.white, letterSpacing: -0.5 },
  title: { fontSize: 21, fontFamily: fontFamily.extraBold, color: colors.ink },
  sectionTitle: { fontSize: 17, fontFamily: fontFamily.bold, color: colors.ink },
  body: { fontSize: 15, fontFamily: fontFamily.medium, color: colors.ink },
  bodySoft: { fontSize: 13.5, fontFamily: fontFamily.medium, color: colors.inkSoft },
  label: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.inkSoft },
  caption: { fontSize: 11.5, fontFamily: fontFamily.medium, color: colors.inkSoft },
  buttonLabel: { fontSize: 16, fontFamily: fontFamily.bold, color: colors.white },
};
