import React, { useCallback, useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { ContributionFrequency, TontineKind, type ProductSummary } from "@bingmoney/shared";
import { BackButton, ScreenContainer, TextField } from "@/components";
import { colors, fontFamily, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { catalogApi } from "@/api/catalog";
import { MainStackParamList } from "@/navigation/MainNavigator";

const FREQUENCY_LABEL: Record<ContributionFrequency, string> = {
  [ContributionFrequency.WEEKLY]: "/ semaine",
  [ContributionFrequency.BIWEEKLY]: "/ 2 semaines",
  [ContributionFrequency.MONTHLY]: "/ mois",
};

type CategoryTab = "ALL" | TontineKind;

const TABS: { key: CategoryTab; label: string }[] = [
  { key: "ALL", label: "Tout" },
  { key: TontineKind.CLASSIQUE, label: "Argent" },
  { key: TontineKind.PROJET, label: "Biens" },
];

type Props = NativeStackScreenProps<MainStackParamList, "Offers">;

export function OffersScreen({ navigation }: Props) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<CategoryTab>("ALL");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      catalogApi.listProducts().then((res) => {
        if (!cancelled) setProducts(res);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (tab !== "ALL" && p.kind !== tab) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.theme ?? "").toLowerCase().includes(q);
    });
  }, [products, query, tab]);

  return (
    <ScreenContainer>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={typography.title}>Les Offres</Text>
      <TextField label="Rechercher" value={query} onChangeText={setQuery} placeholder="Thème, nom du groupe…" />

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, selected && styles.tabSelected]}>
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.md }}>
        {filtered.length === 0 ? (
          <Text style={typography.bodySoft}>Aucune tontine ne correspond à votre recherche.</Text>
        ) : (
          filtered.map((product) => (
            <Pressable
              key={product.id}
              onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                {product.theme ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>{product.theme}</Text>
                  </View>
                ) : (
                  <View style={styles.badgeOutline}>
                    <Text style={styles.badgeOutlineLabel}>
                      {product.kind === TontineKind.CLASSIQUE ? "Argent" : "Biens"}
                    </Text>
                  </View>
                )}
                <Text style={typography.caption}>{product.availableSlots} place(s) restante(s)</Text>
              </View>
              <Text style={typography.sectionTitle}>{product.name}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>
                  {formatAmount(product.contributionAmount)} F{" "}
                  <Text style={typography.caption}>{FREQUENCY_LABEL[product.frequency]}</Text>
                </Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.inkFaint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Polyline points="9 6 15 12 9 18" />
                </Svg>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: "row", gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSelected: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  tabLabel: { fontSize: 13.5, fontFamily: fontFamily.semiBold, color: colors.inkSoft },
  tabLabelSelected: { color: colors.accentDark },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { backgroundColor: colors.accentTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  badgeLabel: { fontSize: 12, fontWeight: "700", color: colors.accentDark },
  badgeOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  badgeOutlineLabel: { fontSize: 12, fontWeight: "700", color: colors.inkSoft },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 15, fontWeight: "700", color: colors.ink },
});
