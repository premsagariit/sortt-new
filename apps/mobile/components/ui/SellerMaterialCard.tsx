import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { CaretDown, CaretUp, Minus } from 'phosphor-react-native';

import { colors, radius, spacing } from '../../constants/tokens';
import { MaterialCode } from './MaterialChip';
import { MATERIAL_META } from './MaterialCard';
import { Numeric, Text } from './Typography';

interface SellerMaterialCardProps {
  code: MaterialCode;
  isSelected: boolean;
  isDisabled?: boolean;
  ratePerKg?: number | null;
  trend?: 'up' | 'down' | 'flat' | null;
  helpText?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SellerMaterialCard({
  code,
  isSelected,
  isDisabled = false,
  ratePerKg,
  trend = 'flat',
  helpText,
  onPress,
  style,
}: SellerMaterialCardProps) {
  const meta = MATERIAL_META[code];
  const { Icon } = meta;
  const showRate = !isDisabled && ratePerKg != null;

  return (
    <Pressable
      style={[
        styles.card,
        isSelected && styles.cardActive,
        isDisabled && styles.cardDisabled,
        style,
      ]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Icon
            size={28}
            color={isDisabled ? colors.muted : isSelected ? colors.navy : colors.slate}
            weight={isSelected ? 'duotone' : 'regular'}
          />
        </View>

        <View style={styles.trendContainer}>
          {showRate ? (
            trend === 'up' ? (
              <CaretUp size={14} color={colors.teal} weight="bold" />
            ) : trend === 'down' ? (
              <CaretDown size={14} color={colors.red} weight="bold" />
            ) : (
              <Minus size={14} color={colors.muted} weight="bold" />
            )
          ) : (
            <Minus size={14} color={colors.muted} weight="bold" />
          )}
        </View>
      </View>

      <Text variant="label" style={styles.title}>
        {meta.title}
      </Text>

      {showRate ? (
        <>
          <Numeric size={18} color={isDisabled ? colors.muted : colors.navy} style={styles.rateText}>
            ₹{ratePerKg}
          </Numeric>
          <Text variant="caption" color={colors.muted} style={styles.subtitle} numberOfLines={1}>
            per kg
          </Text>
        </>
      ) : (
        <Text variant="caption" color={colors.muted} style={styles.helpText} numberOfLines={3}>
          {helpText ?? meta.subtitle}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardActive: {
    borderColor: '#1E293B',
    backgroundColor: '#F1F5F9',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  trendContainer: {
    marginLeft: spacing.xs,
    paddingTop: 2,
  },
  title: {
    color: '#0F172A',
    marginBottom: 2,
    fontWeight: '700',
    fontSize: 14,
  },
  rateText: {
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  helpText: {
    marginTop: spacing.xs,
    lineHeight: 16,
    minHeight: 32,
  },
});