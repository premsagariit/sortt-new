/**
 * components/ui/NavBar.tsx
 * ──────────────────────────────────────────────────────────────────
 * App navigation bar shell. Used at the top of every screen.
 *
 * Props:
 *   title          — Bar title text (always center-aligned)
 *   onBack         — If provided, renders back button (CaretLeft, 48dp).
 *                    Tab root screens pass NO onBack prop.
 *                    Inner/detail screens ALWAYS pass onBack — this is the
 *                    only distinction between the two nav contexts.
 *   rightAction    — Optional ReactNode in right corner. Container is capped
 *                    at maxWidth:120 + flexShrink:1 to prevent long text
 *                    (e.g. "Updated 6:00 AM") from overflowing or clipping.
 *   variant        — 'dark' (default) | 'light'
 *                    dark:  navy background, white title/icons
 *                    light: white background, navy title/icons, border-bottom
 *                    Default = 'dark' — all existing usages unaffected.
 *   userTypeBadge  — Optional. 'seller' | 'aggregator'. When provided, renders
 *                    a small identity pill BELOW the main NavBar row. Pass only
 *                    on tab root screens (Home, Orders). Not on Browse or Profile.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { colors, colorExtended, spacing } from '../../constants/tokens';
import { Text } from './Typography';
import { IconButton } from './Button';
import { SorttLogo, SorttLogoVariant } from './SorttLogo';

interface NavBarProps {
  /**
   * Title text shown in center. Ignored if logoVariant is provided.
   */
  title?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  /** Visual variant. Default: 'light'. Existing usages without this prop will become light. */
  variant?: 'dark' | 'light';
  /**
   * Optional branding logo variant to show instead of title text.
   */
  logoVariant?: SorttLogoVariant;
  /**
   * Optional identity badge shown below the title row.
   * 'seller'     → teal pill — use on (seller)/home and (seller)/orders only.
   * 'aggregator' → amber pill — use on (aggregator)/home and (aggregator)/orders only.
   * Omit on Browse, Profile, and all inner/detail screens.
   */
  userTypeBadge?: 'seller' | 'aggregator';
}
export function NavBar({ title, onBack, rightAction, variant = 'light', logoVariant, userTypeBadge }: NavBarProps) {
  const isDark = variant === 'dark';
  const iconColor = isDark ? colors.surface : colors.navy;
  const insets = useSafeAreaInsets();

  return (
    <View style={[isDark ? styles.wrapDark : styles.wrapLight, { paddingTop: insets.top }]}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={isDark ? colors.navy : colors.surface}
      />
      {/* ── Decorative circle — only shown on dark variant ── */}
      {isDark && (
        <View style={styles.decorativeCircle} pointerEvents="none" />
      )}

      {/* ── Main row: [left] [title/logo] [right] ── */}
      <View style={styles.row}>
        {/* Left: back button OR symmetrical spacer */}
        {onBack ? (
          <View style={styles.side}>
            <IconButton
              icon={
                <CaretLeft
                  size={18}
                  color={iconColor}
                  weight="regular"
                />
              }
              onPress={onBack}
              accessibilityLabel="Go back"
              style={styles.backBtn}
            />
          </View>
        ) : (
          <View style={styles.side}>
            <View style={styles.spacer} />
          </View>
        )}

        {/* Centre: title/logo — flex:1 ensures it fills all space between the two sides */}
        <View style={[styles.titleContainer, !isDark && styles.titleContainerLight]}>
          {logoVariant ? (
            <SorttLogo variant={logoVariant} />
          ) : (
            <Text
              variant="subheading"
              style={isDark ? styles.titleDark : styles.titleLight}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
        </View>

        {/* Right: action slot (capped width to prevent overflow) OR symmetrical spacer */}
        {rightAction ? (
          <View style={[styles.side, styles.rightSide]}>
            {rightAction}
          </View>
        ) : (
          <View style={[styles.side, styles.rightSide]}>
            <View style={styles.spacer} />
          </View>
        )}
      </View>

      {/* ── Identity badge row (optional, below main row) ── */}
      {userTypeBadge != null && (
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badgePill,
              userTypeBadge === 'seller'
                ? styles.badgeSeller
                : styles.badgeAggregator,
            ]}
          >
            {/* Coloured dot */}
            <View
              style={[
                styles.badgeDot,
                { backgroundColor: userTypeBadge === 'seller' ? colors.teal : colors.amber },
              ]}
            />
            <Text
              variant="caption"
              style={[styles.badgeText, { color: userTypeBadge === 'seller' ? colors.teal : colors.amber }] as any}
            >
              {userTypeBadge === 'seller' ? 'SELLER' : 'AGGREGATOR'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Outer wrappers — variant-specific (column so badge row stacks below)
  wrapDark: {
    backgroundColor: colors.navy,
    position:        'relative',
    overflow:        'hidden',
  },
  wrapLight: {
    backgroundColor:   colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Main title row
  row: {
    minHeight:         56,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.xs,
  },

  // Decorative element — only rendered on dark variant
  decorativeCircle: {
    position:        'absolute',
    right:           -20,
    top:             -20,
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: colors.surface,
    opacity:         0.04,
  },

  // Left / right slot containers
  side: {
    width:          48,
    height:         56,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Right side: capped width + flexShrink prevents wide rightAction content
  // (e.g. "Updated 6:00 AM") from overflowing the NavBar or pushing the title off-centre.
  // Right side: capable of expanding for wide text but capped at 120
  rightSide: {
    width:      'auto',
    minWidth:   48,
    alignItems: 'flex-end',
    flexShrink: 1,
    maxWidth:   120,
  },

  // Invisible spacer — matches the side width to keep title mathematically centred
  spacer: {
    width: 48,
  },

  // Title
  titleContainer: {
    flex:              1,
    alignItems:        'center',
    paddingHorizontal: spacing.xs,
  },
  titleContainerLight: {
    alignItems: 'flex-start',
  },
  titleDark: {
    color:     colors.surface,
    textAlign: 'center',
  },
  titleLight: {
    color:     colors.navy,
    textAlign: 'left',
  },

  // Back button (explicit size to match title text height, no circle)
  backBtn: {
    width: 24,
    height: 24,
    backgroundColor: 'transparent',
  },

  // ── userTypeBadge pill ──────────────────────────────────────────
  badgeRow: {
    alignItems:    'center',
    paddingBottom: spacing.xs,
  },
  badgePill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    height:            20,
    paddingHorizontal: spacing.sm,
    borderRadius:      10,
  },
  badgeSeller: {
    backgroundColor: colorExtended.tealLight,
  },
  badgeAggregator: {
    backgroundColor: colorExtended.amberLight,
  },
  badgeDot: {
    width:        5,
    height:       5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize:      10,
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
