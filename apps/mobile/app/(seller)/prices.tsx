import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaretLeft, TrendUp, TrendDown, Minus, Warning } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
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
        title="Scrap Rates" 
        variant="light"
        onBack={() => safeBack('/(seller)/home')}
        rightAction={<Text variant="caption" color={colors.muted}>Hyderabad</Text>}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.bg }} // Matches page content bg
      >
        {/* Anti-gap filler for top overscroll */}
        <View style={styles.overscrollFiller} />

        {/* Dark Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.headerRow}>
            <View>
              <Text variant="caption" color={colors.muted}>LAST UPDATED</Text>
              <Text variant="label" color={colors.surface}>Today, 10:30 AM</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text variant="caption" style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Warning size={18} color={colors.amber} weight="fill" />
          <Text variant="caption" style={styles.warningText}>
            Rates are indicative and based on market averages in Hyderabad. Final value determined during pickup.
          </Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: spacing.md, // Removed as heroSection handles padding
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorExtended.tealLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  liveText: {
    color: colors.teal,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: colorExtended.amberLight,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.amber,
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginTop: -spacing.lg, // Pull up to overlap hero section
  },
  warningText: {
    flex: 1,
    color: colors.navy,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '47.5%', // Slightly less than 50% to account for gap
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
  heroSection: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 10, // Adjusted for overscroll filler alignment
    paddingBottom: 24,
  },
  overscrollFiller: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: colors.navy,
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
});
