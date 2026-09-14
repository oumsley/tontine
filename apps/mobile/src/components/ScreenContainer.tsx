import React, { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

interface Props {
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Rendered outside the scroll area, pinned below it (e.g. BottomNavBar or a fixed CTA bar). */
  footer?: React.ReactNode;
}

export function ScreenContainer({ children, scroll = true, style, contentStyle, footer }: PropsWithChildren<Props>) {
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: [styles.content, contentStyle], keyboardShouldPersistTaps: "handled" as const }
    : { style: [styles.content, contentStyle] };

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={["top", "bottom"]}>
      <Body {...(bodyProps as any)}>{children}</Body>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
});
