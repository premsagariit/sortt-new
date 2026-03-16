import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Numeric } from '../ui/Typography';
import { colors, spacing } from '../../constants/tokens';

interface OrderItem {
  material_code: string;
  weight: number;
  price_per_kg?: number;
}

interface OrderItemListProps {
  items: OrderItem[];
  totalAmount?: number;
}

export function OrderItemList({ items, totalAmount }: OrderItemListProps) {
  return (
    <View style={styles.container}>
      <Text variant="subheading" style={styles.title}>Items</Text>
      <View style={styles.card}>
        {items.map((item, index) => {
          const materialColor = (colors.material as any)[item.material_code]?.fg || colors.slate;
          return (
            <View key={item.material_code} style={[styles.row, index === items.length - 1 && totalAmount === undefined && styles.lastRow]}>
              <View style={styles.itemInfo}>
                <View style={[styles.indicator, { backgroundColor: materialColor }]} />
                <View>
                  <Text variant="body" style={styles.itemLabel}>
                    {item.material_code.charAt(0).toUpperCase() + item.material_code.slice(1)}
                  </Text>
                  {item.price_per_kg !== undefined && (
                    <Text variant="caption" color={colors.muted}>
                      Rate: ₹{item.price_per_kg}/kg
                    </Text>
                  )}
                </View>
              </View>
              <Numeric size={15} color={colors.navy}>
                {item.weight} kg
              </Numeric>
            </View>
          );
        })}
        
        {totalAmount !== undefined && (
          <View style={styles.totalRow}>
            <Text variant="label" style={{ fontFamily: 'DMSans-SemiBold' }}>Total Est. Value</Text>
            <Numeric size={17} color={colors.amber}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Numeric>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  itemLabel: {
    color: colors.slate,
    fontFamily: 'DMSans-Medium',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface2,
  },
});
