/**
 * components/ui/Typography.tsx
 * ──────────────────────────────────────────────────────────────────
 * THE ONLY file in the entire codebase that may import <Text> from
 * 'react-native'. Every other file must use <Text> or <Numeric>
 * from this module. This is a hard architectural rule enforced by
 * design convention.
 *
 * Variants:
 *   <Text variant="body">       — body copy, 15px, Regular
 *   <Text variant="label">      — labels, 13px, Medium
 *   <Text variant="caption">    — captions, 12px, Regular
 *   <Text variant="heading">    — screen headings, 22px, Bold
 *   <Text variant="subheading"> — section titles, 17px, SemiBold
 *   <Text variant="button">     — button labels, 15px, SemiBold
 *
 *   <Numeric>                   — DM Mono ONLY. Use for: ₹ amounts,
 *                                 weights (kg), OTPs, order IDs,
 *                                 timestamps. Nothing else.
 *
 * Font family strings must match the names registered in _layout.tsx.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Text as RNText, TextStyle, StyleProp, StyleSheet } from 'react-native';
import { colors } from '../../constants/tokens';

// ── Font sizes (not in token set — Typography owns these) ─────────
const FONT_SIZES = {
  heading: 22,
  subheading: 17,
  body: 15,
  button: 15,
  label: 13,
  caption: 12,
} as const;

type TextVariant = keyof typeof FONT_SIZES;

// ─────────────────────────────────────────────────────────────────────────────
// <Text> — DM Sans wrapper for all non-numeric UI text
// ─────────────────────────────────────────────────────────────────────────────
interface TextProps {
  variant?: TextVariant;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Use for data that should be copyable (e.g. error messages) */
  selectable?: boolean;
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

export function Text({
  variant = 'body',
  children,
  style,
  numberOfLines,
  selectable,
  color,
  onPress,
  disabled,
  adjustsFontSizeToFit,
  minimumFontScale,
}: TextProps) {
  return (
    <RNText
      style={[styles[variant], color ? { color } : undefined, style]}
      numberOfLines={numberOfLines}
      selectable={selectable}
      onPress={onPress}
      disabled={disabled}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      {children}
    </RNText>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// <Numeric> — DM Mono wrapper, EXCLUSIVELY for numeric data
//
// Use for: rupee amounts (₹), weights (kg), OTP codes, order IDs, timestamps.
// DO NOT use for non-numeric UI text. If in doubt, use <Text> instead.
// ─────────────────────────────────────────────────────────────────────────────
interface NumericProps {
  children: React.ReactNode;
  size?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  color?: string;
  /** fontVariant tabular-nums ensures column alignment */
  tabular?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

export function Numeric({
  children,
  size = 15,
  style,
  numberOfLines,
  color,
  tabular = true,
  onPress,
  disabled,
  adjustsFontSizeToFit,
  minimumFontScale,
}: NumericProps) {
  return (
    <RNText
      style={[
        numericBase,
        { fontSize: size, color: color ?? colors.slate },
        tabular ? { fontVariant: ['tabular-nums'] } : undefined,
        style,
      ]}
      numberOfLines={numberOfLines}
      onPress={onPress}
      disabled={disabled}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      {children}
    </RNText>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  heading: {
    fontFamily: 'DMSans-Bold',
    fontSize: FONT_SIZES.heading,
    color: colors.navy,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: FONT_SIZES.subheading,
    color: colors.navy,
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  body: {
    fontFamily: 'DMSans-Regular',
    fontSize: FONT_SIZES.body,
    color: colors.slate,
    lineHeight: 22,
  },
  button: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: FONT_SIZES.button,
    color: colors.surface,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: FONT_SIZES.label,
    color: colors.slate,
    lineHeight: 18,
  },
  caption: {
    fontFamily: 'DMSans-Regular',
    fontSize: FONT_SIZES.caption,
    color: colors.muted,
    lineHeight: 16,
  },
});

const numericBase: TextStyle = {
  fontFamily: 'DMMono-Regular',
  color: colors.slate,
};
