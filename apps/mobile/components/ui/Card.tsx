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

// Re-export canonical types so existing consumers of Card.tsx keep working
export type { OrderStatus } from '../../store/orderStore';
export type { MaterialCode } from './MaterialChip';
import type { OrderStatus } from '../../store/orderStore';
import type { DisputeStatus } from '../../store/orderStore';
import type { MaterialCode } from './MaterialChip';

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
interface OrderCardProps {
  /** Internal order ID (UUID) */
  orderId: string;
  /** UI display order number, e.g. #000042 */
  orderNumber?: string;
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
  disputeStatus?: DisputeStatus | null;
  style?: ViewStyle;
}

export function OrderCard({
  orderId,
  orderNumber,
  status,
  materials,
  amountRupees,
  locality,
  aggregator,
  date,
  disputeStatus,
  style,
}: OrderCardProps) {
  const isCompleted = status === 'completed';

  const statusColor = isCompleted ? colors.teal : colors.amber;

  const statusText = 
    status === 'created' ? 'Waiting for aggregator' :
    status === 'accepted' ? 'Pickup accepted' :
    status === 'en_route' ? 'Partner on the way' :
    status === 'arrived' ? 'Partner arrived' :
    status === 'weighing_in_progress' ? 'Weighing in progress' :
    status === 'completed' ? 'Completed' :
    status === 'cancelled' ? 'Cancelled' :
    'Disputed';

  return (
    <BaseCard style={[{ padding: 0, overflow: 'hidden' }, style] as any}>
      <View style={{ height: 4, backgroundColor: ['cancelled', 'disputed'].includes(status) ? colors.border : statusColor }} />
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        {/* ── Header row: Order ID + Status ── */}
        <View style={styles.orderHeader}>
          <View>
            <Text variant="subheading" color={colors.navy}>
              {orderNumber ?? `#${orderId.slice(0, 8).toUpperCase()}`}
            </Text>
            <Text variant="caption" style={{ color: ['cancelled', 'disputed'].includes(status) ? colors.muted : statusColor, fontWeight: '600', marginTop: 2 } as any}>
              {statusText}
            </Text>
          </View>

          <StatusChip status={status} />
        </View>
        {disputeStatus ? (
          <View style={styles.disputeChipRow}>
            <View
              style={[
                styles.disputeChip,
                disputeStatus === 'open'
                  ? styles.disputeChipOpen
                  : disputeStatus === 'resolved'
                    ? styles.disputeChipResolved
                    : styles.disputeChipDismissed,
              ]}
            >
              <Text
                variant="caption"
                style={[
                  styles.disputeChipText,
                  disputeStatus === 'open'
                    ? styles.disputeChipTextOpen
                    : disputeStatus === 'resolved'
                      ? styles.disputeChipTextResolved
                      : styles.disputeChipTextDismissed,
                ] as any}
              >
                {disputeStatus === 'open'
                  ? 'Dispute Open'
                  : disputeStatus === 'resolved'
                    ? 'Dispute Resolved'
                    : 'Dispute Dismissed'}
              </Text>
            </View>
          </View>
        ) : null}

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
              {isCompleted ? 'Final value' : `Est. ₹${amountRupees} value`}
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
  disputeChipRow: {
    alignItems: 'flex-start',
  },
  disputeChip: {
    borderRadius: radius.chip,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  disputeChipOpen: {
    backgroundColor: colorWithAlpha(colors.red, 0.08),
    borderColor: colorWithAlpha(colors.red, 0.25),
  },
  disputeChipResolved: {
    backgroundColor: colorWithAlpha(colors.teal, 0.08),
    borderColor: colorWithAlpha(colors.teal, 0.25),
  },
  disputeChipDismissed: {
    backgroundColor: colorWithAlpha(colors.muted, 0.12),
    borderColor: colorWithAlpha(colors.muted, 0.3),
  },
  disputeChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disputeChipTextOpen: {
    color: colors.red,
  },
  disputeChipTextResolved: {
    color: colors.teal,
  },
  disputeChipTextDismissed: {
    color: colors.muted,
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

function colorWithAlpha(hex: string, alpha: number): string {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(normalizedAlpha * 255).toString(16).padStart(2, '0');
  return `${hex}${alphaHex}`;
}
