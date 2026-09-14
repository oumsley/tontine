import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { WalletScreen } from "@/screens/main/WalletScreen";
import {
  CataloguePlaceholderScreen,
  ProfilePlaceholderScreen,
  TrustPlaceholderScreen,
} from "@/screens/main/PlaceholderScreen";
import { RechargeScreen } from "@/screens/main/RechargeScreen";
import { TransferScreen } from "@/screens/main/TransferScreen";
import { ScanToPayScreen } from "@/screens/main/ScanToPayScreen";
import { WithdrawScreen } from "@/screens/main/WithdrawScreen";
import { AirtimeScreen } from "@/screens/main/AirtimeScreen";
import { SecurityAuthScreen } from "@/screens/main/SecurityAuthScreen";
import { ActionSuccessScreen } from "@/screens/main/ActionSuccessScreen";
import { TransactionReceiptScreen } from "@/screens/main/TransactionReceiptScreen";
import { WalletIntent } from "./walletIntents";

export type MainStackParamList = {
  Home: undefined;
  Wallet: undefined;
  CataloguePlaceholder: undefined;
  TrustPlaceholder: undefined;
  ProfilePlaceholder: undefined;
  Recharge: undefined;
  Transfer: undefined;
  ScanToPay: undefined;
  Withdraw: undefined;
  Airtime: undefined;
  SecurityAuth: { intent: WalletIntent; targetLabel: string };
  ActionSuccess: { title: string; subtitle: string };
  TransactionReceipt: { transactionId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="CataloguePlaceholder" component={CataloguePlaceholderScreen} />
      <Stack.Screen name="TrustPlaceholder" component={TrustPlaceholderScreen} />
      <Stack.Screen name="ProfilePlaceholder" component={ProfilePlaceholderScreen} />
      <Stack.Screen name="Recharge" component={RechargeScreen} />
      <Stack.Screen name="Transfer" component={TransferScreen} />
      <Stack.Screen name="ScanToPay" component={ScanToPayScreen} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} />
      <Stack.Screen name="Airtime" component={AirtimeScreen} />
      <Stack.Screen name="SecurityAuth" component={SecurityAuthScreen} />
      <Stack.Screen name="ActionSuccess" component={ActionSuccessScreen} />
      <Stack.Screen name="TransactionReceipt" component={TransactionReceiptScreen} />
    </Stack.Navigator>
  );
}
