import React, { useCallback, useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { ContributionFrequency, TontineKind, type ProductSummary } from "@bingmoney/shared";
import { BottomNavBar, ScreenContainer, TextField } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";
import { formatAmount } from "@/utils/formatCurrency";
import { catalogApi } from "@/api/catalog";
import { MainStackParamList } from "@/navigation/MainNavigator";
import { useMainNav } from "./useMainNav";

const FREQUENCY_LABEL: Record<ContributionFrequency, string> = {
  [ContributionFrequency.WEEKLY]: "/ semaine",
  [ContributionFrequency.BIWEEKLY]: "/ 2 semaines",
  [ContributionFrequency.MONTHLY]: "/ mois",
};

type Props = NativeStackScreenProps<MainStackParamList, "Catalogue">;

export function CatalogueScreen({ navigation }: Props) {
  const onNavigate = useMainNav(navigation);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [query, setQuery] = useState("");

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
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.theme ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  return (
    <ScreenContainer footer={<BottomNavBar active="catalogue" onNavigate={onNavigate} />}>
      <Text style={typography.title}>Catalogue</Text>
      <TextField label="Rechercher" value={query} onChangeText={setQuery} placeholder="Thème, nom du groupe…" />

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
                      {product.kind === TontineKind.CLASSIQUE ? "Classique" : "Projet"}
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
