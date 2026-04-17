import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Info, Warning } from 'phosphor-react-native';
import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { safeBack } from '../../utils/navigation';
import { MaterialCode } from '../../components/ui/MaterialChip';
import { SellerMaterialCard } from '../../components/ui/SellerMaterialCard';
import { useSellerMaterialRates } from '../../hooks/useSellerMaterialRates';

export default function MarketRatesScreen() {
  const { rates, cityCode, loading, reloadRates } = useSellerMaterialRates();
  const MATERIALS: MaterialCode[] = ['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass'];

  useFocusEffect(useCallback(() => { reloadRates(true); }, [reloadRates]));

  return (
    <View style={styles.container}>
      <NavBar
        title="Average Local Rates"
        variant="light"
        onBack={() => safeBack('/(seller)/home')}
        rightAction={
          <View style={styles.localityTag}>
            <View style={styles.liveDot} />
            <Numeric size={11} color={colors.muted}>LIVE · {cityCode}</Numeric>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.bg }}
        showsVerticalScrollIndicator={false}
      >
        {/* Locality Average Hint */}
        <View style={styles.hintCard}>
          <Info size={20} color={colors.amber} weight="fill" />
          <View style={styles.hintTextWrap}>
            <Text variant="label" color={colors.navy}>Locality Average</Text>
              <Text variant="caption">These rates are averaged from active aggregators in your city.</Text>
          </View>
        </View>

        {/* Rates Grid */}
        {loading ? (
          <View style={styles.grid}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <View key={`skeleton-${idx}`} style={styles.gridItem}>
                <SkeletonLoader variant="card" height={118} />
              </View>
            ))}
          </View>
        ) : rates.length === 0 ? (
          <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', marginTop: 40 }}>
            Rates unavailable — check back soon.
          </Text>
        ) : (
          <View style={styles.grid}>
            {MATERIALS.map((code) => {
              const item = rates.find((entry) => entry.material_code === code);
              const isAvailable = Boolean(item?.is_available && item?.rate_per_kg != null);

              return (
                <View key={code} style={styles.gridItem}>
                  <SellerMaterialCard
                    code={code}
                    isSelected={false}
                    isDisabled={!isAvailable}
                    ratePerKg={item?.rate_per_kg ?? null}
                    trend={item?.trend ?? 'flat'}
                    helpText="no aggregator is ready to accept this material."
                    onPress={() => {}}
                    style={styles.materialCard}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Ad Banner */}
        <View style={styles.adBanner}>
          <Text variant="caption" style={styles.adTag}>SPONSORED</Text>
          <Text variant="subheading" color={colors.surface}>Sell directly to top processors</Text>
          <Text variant="caption" style={styles.adSub}>Higher rates for bulk plastic &amp; e-waste</Text>
          <Pressable style={styles.adBtn}>
            <Text variant="caption" style={styles.adBtnText}>Learn More</Text>
          </Pressable>
        </View>

        <View style={styles.disclaimerBox}>
          <Warning size={14} color={colors.muted} />
          <Text variant="caption" color={colors.muted} style={styles.disclaimerText}>
            Final rates are determined during the physical inspection and weighing process at your location.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  localityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  hintCard: {
    flexDirection: 'row',
    backgroundColor: colors.amberLight,
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(183,121,31,0.1)',
  },
  hintTextWrap: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: '47.5%',
    aspectRatio: 1,
  },
  materialCard: {
    width: '100%',
    height: '100%',
    marginBottom: 0,
  },
  adBanner: {
    marginTop: spacing.sm,
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  adTag: {
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    fontWeight: '700',
    fontSize: 9,
    marginBottom: 4,
  },
  adSub: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  adBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  adBtnText: {
    color: colors.surface,
    fontWeight: '700',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  disclaimerText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
