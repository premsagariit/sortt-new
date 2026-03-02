/**
 * components/ui/Button.tsx
 * ──────────────────────────────────────────────────────────────────
 * @design-rule Only one PrimaryButton may appear on any screen.
 *              This is enforced by design convention, not code.
 *              Screens with two CTAs use PrimaryButton + SecondaryButton.
 *
 * Exports:
 *   PrimaryButton  — colors.red bg, white text, full-width, radius.btn
 *   SecondaryButton — white bg, 1px colors.border border, no fill
 *   IconButton     — 48dp minimum touch target (WCAG AA)
 *
 * Props (all three):
 *   label     — button text (not used on IconButton)
 *   onPress   — tap handler (blocked when disabled)
 *   loading   — shows SkeletonLoader placeholder (variant="list", height=24) while true
 *   disabled  — 40% opacity, onPress blocked
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  Pressable,
  PressableStateCallbackType,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../../constants/tokens';
import { Text } from './Typography';
import { SkeletonLoader } from './SkeletonLoader';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────
interface ButtonBaseProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

// ─────────────────────────────────────────────────────────────────────────────
// PrimaryButton
// ─────────────────────────────────────────────────────────────────────────────
interface PrimaryButtonProps extends ButtonBaseProps {
  label: string;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.primary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <SkeletonLoader variant="list" height={24} width="60%" />
      ) : (
        <Text variant="button" style={styles.primaryLabel}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SecondaryButton
// ─────────────────────────────────────────────────────────────────────────────
interface SecondaryButtonProps extends ButtonBaseProps {
  label: string;
  /** Optional override for text and border color. Must be a valid colors token key, never raw hex. */
  color?: keyof typeof colors;
}

export function SecondaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  color,
  style,
}: SecondaryButtonProps) {
  const isDisabled = disabled || loading;
  const customColorStyle = color ? {
    borderColor: colors[color],
  } : undefined;
  const customTextStyle = color ? {
    color: colors[color],
  } : undefined;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.secondary,
        customColorStyle as any,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressedSecondary,
        style,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <SkeletonLoader variant="list" height={24} width="60%" />
      ) : (
        <Text variant="button" style={[styles.secondaryLabel, customTextStyle] as any}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IconButton — WCAG AA: minimum 48×48 dp touch target
// ─────────────────────────────────────────────────────────────────────────────
interface IconButtonProps extends ButtonBaseProps {
  /** Accessible label describing the action (required for screen readers) */
  accessibilityLabel: string;
  /** Icon component to render inside the button */
  icon: React.ReactNode;
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.icon,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <View style={styles.iconInner}>{icon}</View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Primary
  primary: {
    width:           '100%',
    height:          52,
    backgroundColor: colors.red,
    borderRadius:    radius.btn,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: spacing.md,
  },
  primaryLabel: {
    color: colors.surface,
  },

  // Secondary
  secondary: {
    width:           '100%',
    height:          52,
    backgroundColor: colors.surface,
    borderRadius:    radius.btn,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: spacing.md,
  },
  secondaryLabel: {
    color: colors.slate,
  },

  // Icon — 48×48 minimum WCAG AA touch target
  icon: {
    width:          48,
    height:         48,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconInner: {
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Shared states
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  pressedSecondary: {
    backgroundColor: colors.bg,
  },
});
