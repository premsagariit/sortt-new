/**
 * components/ui/EmptyState.tsx
 * ──────────────────────────────────────────────────────────────────
 * Centred empty state panel used for: no orders, no messages,
 * no aggregators nearby, no search results, etc.
 *
 * Layout: centred column, padding xl from spacing tokens.
 *
 * Props:
 *   icon       — Phosphor icon element e.g. <Package size={48} color={colors.muted} />
 *   heading    — Screen heading via <Text heading>
 *   body       — Supporting description via <Text label>
 *   ctaLabel   — Optional CTA button label
 *   onCtaPress — Optional CTA handler (only render if both provided)
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/tokens';
import { Text } from './Typography';
import { PrimaryButton } from './Button';

interface EmptyStateProps {
  /**
   * Phosphor icon element to display.
   * Pass a pre-sized icon: <Package size={48} color={colors.muted} weight="thin" />
   * If omitted, the icon slot renders as empty space.
   */
  icon?: React.ReactNode;
  heading: string;
  body: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({
  icon,
  heading,
  body,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  const showCta = ctaLabel !== undefined && onCtaPress !== undefined;

  return (
    <View style={styles.container}>
      {/* Phosphor icon slot — pass pre-constructed icon element */}
      <View style={styles.iconSlot}>
        {icon ?? null}
      </View>

      <Text variant="heading" style={styles.heading}>
        {heading}
      </Text>

      <Text
        variant="label"
        color={colors.muted}
        style={styles.body}
      >
        {body}
      </Text>

      {showCta && (
        <PrimaryButton
          label={ctaLabel!}
          onPress={onCtaPress!}
          style={styles.cta}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width:           '100%',
    minHeight:       220,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         spacing.xl,
    gap:             spacing.md,
  },
  iconSlot: {
    width:           48,
    height:          48,
    alignItems:      'center',
    justifyContent:  'center',
  },
  heading: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
