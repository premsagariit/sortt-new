/**
 * app/(aggregator)/earnings.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Earnings Dashboard — matches design Image 1
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, ArrowUp, TrendDown } from 'phosphor-react-native';
import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { BaseCard, MaterialCode } from '../../components/ui/Card';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';

export default function AggregatorEarningsScreen() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');
  const insets = useSafeAreaInsets();
  const { fetchAggregatorEarnings, earningsByPeriod, isEarningsLoading } = useAggregatorStore();

  useEffect(() => {
    void fetchAggregatorEarnings(timeRange);
  }, [timeRange, fetchAggregatorEarnings]);

  const current = earningsByPeriod[timeRange];
  const total = Number(current?.total_earned ?? 0);
  const pickups = Number(current?.orders_completed ?? 0);
  const totalWeight = Number(current?.total_weight_kg ?? 0);

  const breakdown = useMemo(() => {
    const rows = current?.material_breakdown ?? [];
    const maxAmount = rows.reduce((max, row) => Math.max(max, Number(row.amount ?? 0)), 0) || 1;
    return rows.map((row) => {
      const code = String(row.material_code || '').toLowerCase() as MaterialCode;
      return {
        material: code,
        label: code ? `${code.charAt(0).toUpperCase()}${code.slice(1)}` : 'Material',
        amount: Number(row.amount ?? 0),
        progress: Number(row.amount ?? 0) / maxAmount,
      };
    });
  }, [current]);

  const dailySeries = current?.daily_series ?? [];
  const hasAnyData = total > 0 || pickups > 0 || breakdown.length > 0 || dailySeries.length > 0;

  return (
    <View style={styles.container}>
      <NavBar
        title="Earnings"
        variant="light"
        rightAction={
          <View style={styles.headerToggle}>
            <Pressable
              style={[styles.miniToggle, timeRange === 'week' && styles.miniToggleActive]}
              onPress={() => setTimeRange('week')}
            >
              <Text variant="caption" style={[styles.miniToggleText, timeRange === 'week' && styles.miniToggleTextActive]}>
                This Week
              </Text>
            </Pressable>
            <Pressable
              style={[styles.miniToggle, timeRange === 'today' && styles.miniToggleActive]}
              onPress={() => setTimeRange('today')}
            >
              <Text variant="caption" style={[styles.miniToggleText, timeRange === 'today' && styles.miniToggleTextActive]}>
                Today
              </Text>
            </Pressable>
            <Pressable
              style={[styles.miniToggle, timeRange === 'month' && styles.miniToggleActive]}
              onPress={() => setTimeRange('month')}
            >
              <Text variant="caption" style={[styles.miniToggleText, timeRange === 'month' && styles.miniToggleTextActive]}>
                This Month
              </Text>
            </Pressable>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {isEarningsLoading && !hasAnyData ? (
          <BaseCard style={styles.heroCard}>
            <SkeletonLoader variant="list" height={60} />
          </BaseCard>
        ) : !hasAnyData ? (
          <EmptyState
            icon={<TrendDown size={48} color={colors.muted} weight="thin" />}
            heading="No earnings data yet"
            body="Completed pickups will appear here once available."
          />
        ) : (
          <>
        {/* ── Hero Metric Card ── */}
        <BaseCard style={styles.heroCard}>
          <Text variant="label" color={colors.muted} style={styles.heroDate}>{timeRange.toUpperCase()}</Text>
          <Numeric size={40} color={colors.amber} style={styles.heroAmount}>₹{total.toLocaleString('en-IN')}</Numeric>
          <Text variant="label" color={colors.slate} style={styles.heroSub}>Total earnings</Text>
          <View style={styles.trendRow}>
            <ArrowUp size={14} color={colors.teal} weight="bold" />
            <Text variant="caption" style={styles.trendText}>Live data from API</Text>
          </View>
        </BaseCard>

        {/* ── Daily Earnings Chart ── */}
        <BaseCard style={styles.chartCard}>
          <Text variant="subheading" style={styles.chartTitle}>Daily earnings</Text>
          <View style={styles.fullChart}>
            <View style={styles.barsWrap}>
              {(dailySeries.length > 0 ? dailySeries : [{ date: 'today', amount: total }]).map((entry, i, arr) => {
                const max = arr.reduce((m, item) => Math.max(m, Number(item.amount ?? 0)), 0) || 1;
                const height = Math.max(8, (Number(entry.amount ?? 0) / max) * 80);
                return (
                <View
                  key={`${entry.date}-${i}`}
                  style={[
                    styles.thinBar,
                    {
                      height,
                      backgroundColor: i === arr.length - 1 ? colors.teal : colors.border
                    }
                  ]}
                />
                );
              })}
            </View>
            <View style={styles.chartAxis}>
              <Text variant="caption">Start</Text>
              <View style={styles.todayMarker}>
                <View style={[styles.dot, { backgroundColor: colors.teal }]} />
                <Text variant="caption">Latest</Text>
              </View>
              <Text variant="caption">End</Text>
            </View>
          </View>
        </BaseCard>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <BaseCard style={styles.statCard}>
            <Numeric size={24} color={colors.amber}>{pickups}</Numeric>
            <Text variant="caption" color={colors.muted}>Pickups</Text>
          </BaseCard>

          <BaseCard style={styles.statCard}>
            <View style={styles.statValueRow}>
              <Numeric size={24} color={colors.navy}>{totalWeight.toLocaleString('en-IN')}</Numeric>
              <Text variant="body" style={styles.unitText}>kg</Text>
            </View>
            <Text variant="caption" color={colors.muted}>Weight collected</Text>
          </BaseCard>
        </View>

        {/* ── Material Breakdown ── */}
        <BaseCard style={styles.breakdownCard}>
          <Text variant="subheading" style={styles.breakdownTitle}>By material</Text>
          <View style={styles.breakdownList}>
            {breakdown.map((item) => (
              <View key={item.material} style={styles.matRow}>
                <View style={styles.matIconWrap}>
                  <Package size={20} color={colors.muted} />
                </View>
                <Text variant="label" style={styles.matLabel}>{item.label}</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${item.progress * 100}%`, backgroundColor: colors.material[item.material]?.fg ?? colors.teal }]} />
                  </View>
                </View>
                <Numeric color={colors.amber} style={styles.matAmount}>₹{item.amount.toLocaleString()}</Numeric>
              </View>
            ))}
          </View>
        </BaseCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28,46,74,0.08)',
    borderRadius: 20,
    padding: 2,
    marginRight: spacing.sm,
  },
  miniToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 18,
  },
  miniToggleActive: {
    backgroundColor: colors.red,
  },
  miniToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate,
  },
  miniToggleTextActive: {
    color: '#fff',
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  heroDate: {
    marginBottom: spacing.xs,
  },
  heroAmount: {
    marginBottom: 4,
  },
  heroSub: {
    marginBottom: spacing.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    color: colors.teal,
    fontWeight: '700',
  },
  chartCard: {
    padding: spacing.md,
  },
  chartTitle: {
    marginBottom: spacing.md,
  },
  fullChart: {
    gap: spacing.sm,
  },
  barsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  thinBar: {
    width: 4,
    borderRadius: 2,
  },
  chartAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  todayMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  breakdownCard: {
    padding: spacing.md,
  },
  breakdownTitle: {
    marginBottom: spacing.md,
  },
  breakdownList: {
    gap: spacing.lg,
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  matIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matLabel: {
    width: 60,
  },
  progressContainer: {
    flex: 1,
  },
  track: {
    height: 6,
    backgroundColor: '#EEF2F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  matAmount: {
    width: 70,
    textAlign: 'right',
  },
});
