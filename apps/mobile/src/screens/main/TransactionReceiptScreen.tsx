import React, { useEffect, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { LedgerDirection, TransactionType, type TransactionSummary } from "@bingmoney/shared";
import Svg, { Circle, Polyline } from "react-native-svg";
import { BackButton, Card, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { walletApi } from "@/api/wallet";
import { MainStackParamList } from "@/navigation/MainNavigator";

const TYPE_LABEL: Record<TransactionType, string> = {
  [TransactionType.TOPUP]: "Recharge",
  [TransactionType.TRANSFER]: "Transfert",
  [TransactionType.WITHDRAWAL]: "Retrait",
  [TransactionType.PAYMENT]: "Paiement",
  [TransactionType.AIRTIME_PURCHASE]: "Crédit & data",
  [TransactionType.TONTINE_CONTRIBUTION]: "Cotisation tontine",
};

type Props = NativeStackScreenProps<MainStackParamList, "TransactionReceipt">;

export function TransactionReceiptScreen({ navigation, route }: Props) {
  const [txn, setTxn] = useState<TransactionSummary | null>(null);

  useEffect(() => {
    walletApi.getTransaction(route.params.transactionId).then(setTxn);
  }, [route.params.transactionId]);

  return (
    <ScreenContainer>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Reçu</Text>

      {txn ? (
        <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg }}>
          <View style={styles.badge}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="12" cy="12" r="9" />
              <Polyline points="8 12.5 11 15.5 16 9" />
            </Svg>
          </View>
          <Text style={styles.amount}>
            {txn.direction === LedgerDirection.CREDIT ? "+ " : "− "}
            {formatAmount(txn.amount)} FCFA
          </Text>
          <Text style={typography.bodySoft}>{TYPE_LABEL[txn.type]}</Text>
        </View>
      ) : null}

      {txn ? (
        <Card>
          <ReceiptRow label="Statut" value={txn.status === "COMPLETED" ? "Terminé" : "Échoué"} />
          <ReceiptRow label="Référence" value={txn.id} />
          {txn.counterpartyLabel ? <ReceiptRow label="Contrepartie" value={txn.counterpartyLabel} /> : null}
          <ReceiptRow label="Date" value={new Date(txn.createdAt).toLocaleString("fr-FR")} />
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
      <Text style={typography.label}>{label}</Text>
      <Text style={[typography.body, { flexShrink: 1, textAlign: "right" }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = {
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.md + 4,
    backgroundColor: colors.successTint,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  amount: { fontSize: 28, fontWeight: "800" as const, color: colors.ink, letterSpacing: -0.5 },
};
