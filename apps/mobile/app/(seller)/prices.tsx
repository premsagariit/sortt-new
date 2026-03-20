import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Info, Warning, CaretUp, CaretDown, Minus } from 'phosphor-react-native';
import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { safeBack } from '../../utils/navigation';
import { api } from '../../lib/api';

interface RateEntry {
  material_code: string;
  name: string;
  rate_per_kg: number;
  trend: 'up' | 'down' | 'flat';
}

export default function MarketRatesScreen() {
  const router = useRouter();
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRates = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/rates');
      setRates(res.data.rates || []);
    } catch {
      /* non-fatal — empty state shown */
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  // Refresh on tab focus
  useFocusEffect(useCallback(() => { loadRates(true); }, [loadRates]));

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
        showsVerticalScrollIndicator={false}
      >
        {/* Locality Average Hint */}
        <View style={styles.hintCard}>
          <Info size={20} color={colors.amber} weight="fill" />
          <View style={styles.hintTextWrap}>
            <Text variant="label" color={colors.navy}>Locality Average</Text>
            <Text variant="caption">These rates are averaged from all certified aggregators in Hyderabad. Rates may vary slightly by collector.</Text>
          </View>
        </View>

        {/* Rates Grid */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.muted} style={{ marginTop: 40 }} />
        ) : rates.length === 0 ? (
          <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', marginTop: 40 }}>
            Rates unavailable — check back soon.
          </Text>
        ) : (
          <View style={styles.grid}>
            {rates.map((item) => (
              <View key={item.material_code} style={styles.gridItem}>
                <View style={styles.rateCard}>
                  <View style={styles.rateHeader}>
                    <Text variant="label" color={colors.navy}>{item.name}</Text>
                    {item.trend === 'up'
                      ? <CaretUp size={16} color={colors.teal} weight="bold" />
                      : item.trend === 'down'
                      ? <CaretDown size={16} color={colors.red} weight="bold" />
                      : <Minus size={16} color={colors.muted} weight="bold" />}
                  </View>
                  <Numeric size={20} color={colors.navy} style={{ marginTop: spacing.xs }}>
                    ₹{item.rate_per_kg}
                  </Numeric>
                  <Text variant="caption" color={colors.muted}>per kg</Text>
                </View>
              </View>
            ))}
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
  },
  rateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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