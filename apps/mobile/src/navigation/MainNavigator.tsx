import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { WalletScreen } from "@/screens/main/WalletScreen";
import { PaymentScreen } from "@/screens/main/PaymentScreen";
import { ReceiveScreen } from "@/screens/main/ReceiveScreen";
import { ProfileScreen } from "@/screens/main/ProfileScreen";
import { RechargeScreen } from "@/screens/main/RechargeScreen";
import { TransferScreen } from "@/screens/main/TransferScreen";
import { ScanToPayScreen } from "@/screens/main/ScanToPayScreen";
import { WithdrawScreen } from "@/screens/main/WithdrawScreen";
import { AirtimeScreen } from "@/screens/main/AirtimeScreen";
import { SecurityAuthScreen } from "@/screens/main/SecurityAuthScreen";
import { ActionSuccessScreen } from "@/screens/main/ActionSuccessScreen";
import { TransactionReceiptScreen } from "@/screens/main/TransactionReceiptScreen";
import { MyTontinesScreen } from "@/screens/main/MyTontinesScreen";
import { OffersScreen } from "@/screens/main/OffersScreen";
import { ProductDetailScreen } from "@/screens/main/ProductDetailScreen";
import { SubscriptionTermsScreen } from "@/screens/main/SubscriptionTermsScreen";
import { TontineTrackingScreen } from "@/screens/main/TontineTrackingScreen";
import { NotificationsScreen } from "@/screens/main/NotificationsScreen";
import { WalletIntent } from "./walletIntents";

export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  Wallet: undefined;
  Payment: undefined;
  Receive: undefined;
  MyTontines: undefined;
  Offers: undefined;
  Recharge: undefined;
  Transfer: undefined;
  ScanToPay: undefined;
  Withdraw: undefined;
  Airtime: undefined;
  SecurityAuth: {
    intent: WalletIntent;
    targetLabel: string;
    returnTo?: keyof MainStackParamList;
  };
  ActionSuccess: { title: string; subtitle: string };
  TransactionReceipt: { transactionId: string };
  ProductDetail: { productId: string };
  SubscriptionTerms: { productId: string };
  TontineTracking: { subscriptionId: string };
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Receive" component={ReceiveScreen} />
      <Stack.Screen name="MyTontines" component={MyTontinesScreen} />
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Recharge" component={RechargeScreen} />
      <Stack.Screen name="Transfer" component={TransferScreen} />
      <Stack.Screen name="ScanToPay" component={ScanToPayScreen} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} />
      <Stack.Screen name="Airtime" component={AirtimeScreen} />
      <Stack.Screen name="SecurityAuth" component={SecurityAuthScreen} />
      <Stack.Screen name="ActionSuccess" component={ActionSuccessScreen} />
      <Stack.Screen name="TransactionReceipt" component={TransactionReceiptScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="SubscriptionTerms" component={SubscriptionTermsScreen} />
      <Stack.Screen name="TontineTracking" component={TontineTrackingScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
