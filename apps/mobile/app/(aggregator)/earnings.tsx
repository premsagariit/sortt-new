/**
 * app/(aggregator)/earnings.tsx
 * ──────────────────────────────────────────────────────────────────
 * PLACEHOLDER — Day 2 §2.1 Navigation Shell only.
 * Full implementation follows in §3.4 Earnings Screen.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/tokens';
import { Text } from '../../components/ui/Typography';

export default function AggregatorEarningsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="body" style={styles.label}>
        Aggregator Earnings — Coming Soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         spacing.md,
  },
  label: {
    color: colors.slate,
  },
});
