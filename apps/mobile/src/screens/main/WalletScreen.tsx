import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import type { TransactionSummary } from "@bingmoney/shared";
import { LedgerDirection, TransactionType } from "@bingmoney/shared";
import { BalanceCard, BottomNavBar, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { walletApi } from "@/api/wallet";
import { formatAmount } from "@/utils/formatCurrency";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { useMainNav } from "./useMainNav";

type Props = NativeStackScreenProps<MainStackParamList, "Wallet">;

export function WalletScreen({ navigation }: Props) {
  const onNavigate = useMainNav(navigation);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<TransactionSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([walletApi.getSummary(), walletApi.getHistory()]).then(([summary, txns]) => {
        if (cancelled) return;
        setBalance(summary.balance);
        setHistory(txns);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScreenContainer footer={<BottomNavBar active="wallet" onNavigate={onNavigate} />}>
      <Text style={typography.title}>Wallet</Text>

      <BalanceCard label="Solde disponible" amount={balance} />

      <View style={styles.quickGrid}>
        <QuickAction label="Recharger" onPress={() => navigation.navigate("Recharge")} icon={<PlusIcon />} />
        <QuickAction label="Transférer" onPress={() => navigation.navigate("Transfer")} icon={<SendIcon />} />
        <QuickAction label="Scanner" onPress={() => navigation.navigate("ScanToPay")} icon={<ScanIcon />} />
        <QuickAction label="Retrait" onPress={() => navigation.navigate("Withdraw")} icon={<WithdrawIcon />} />
        <QuickAction label="Crédit & data" onPress={() => navigation.navigate("Airtime")} icon={<PhoneIcon />} />
      </View>

      <Text style={typography.sectionTitle}>Historique</Text>
      <View style={styles.txList}>
        {history.length === 0 ? (
          <Text style={[typography.bodySoft, { padding: spacing.lg }]}>Aucune transaction pour le moment.</Text>
        ) : (
          history.map((txn, index) => (
            <Pressable
              key={txn.id}
              onPress={() => navigation.navigate("TransactionReceipt", { transactionId: txn.id })}
              style={[styles.txRow, index === history.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={[styles.txIcon, txn.direction === LedgerDirection.CREDIT ? styles.txIconIn : styles.txIconOut]}>
                <TxTypeIcon type={txn.type} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.body}>{txnLabel(txn)}</Text>
                <Text style={typography.caption}>{new Date(txn.createdAt).toLocaleString("fr-FR")}</Text>
              </View>
              <Text
                style={[
                  typography.body,
                  { fontWeight: "700" },
                  txn.direction === LedgerDirection.CREDIT ? { color: colors.success } : null,
                ]}
              >
                {txn.direction === LedgerDirection.CREDIT ? "+ " : "− "}
                {formatAmount(txn.amount)} F
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

function txnLabel(txn: TransactionSummary): string {
  switch (txn.type) {
    case TransactionType.TOPUP:
      return "Recharge";
    case TransactionType.TRANSFER:
      return txn.direction === LedgerDirection.CREDIT ? "Transfert reçu" : "Transfert envoyé";
    case TransactionType.WITHDRAWAL:
      return "Retrait";
    case TransactionType.PAYMENT:
      return `Paiement · ${txn.counterpartyLabel ?? "Marchand"}`;
    case TransactionType.AIRTIME_PURCHASE:
      return `Crédit · ${txn.counterpartyLabel ?? ""}`;
    default:
      return "Transaction";
  }
}

function QuickAction({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickItem} accessibilityLabel={label}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: colors.accentDark,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PlusIcon() {
  return (
    <Svg {...iconProps}>
      <Circle cx="12" cy="12" r="8.5" />
      <Line x1="12" y1="8" x2="12" y2="16" />
      <Line x1="8" y1="12" x2="16" y2="12" />
    </Svg>
  );
}
function SendIcon() {
  return (
    <Svg {...iconProps}>
      <Line x1="7" y1="17" x2="17" y2="7" />
      <Polyline points="8 7 17 7 17 16" />
    </Svg>
  );
}
function ScanIcon() {
  return (
    <Svg {...iconProps}>
      <Path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <Path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <Path d="M20 8V6a2 2 0 0 0-2-2h-2" />
      <Path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <Line x1="4" y1="12" x2="20" y2="12" />
    </Svg>
  );
}
function WithdrawIcon() {
  return (
    <Svg {...iconProps}>
      <Circle cx="12" cy="12" r="8.5" />
      <Line x1="12" y1="8" x2="12" y2="16" />
      <Polyline points="9 13 12 16 15 13" />
    </Svg>
  );
}
function PhoneIcon() {
  return (
    <Svg {...iconProps}>
      <Rect x="7" y="2.5" width="10" height="19" rx="2" />
      <Line x1="11" y1="18" x2="13" y2="18" />
    </Svg>
  );
}

function TxTypeIcon({ type }: { type: TransactionType }) {
  const props = { ...iconProps, width: 19, height: 19 };
  switch (type) {
    case TransactionType.TOPUP:
      return <PlusIcon />;
    case TransactionType.TRANSFER:
      return <SendIcon />;
    case TransactionType.WITHDRAWAL:
      return <WithdrawIcon />;
    case TransactionType.AIRTIME_PURCHASE:
      return <PhoneIcon />;
    case TransactionType.PAYMENT:
    default:
      return (
        <Svg {...props}>
          <Path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <Path d="M4 16v2a2 2 0 0 0 2 2h2" />
          <Path d="M20 8V6a2 2 0 0 0-2-2h-2" />
          <Path d="M20 16v2a2 2 0 0 1-2 2h-2" />
          <Line x1="4" y1="12" x2="20" y2="12" />
        </Svg>
      );
  }
}

const styles = StyleSheet.create({
  quickGrid: { flexDirection: "row", justifyContent: "space-between" },
  quickItem: { alignItems: "center", gap: spacing.sm, minHeight: 48, width: 66 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: colors.inkSoft, textAlign: "center" },
  txList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  txIconIn: { backgroundColor: colors.successTint },
  txIconOut: { backgroundColor: colors.accentTint },
});
