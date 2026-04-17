import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Warning, Robot, TrendDown } from 'phosphor-react-native';

import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { safeBack } from '../../utils/navigation';
import { api } from '../../lib/api';
import { EmptyState } from '../../components/ui/EmptyState';
import { getRealtimeClient } from '../../lib/realtime';
import { useAuthStore } from '../../store/authStore';

type PriceIndexItem = {
  id: string;
  label: string;
  subLabel: string;
  price: number;
  changePercent: number | null;
  trend: 'up' | 'down' | 'stable';
  trendText: string;
  icon: string;
  bg: string;
};

export default function PriceIndexScreen() {
  const token = useAuthStore((s) => s.token);
  const [priceData, setPriceData] = React.useState<PriceIndexItem[]>([]);

  const loadRates = React.useCallback(async () => {
    try {
      const res = await api.get('/api/rates');
      const mapped: PriceIndexItem[] = (res.data?.rates ?? []).map((rate: any, index: number) => ({
        id: String(rate.id ?? rate.material_code ?? index),
        label: String(rate.material_code ?? 'material').toUpperCase(),
        subLabel: 'AI/Admin market index',
        price: Number(rate.rate_per_kg ?? 0),
        changePercent: rate.change_percent != null ? Number(rate.change_percent) : null,
        trend: rate.trend ?? 'stable',
        trendText: rate.trend === 'up' ? 'Up' : rate.trend === 'down' ? 'Down' : 'Stable',
        icon: '*',
        bg: '#F3F4F6',
      }));
      setPriceData(mapped);
    } catch {
      setPriceData([]);
    }
  }, []);

  React.useEffect(() => {
    void loadRates();
  }, [loadRates]);

  useFocusEffect(
    React.useCallback(() => {
      void loadRates();
      return () => {};
    }, [loadRates])
  );

  React.useEffect(() => {
    if (!token) return () => {};

    const channel = getRealtimeClient().channels.get('rates:hyd:index');
    try {
      channel.subscribe('rates_updated', () => {
        void loadRates();
      });
    } catch (error) {
      console.warn('[PriceIndex] rates channel subscribe failed', error);
      void loadRates();
    }

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        // no-op
      }
      void channel.detach().catch(() => {});
    };
  }, [token, loadRates]);

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return colors.teal;
      case 'down':
        return colors.red;
      default:
        return colors.muted;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Market Price Index" variant="light" onBack={() => safeBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="caption" color={colors.muted}>
              Hyderabad - AI/Admin reference feed
            </Text>
          </View>
          <View style={styles.aiPill}>
            <View style={styles.aiDot} />
            <Text style={styles.aiText}>AI Updated</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Robot size={20} color={colors.navy} weight="fill" />
          <Text variant="caption" style={styles.infoText}>
            This page shows market index rates from AI updates and admin overrides via /api/rates.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {priceData.length === 0 ? (
            <View style={{ paddingVertical: spacing.xl }}>
              <EmptyState
                icon={<TrendDown size={48} color={colors.muted} weight="thin" />}
                heading="No rate data available"
                body="Unable to load live rate index right now."
              />
            </View>
          ) : (
            priceData.map((item, index) => (
              <View key={item.id} style={[styles.row, index === priceData.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>

                <View style={styles.labelWrap}>
                  <Text variant="body" style={styles.label}>
                    {item.label}
                  </Text>
                  {item.subLabel !== '' && <Text variant="caption" color={colors.muted}>{item.subLabel}</Text>}
                </View>

                <View style={styles.priceWrap}>
                  <Numeric size={13} style={styles.priceRange}>
                    Rs {item.price}/kg
                  </Numeric>
                  <Text variant="caption" style={[styles.trendText, { color: getTrendColor(item.trend) }]}>
                    {(item.changePercent ?? 0) > 0 ? '+' : ''}{Number(item.changePercent ?? 0).toFixed(2)}%
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.warningBanner}>
          <Warning size={20} color={colors.amber} weight="fill" />
          <Text variant="caption" style={styles.warningText}>
            This index is for market reference only. Set your own purchase rates in "My Buy Rates".
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
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#166534',
  },
  aiText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FC',
    padding: spacing.md,
    borderRadius: radius.card,
    gap: 10,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
    color: colors.slate,
  },
  listContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    fontFamily: 'DMSans-Bold',
    color: colors.navy,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceRange: {
    color: colors.amber,
    fontFamily: 'DMMono-Medium',
  },
  trendText: {
    fontSize: 11,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: colors.amberLight,
    padding: spacing.md,
    borderRadius: radius.card,
    gap: 10,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  warningText: {
    flex: 1,
    lineHeight: 18,
    color: colors.slate,
  },
});
