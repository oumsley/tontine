import React, { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";
import { ContributionFrequency, type ProductDetail } from "@bingmoney/shared";
import { BackButton, Button, Card, ScreenContainer } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { catalogApi } from "@/api/catalog";
import { MainStackParamList } from "@/navigation/MainNavigator";

const FREQUENCY_LABEL: Record<ContributionFrequency, string> = {
  [ContributionFrequency.WEEKLY]: "par semaine",
  [ContributionFrequency.BIWEEKLY]: "toutes les 2 semaines",
  [ContributionFrequency.MONTHLY]: "par mois",
};

const DURATION_UNIT: Record<ContributionFrequency, string> = {
  [ContributionFrequency.WEEKLY]: "semaines",
  [ContributionFrequency.BIWEEKLY]: "cycles",
  [ContributionFrequency.MONTHLY]: "mois",
};

type Props = NativeStackScreenProps<MainStackParamList, "ProductDetail">;

export function ProductDetailScreen({ navigation, route }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);

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

  return (
    <ScreenContainer
      footer={
        <View style={styles.bottomBar}>
          {product.eligibility.eligible ? (
            <>
              <Button
                label="Souscrire"
                onPress={() => navigation.navigate("SubscriptionTerms", { productId: product.id })}
              />
              <Text style={styles.bottomNote}>Sans engagement · réponse immédiate</Text>
            </>
          ) : (
            <View style={styles.ineligibleBox}>
              <Text style={styles.ineligibleTitle}>Conditions non remplies</Text>
              {product.eligibility.reasons.map((reason) => (
                <Text key={reason} style={styles.ineligibleReason}>
                  • {reason}
                </Text>
              ))}
            </View>
          )}
        </View>
      }
    >
      <BackButton onPress={() => navigation.goBack()} />

      <View style={styles.hero}>
        <View style={styles.themeIcon}>
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M22 10L12 5 2 10l10 5 10-5z" />
            <Path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
          </Svg>
        </View>
        {product.theme ? (
          <View style={styles.themeTag}>
            <Text style={styles.themeTagLabel}>Objectif : {product.theme}</Text>
          </View>
        ) : null}
        <View>
          <Text style={typography.title}>{product.name}</Text>
          <Text style={typography.bodySoft}>{product.totalSlots} places au total</Text>
        </View>
      </View>

      <View style={styles.focalCard}>
        <Text style={styles.focalLabel}>Cotisation</Text>
        <Text style={styles.focalAmount}>{formatAmount(product.contributionAmount)} FCFA</Text>
        <Text style={styles.focalFreq}>{FREQUENCY_LABEL[product.frequency]}</Text>
      </View>

      <View style={styles.infoGrid}>
        <InfoTile
          icon={
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="12" cy="12" r="8.5" />
              <Polyline points="12 7.5 12 12 15.5 14" />
            </Svg>
          }
          label="Durée totale"
          value={`${product.totalSlots} ${DURATION_UNIT[product.frequency]}`}
        />
        <InfoTile
          icon={
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="12" cy="8" r="3.4" />
              <Path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
            </Svg>
          }
          label="Places restantes"
          value={`${product.availableSlots} / ${product.totalSlots}`}
        />
        <InfoTile
          icon={
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
            </Svg>
          }
          label="Trust Score requis"
          value={`${product.minTrustScore} / 100`}
        />
        <InfoTile
          icon={
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.accentDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="4" y="4" width="16" height="16" rx="3" />
              <Path d="M12 8v4l3 2" />
            </Svg>
          }
          label="Pénalité de retard"
          value={`${penaltyRate}% après ${product.lateGracePeriodDays}j`}
        />
      </View>

      <Card>
        <Text style={typography.sectionTitle}>À propos de ce groupe</Text>
        <Text style={typography.bodySoft}>{product.description}</Text>
      </Card>
    </ScreenContainer>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={typography.caption}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.accentTint,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  themeTag: { backgroundColor: "rgba(255,255,255,0.7)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full, alignSelf: "flex-start" },
  themeTagLabel: { fontSize: 12, fontWeight: "700", color: colors.accentDark },
  focalCard: {
    backgroundColor: colors.accentDark,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: 4,
  },
  focalLabel: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.72)" },
  focalAmount: { fontSize: 30, fontWeight: "800", color: colors.white, letterSpacing: -0.5 },
  focalFreq: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  infoTile: {
    width: "47%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: 6,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  infoValue: { fontSize: 15.5, fontWeight: "700", color: colors.ink },
  bottomBar: { padding: spacing.xl, gap: spacing.sm },
  bottomNote: { textAlign: "center", fontSize: 12, color: colors.inkFaint, fontWeight: "500" },
  ineligibleBox: {
    backgroundColor: colors.dangerTint,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: 4,
  },
  ineligibleTitle: { fontSize: 13, fontWeight: "700", color: colors.danger },
  ineligibleReason: { fontSize: 13, color: colors.danger },
});
