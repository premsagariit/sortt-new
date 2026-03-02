import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Typography';
import { colors, spacing } from '../../constants/tokens';

interface ZoneChipProps {
  label:    string;
  selected: boolean;
  onPress:  () => void;
}

/**
 * ZoneChip Component
 * ──────────────────────────────────────────────────────────────────
 * Selectable chip for operational areas.
 * ──────────────────────────────────────────────────────────────────
 */
export function ZoneChip({ label, selected, onPress }: ZoneChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text
        variant="caption"
        style={[styles.label, selected && styles.labelSelected]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  label: {
    color: colors.muted,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.surface,
  },
});
