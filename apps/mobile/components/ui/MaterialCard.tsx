import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors, spacing } from '../../constants/tokens';
import { Text } from './Typography';
import { MaterialCode } from './MaterialChip';
import { Nut, FileText, Drop, Laptop, TShirt, Brandy, Package } from 'phosphor-react-native';

export const MATERIAL_META: Record<MaterialCode, {
  title: string;
  subtitle: string;
  Icon: any;
}> = {
  metal: { title: 'Metal', subtitle: 'Iron, copper, aluminium', Icon: Nut },
  paper: { title: 'Paper', subtitle: 'Newspaper, cardboard', Icon: FileText },
  plastic: { title: 'Plastic', subtitle: 'PET, HDPE, other', Icon: Drop },
  ewaste: { title: 'E-Waste', subtitle: 'Electronics, cables', Icon: Laptop },
  fabric: { title: 'Fabric', subtitle: 'Clothes, textile', Icon: TShirt },
  glass: { title: 'Glass', subtitle: 'Bottles, flat glass', Icon: Brandy },
  custom: { title: 'Other', subtitle: 'Miscellaneous scrap', Icon: Package },
};

interface MaterialCardProps {
  code: MaterialCode;
  isSelected: boolean;
  onPress: () => void;
}

export function MaterialCard({ code, isSelected, onPress }: MaterialCardProps) {
  const meta = MATERIAL_META[code];
  const { Icon } = meta;

  return (
    <Pressable
      style={[
        styles.card,
        isSelected && styles.cardActive
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Icon 
          size={32} 
          color={isSelected ? colors.navy : colors.slate} 
          weight={isSelected ? 'duotone' : 'regular'} 
        />
      </View>
      <Text variant="label" style={styles.title}>
        {meta.title}
      </Text>
      <Text variant="caption" style={styles.subtitle} numberOfLines={1}>
        {meta.subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0', // Light slate
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardActive: {
    borderColor: '#1E293B', // Navy
    backgroundColor: '#F1F5F9', // Slate 100
  },
  iconContainer: {
    marginBottom: spacing.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#0F172A', // Navy
    marginBottom: 2,
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: '#64748B', // Slate 500
    fontSize: 11,
    marginBottom: spacing.xs,
    textAlign: 'center',
  }
});
