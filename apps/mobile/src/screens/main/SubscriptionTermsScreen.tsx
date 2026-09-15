import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { ContributionFrequency, type ProductDetail } from "@bingmoney/shared";
import { BackButton, Button, Card, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { catalogApi } from "@/api/catalog";
import { MainStackParamList } from "@/navigation/MainNavigator";

const FREQUENCY_LABEL: Record<ContributionFrequency, string> = {
  [ContributionFrequency.WEEKLY]: "Chaque semaine",
  [ContributionFrequency.BIWEEKLY]: "Toutes les 2 semaines",
  [ContributionFrequency.MONTHLY]: "Chaque mois",
};

type Props = NativeStackScreenProps<MainStackParamList, "SubscriptionTerms">;

export function SubscriptionTermsScreen({ navigation, route }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [accepted, setAccepted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      catalogApi.getProduct(route.params.productId).then((res) => {
        if (!cancelled) setProduct(res);
      });
      return () => {
        cancelled = true;
      };
    }, [route.params.productId]),
  );

  if (!product) {
    return (
      <ScreenContainer>
        <BackButton onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const penaltyRate = (product.latePenaltyRateBps / 100).toString().replace(/\.0$/, "");

  function handleConfirm() {
    if (!product?.joinableGroupId) return;
    navigation.navigate("SecurityAuth", {
      intent: { kind: "SUBSCRIBE", groupId: product.joinableGroupId, amount: product.contributionAmount },
      targetLabel: product.name,
      returnTo: "Home",
    });
  }

  return (
    <ScreenContainer
      footer={
        <View style={{ padding: spacing.xl }}>
          <Button label="Confirmer l'adhésion" onPress={handleConfirm} disabled={!accepted} />
        </View>
      }
    >
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Conditions d'adhésion</Text>
      <Text style={typography.bodySoft}>
        Relisez attentivement les conditions de "{product.name}" avant de confirmer.
      </Text>

      <Card>
        <TermRow label="Cotisation" value={`${formatAmount(product.contributionAmount)} FCFA`} />
        <TermRow label="Fréquence" value={FREQUENCY_LABEL[product.frequency]} />
        <TermRow label="Durée totale" value={`${product.totalSlots} cycles`} />
        <TermRow label="Pénalité de retard" value={`${penaltyRate}% après ${product.lateGracePeriodDays} jour(s)`} />
        <TermRow label="Premier prélèvement" value="Immédiat, à la confirmation" />
      </Card>

      <Text style={typography.bodySoft}>
        BingMoney supervise ce groupe : le décaissement à votre tour est automatique, et tout retard de
        paiement est visible dans votre historique et impacte votre Trust Score.
      </Text>

      <Pressable onPress={() => setAccepted((v) => !v)} style={styles.checkboxRow}>
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted ? (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Polyline points="20 6 9 17 4 12" />
            </Svg>
          ) : null}
        </View>
        <Text style={[typography.body, { flex: 1 }]}>
          J'ai lu et j'accepte les conditions de ce groupe (montant, fréquence, pénalités, durée).
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={typography.label}>{label}</Text>
      <Text style={typography.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
});
