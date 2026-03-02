import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Info, Warning } from 'phosphor-react-native';
import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { MarketRateCard, MaterialCode } from '../../components/ui/Card';
import { safeBack } from '../../utils/navigation';

const MOCK_RATES: { id: string; material: string; price: number; trend: string; materialCode: MaterialCode }[] = [
  { id: '1', material: 'Iron scrap', price: 28, trend: 'up', materialCode: 'metal' },
  { id: '2', material: 'Cardboard', price: 10, trend: 'flat', materialCode: 'paper' },
  { id: '3', material: 'Plastic (PET)', price: 12, trend: 'down', materialCode: 'plastic' },
  { id: '4', material: 'Newspaper', price: 14, trend: 'up', materialCode: 'paper' },
  { id: '5', material: 'Copper wire', price: 420, trend: 'up', materialCode: 'metal' },
  { id: '6', material: 'Aluminum', price: 110, trend: 'flat', materialCode: 'metal' },
];

export default function MarketRatesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <NavBar
        title="Average Local Rates"
        variant="light"
        onBack={() => safeBack('/(seller)/home')}
        rightAction={
          <View style={styles.localityTag}>
            <View style={styles.liveDot} />
            <Numeric size={11} color={colors.muted}>LIVE · HYD</Numeric>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.bg }}
      >
        {/* Locality Average Hint */}
        <View style={styles.hintCard}>
          <Info size={20} color={colors.amber} weight="fill" />
          <View style={styles.hintTextWrap}>
            <Text variant="label" color={colors.navy}>Locality Average</Text>
            <Text variant="caption">These rates are averaged from all certified aggregators in Hyderabad. Rates may vary slightly by collector.</Text>
          </View>
        </View>

        {/* Materials Grid */}
        <View style={styles.grid}>
          {MOCK_RATES.map((item) => (
            <View key={item.id} style={styles.gridItem}>
              <MarketRateCard
                material={item.material}
                materialCode={item.materialCode}
                ratePerKg={item.price}
                trend={item.trend as any}
              />
            </View>
          ))}
        </View>

        {/* Ad Banner */}
        <View style={styles.adBanner}>
          <Text variant="caption" style={styles.adTag}>SPONSORED</Text>
          <Text variant="subheading" color={colors.surface}>Sell directly to top processors</Text>
          <Text variant="caption" style={styles.adSub}>Higher rates for bulk plastic & e-waste</Text>
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
    paddingBottom: spacing.xxl,
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
  },
  gridItem: {
    width: '47.5%',
  },
  adBanner: {
    marginTop: spacing.xl,
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