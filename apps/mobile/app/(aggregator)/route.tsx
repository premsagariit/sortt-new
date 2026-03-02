/**
 * app/(aggregator)/route.tsx
 * PLACEHOLDER — Day 5 §5.x Aggregator Route View (was map.tsx)
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/tokens';
import { Text } from '../../components/ui/Typography';

export default function AggregatorRouteScreen() {
  return (
    <View style={styles.container}>
      <Text variant="body" style={styles.label}>Route — Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  label: { color: colors.slate },
});
