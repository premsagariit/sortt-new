import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Typography';
import { colors, spacing } from '../../constants/tokens';

interface DayToggleProps {
  selectedDays: string[];
  onToggle: (day: string) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * DayToggle Component
 * ──────────────────────────────────────────────────────────────────
 * Row of 7 day pills (Mon–Sun) with active/inactive states.
 * ──────────────────────────────────────────────────────────────────
 */
export function DayToggle({ selectedDays, onToggle }: DayToggleProps) {
  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const isActive = selectedDays.includes(day);
        return (
          <TouchableOpacity
            key={day}
            activeOpacity={0.7}
            onPress={() => onToggle(day)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text
              variant="caption"
              style={[styles.label, isActive && styles.labelActive]}
            >
              {day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  label: {
    color: colors.muted,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.surface,
  },
});
