import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { OnboardingNavigator } from "@/navigation/OnboardingNavigator";
import { colors, fontFamily } from "@/theme";

// Apply Inter as the default Text font app-wide once loaded, so screens
// don't have to set fontFamily on every plain <Text> individually.
const AnyText = Text as unknown as { defaultProps?: { style?: unknown } };
function applyDefaultFont() {
  AnyText.defaultProps = AnyText.defaultProps ?? {};
  AnyText.defaultProps.style = [{ fontFamily: fontFamily.regular }, AnyText.defaultProps.style];
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  applyDefaultFont();

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <OnboardingNavigator />
    </NavigationContainer>
  );
}
