/**
 * components/ui/SkeletonLoader.tsx
 * ──────────────────────────────────────────────────────────────────
 * Flat rectangle skeleton loaders. No spinners. No ActivityIndicator.
 * This applies project-wide — this component is the ONLY loading
 * indicator permitted in the app.
 *
 * Animation: opacity pulse 0→1→0, 200ms/cycle, ease-out, loops
 * while the component is mounted.
 *
 * Variants:
 *   'card'   — full card shape with radius.card, variable height
 *   'list'   — single row, 56dp height, full width, 8px radius
 *   'header' — nav bar slot, 20dp height, 60% width, 4px radius
 *
 * Background: uses colors.skeleton token (slightly darker than
 * colors.bg to create visual contrast on white card surface).
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../../constants/tokens';

export type SkeletonVariant = 'card' | 'list' | 'header';

interface SkeletonLoaderProps {
  variant: SkeletonVariant;
  /** Override width */
  width?: number | `${number}%`;
  /** Override height */
  height?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  variant,
  width,
  height,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Opacity pulse: 1 → 0.4 → 1, 200ms per half-cycle, ease-out, loops
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue:         0.4,
          duration:        600,
          easing:          (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:         1,
          duration:        600,
          easing:          (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const variantStyle = VARIANT_STYLES[variant];

  return (
    <Animated.View
      style={[
        styles.base,
        variantStyle,
        width  !== undefined ? { width }  : undefined,
        height !== undefined ? { height } : undefined,
        { opacity },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.skeleton,
  },
});

const VARIANT_STYLES: Record<SkeletonVariant, ViewStyle> = {
  card: {
    borderRadius: radius.card, // 12px
    width:        '100%',
    height:       120,         // Default card height; overrideable via height prop
  },
  list: {
    borderRadius: 8,
    width:        '100%',
    height:       56,
  },
  header: {
    borderRadius: 4,
    width:        '60%',
    height:       20,
  },
};
