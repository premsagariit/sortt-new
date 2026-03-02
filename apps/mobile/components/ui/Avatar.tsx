/**
 * components/ui/Avatar.tsx
 * ──────────────────────────────────────────────────────────────────
 * Initial-based avatar. No image. No placeholder image. Ever.
 *
 * Rules:
 *   - Initial derived from first character of name prop, uppercase
 *   - userType drives background: seller=navy, aggregator=teal
 *   - size prop: 'sm'=32dp, 'md'=40dp, 'lg'=48dp
 *   - Shape: perfect circle (borderRadius = half of dimension)
 *   - Text size scales proportionally with size prop
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { colors } from '../../constants/tokens';
import { Text } from './Typography';

export type UserType = 'seller' | 'aggregator';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  /** Full name or display name — first character used as initial */
  name: string;
  userType: UserType;
  size?: AvatarSize;
  /** Optional image URI (remote) */
  uri?: string;
  /** Optional local image source (require) */
  source?: ImageSourcePropType;
}

// ── Dimension map ─────────────────────────────────────────────────
const SIZES: Record<AvatarSize, { box: number; fontSize: number }> = {
  sm: { box: 32, fontSize: 13 },
  md: { box: 40, fontSize: 16 },
  lg: { box: 48, fontSize: 19 },
  xl: { box: 68, fontSize: 26 },
};

// ── Background colour by user type ────────────────────────────────
const BG_COLOR: Record<UserType, string> = {
  seller:     colors.navy,
  aggregator: colors.teal,
};

export function Avatar({ name, userType, size = 'md', uri, source }: AvatarProps) {
  const { box, fontSize } = SIZES[size];
  
  // Extract up to 2 initials
  const words = name.trim().split(/\s+/);
  const initial = words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (words[0]?.[0] || '?').toUpperCase();

  const bgColor = BG_COLOR[userType];

  return (
    <View
      style={[
        styles.container,
        {
          width:        box,
          height:       box,
          borderRadius: box / 2, // perfect circle
          backgroundColor: bgColor,
        },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
    >
      {source ? (
        <Image 
          source={source} 
          style={{ width: box, height: box, borderRadius: box / 2 }}
          resizeMode="cover"
        />
      ) : uri ? (
        <Image 
          source={{ uri }} 
          style={{ width: box, height: box, borderRadius: box / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text
          variant="label"
          style={[styles.initial, { fontSize }] as any}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  initial: {
    color:      colors.surface, // white on navy / white on teal
    fontFamily: 'DMSans-Bold',
  },
});
