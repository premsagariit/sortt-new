/**
 * components/ui/Card.tsx
 * ──────────────────────────────────────────────────────────────────
 * Card components — zero shadows by design.
 * Hierarchy is achieved through background contrast only:
 *   colors.bg (page) → colors.surface (card) → subtle variants
 *
 * Exports:
 *   BaseCard       — foundational card shell (radius.card, 1px border, surface bg)
 *   OrderCard      — extends BaseCard. Contains StatusChip + MaterialChip + amount
 *   MarketRateCard — material label + ₹/kg rate + trend indicator
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../constants/tokens';
import { Text, Numeric } from './Typography';
import { StatusChip } from './StatusChip';
import { MaterialChip } from './MaterialChip';
import { TrendUp, TrendDown, Minus } from 'phosphor-react-native';

// ─────────────────────────────────────────────────────────────────────────────
// BaseCard
// ─────────────────────────────────────────────────────────────────────────────
interface BaseCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BaseCard({ children, style }: BaseCardProps) {
  return (
    <View style={[styles.base, style]}>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'created'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'weighing_in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type MaterialCode = 'metal' | 'plastic' | 'paper' | 'ewaste' | 'fabric' | 'glass';

interface OrderCardProps {
  /** Order ID — rendered in DM Mono */
  orderId: string;
  status: OrderStatus;
  materials: MaterialCode[];
  /** Total amount in rupees — rendered in DM Mono */
  amountRupees: number;
  /** Locality string (pre-acceptance: "Banjara Hills area", post: full address) */
  locality?: string;
  /** Aggregator name string (e.g. "Suresh Metals & More") */
  aggregator?: string;
  /** Date string to show in footer */
  date?: string;
  style?: ViewStyle;
}

export function OrderCard({
  orderId,
  status,
  materials,
  amountRupees,
  locality,
  aggregator,
  date,
  style,
}: OrderCardProps) {
  const isCompleted = status === 'completed';
  const isActive = ['created', 'accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(status);
  
  const statusColor = isCompleted ? colors.teal : colors.amber;

  const statusText = 
    status === 'created' ? 'Waiting for aggregator' :
    status === 'completed' ? `by ${aggregator || 'Aggregator'}` :
    aggregator ? `${aggregator}` :
    'Waiting for aggregator';

  return (
    <BaseCard style={[{ padding: 0, overflow: 'hidden' }, style] as any}>
      <View style={{ height: 4, backgroundColor: ['cancelled', 'disputed'].includes(status) ? colors.border : statusColor }} />
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        {/* ── Header row: Order ID + Status ── */}
        <View style={styles.orderHeader}>
          <View>
            <Text variant="subheading" color={colors.navy}>
              #{orderId.slice(0, 8).toUpperCase()}
            </Text>
            <Text variant="caption" style={{ color: ['cancelled', 'disputed'].includes(status) ? colors.muted : statusColor, fontWeight: '600', marginTop: 2 } as any}>
              {statusText}
            </Text>
          </View>

          <StatusChip status={status} />
        </View>

        {/* ── Materials row ── */}
        <View style={styles.materialsRow}>
          {materials.map((m) => (
            <MaterialChip key={m} material={m} variant="chip" />
          ))}
        </View>

        {/* ── Footer: locality/aggregator/date + amount ── */}
        <View style={styles.orderFooter}>
          <View style={styles.footerLeft}>
            <Text variant="caption" color={colors.muted} numberOfLines={1}>
              {isCompleted ? 'Paid to wallet' : `Est. ₹${amountRupees} value`}
            </Text>
            {date && (
              <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
                {date}
              </Text>
            )}
          </View>
          <Numeric size={24} color={isCompleted ? colors.teal : colors.navy} style={styles.amount}>
            ₹{amountRupees.toLocaleString('en-IN')}
          </Numeric>
        </View>
      </View>
    </BaseCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MarketRateCard
// ─────────────────────────────────────────────────────────────────────────────
type TrendDirection = 'up' | 'down' | 'flat';

interface MarketRateCardProps {
  /** Material name to display — e.g. "Metal", "Plastic" */
  material: string;
  materialCode: MaterialCode;
  /** Rate in ₹ per kg — used when rateDisplay is not provided */
  ratePerKg: number;
  /**
   * Override display string for the rate — e.g. "₹28–650" for a range.
   * When provided, ratePerKg is ignored for display (but kept for sorting/logic).
   */
  rateDisplay?: string;
  trend?: TrendDirection;
  style?: ViewStyle;
}

export function MarketRateCard({
  material,
  ratePerKg,
  rateDisplay,
  trend = 'flat',
  style,
}: MarketRateCardProps) {
  return (
    <BaseCard style={[styles.rateCard, style] as any}>
      <Text variant="label" color={colors.slate}>{material}</Text>

      <View style={styles.rateRow}>
        <Numeric size={20} color={colors.amber}>
          {rateDisplay ?? `₹${ratePerKg.toFixed(0)}`}
        </Numeric>
        {/* Only show /kg suffix when displaying a single rate (not a range) */}
        {!rateDisplay && (
          <Text variant="caption" color={colors.muted} style={styles.rateUnit}>/kg</Text>
        )}

        {/* Trend arrow using Phosphor icons */}
        <View style={styles.trendPlaceholder}>
          {trend === 'up' ? (
            <TrendUp size={18} color={colors.teal} weight="bold" />
          ) : trend === 'down' ? (
            <TrendDown size={18} color={colors.red} weight="bold" />
          ) : (
            <Minus size={18} color={colors.muted} weight="bold" />
          )}
        </View>
      </View>
    </BaseCard>
  );
}

function trendColor(trend: TrendDirection): string {
  if (trend === 'up')   return colors.teal;
  if (trend === 'down') return colors.red;
  return colors.muted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border,
    // Zero shadows — hierarchy via background contrast only (MEMORY.md §2)
    elevation:       0,
    shadowOpacity:   0,
    padding:         spacing.md,
  },

  // OrderCard
  orderCard: {
    gap: spacing.sm,
  },
  orderHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  materialsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.xs,
  },
  orderFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-end',
    marginTop:      spacing.xs,
  },
  footerLeft: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 2,
  },
  locality: {
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    fontFamily: 'DMMono-Medium',
  },

  // MarketRateCard
  rateCard: {
    gap: spacing.xs,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           4,
  },
  rateUnit: {
    marginBottom: 2,
  },
  trendPlaceholder: {
    marginLeft: spacing.xs,
  },
});
