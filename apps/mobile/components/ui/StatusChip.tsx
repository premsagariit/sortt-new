/**
 * components/ui/StatusChip.tsx
 * ──────────────────────────────────────────────────────────────────
 * Pill badge for the 8 order statuses in the order state machine.
 *
 * All status colours sourced from tokens.ts (MEMORY.md §2 compliance).
 * Status-specific tints now defined in colors.statusCreated, statusAccepted,
 * statusCancelled (PLAN.md §1.2 — zero raw hex rule).
 *
 * Status → semantic grouping:
 *   created            → indigo (new, pending)
 *   accepted           → blue (in progress)
 *   en_route           → amber (active, mobile)
 *   arrived            → amber (active, on-site)
 *   weighing_in_progress → amber (active, measurement)
 *   completed          → teal (success)
 *   cancelled          → muted (neutral/inactive)
 *   disputed           → red (alert/conflict)
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../constants/tokens';
import { Text } from './Typography';

// Canonical OrderStatus lives in orderStore — re-export for consumers
export type { OrderStatus } from '../../store/orderStore';
import type { OrderStatus } from '../../store/orderStore';

interface StatusChipProps {
  status: OrderStatus;
}

// ── Status display labels ─────────────────────────────────────────
const STATUS_LABELS: Record<OrderStatus, string> = {
  created: 'New',
  accepted: 'Accepted',
  en_route: 'On the Way',
  arrived: 'Arrived',
  weighing_in_progress: 'Weighing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

// ── Chip colour map ───────────────────────────────────────────────
// bg: background tint | fg: foreground text/icon colour
interface ChipColors {
  bg: string;
  fg: string;
}

const STATUS_COLORS: Record<OrderStatus, ChipColors> = {
  created: {
    bg: colors.statusCreated.bg,
    fg: colors.statusCreated.fg,
  },
  accepted: {
    bg: colors.statusAccepted.bg,
    fg: colors.statusAccepted.fg,
  },
  en_route: {
    bg: colors.amberLight,
    fg: colors.amber,
  },
  arrived: {
    bg: colors.amberLight,
    fg: colors.amber,
  },
  weighing_in_progress: {
    bg: colors.amberLight,
    fg: colors.amber,
  },
  completed: {
    bg: colors.tealLight,
    fg: colors.teal,
  },
  cancelled: {
    bg: colors.statusCancelled.bg,
    fg: colors.statusCancelled.fg,
  },
  disputed: {
    bg: colors.redLight,
    fg: colors.red,
  },
};

export function StatusChip({ status }: StatusChipProps) {
  const { bg, fg } = STATUS_COLORS[status];

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text
        variant="label"
        color={fg}
        style={styles.label}
      >
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.chip, // 20px pill shape
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
