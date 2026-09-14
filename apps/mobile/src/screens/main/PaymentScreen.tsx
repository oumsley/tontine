import React from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BackButton, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { PhoneIcon, ReceiveIcon, ScanIcon, SendIcon } from "./WalletScreen";

type Props = NativeStackScreenProps<MainStackParamList, "Payment">;

export function PaymentScreen({ navigation }: Props) {
  return (
    <ScreenContainer>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.title}>Paiement</Text>
        <Text style={typography.bodySoft}>Payer, transférer, recevoir ou acheter du crédit.</Text>
      </View>

      <View style={styles.grid}>
        <PaymentTile
          label="Transférer"
          subtitle="Compte à compte"
          icon={<SendIcon />}
          onPress={() => navigation.navigate("Transfer")}
        />
        <PaymentTile
          label="Scanner"
          subtitle="Payer un marchand"
          icon={<ScanIcon />}
          onPress={() => navigation.navigate("ScanToPay")}
        />
        <PaymentTile
          label="Recevoir"
          subtitle="Mon QR"
          icon={<ReceiveIcon />}
          onPress={() => navigation.navigate("Receive")}
        />
        <PaymentTile
          label="Crédit & data"
          subtitle="Achat"
          icon={<PhoneIcon />}
          onPress={() => navigation.navigate("Airtime")}
        />
      </View>
    </ScreenContainer>
  );
}

function PaymentTile({
  label,
  subtitle,
  icon,
  onPress,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={styles.tileIcon}>{icon}</View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    width: "47%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 6,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileLabel: { fontSize: 15, fontWeight: "700", color: colors.ink },
  tileSubtitle: { fontSize: 12, fontWeight: "500", color: colors.inkSoft },
});
