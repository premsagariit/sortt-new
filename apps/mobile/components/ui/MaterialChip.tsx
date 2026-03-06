/**
 * components/ui/MaterialChip.tsx
 * ──────────────────────────────────────────────────────────────────
 * Category colour-coded chip and list-item for the 6 material codes.
 *
 * All colours — both bg and fg — come exclusively from
 * colors.material[code].{bg,fg} in tokens.ts.
 *
 * Variants:
 *   'chip'     — pill shape, coloured background, used in grids + order cards
 *   'listitem' — full-width row, transparent bg, 3px solid left border
 *
 * Material codes: metal | plastic | paper | ewaste | fabric | glass
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../constants/tokens';
import { Text } from './Typography';

export type MaterialCode = 'metal' | 'plastic' | 'paper' | 'ewaste' | 'fabric' | 'glass' | 'custom';
export type MaterialVariant = 'chip' | 'listitem';

// ── Display labels for material codes ────────────────────────────
export const MATERIAL_LABELS: Record<MaterialCode, string> = {
  metal: 'Metal',
  plastic: 'Plastic',
  paper: 'Paper',
  ewaste: 'E-Waste',
  fabric: 'Fabric',
  glass: 'Glass',
  custom: 'Other Item',
};

interface MaterialChipProps {
  material: MaterialCode;
  variant?: MaterialVariant;
  /** Override label — defaults to MATERIAL_LABELS[material] */
  label?: string;
}

export function MaterialChip({
  material,
  variant = 'chip',
  label,
}: MaterialChipProps) {
  const { fg, bg } = colors.material[material];
  const displayLabel = label ?? MATERIAL_LABELS[material];

  if (variant === 'listitem') {
    return (
      <View style={[styles.listitem, { borderLeftColor: fg }]}>
        <Text variant="label" color={fg}>{displayLabel}</Text>
      </View>
    );
  }

  // Default: 'chip'
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text variant="label" color={fg} style={styles.chipLabel}>
        {displayLabel}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Pill chip — coloured background
  chip: {
    borderRadius: radius.chip, // 20px pill
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  // List item — transparent bg, 3px solid left border, full-width row
  listitem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
    borderLeftWidth: 3,
    backgroundColor: 'transparent',
  },
});
