import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PhoneEntryScreen } from "@/screens/onboarding/PhoneEntryScreen";
import { OtpVerificationScreen } from "@/screens/onboarding/OtpVerificationScreen";
import { PinCreationScreen } from "@/screens/onboarding/PinCreationScreen";
import { BiometricOptInScreen } from "@/screens/onboarding/BiometricOptInScreen";
import { KycCaptureScreen } from "@/screens/onboarding/KycCaptureScreen";
import { KycPendingScreen } from "@/screens/onboarding/KycPendingScreen";

export type OnboardingStackParamList = {
  PhoneEntry: undefined;
  OtpVerification: { phoneNumber: string; devOtp?: string };
  PinCreation: undefined;
  BiometricOptIn: undefined;
  KycCapture: undefined;
  KycPending: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="PinCreation" component={PinCreationScreen} />
      <Stack.Screen name="BiometricOptIn" component={BiometricOptInScreen} />
      <Stack.Screen name="KycCapture" component={KycCaptureScreen} />
      <Stack.Screen name="KycPending" component={KycPendingScreen} />
    </Stack.Navigator>
  );
}
