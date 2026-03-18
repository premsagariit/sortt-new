/**
 * components/ui/TabBar.tsx
 * ──────────────────────────────────────────────────────────────────
 * Tab bar configuration module for Expo Router <Tabs>.
 *
 * This is a CONFIGURATION module, not a rendered component.
 * It exports two static tab config arrays consumed by each user
 * type's _layout.tsx <Tabs> declaration.
 *
 * Seller tabs:     Home | Orders | Browse | Profile       (4 tabs)
 * Aggregator tabs: Home | Feed | Route | Earnings | Profile (5 tabs)
 *
 * Phosphor v2 API:
 *   Active:   weight="fill"
 *   Inactive: weight="regular"
 *
 * Tab bar BG:     colors.surface
 * Top border:     1px colors.border
 * Active tint:    colors.navy
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  House,
  ClipboardText,
  MagnifyingGlass,
  User,
  MapPin,
  Wallet,
  NavigationArrow,
  Plus,
  type IconProps,
} from 'phosphor-react-native';
import { colors } from '../../constants/tokens';
import { SorttLogo } from './SorttLogo';

// ── Tab entry type ────────────────────────────────────────────────
export interface TabEntry {
  /** Route name matching Expo Router file name (without extension) */
  name: string;
  /** Display label shown below the icon */
  label: string;
  /**
   * Icon renderer — pass weight prop based on active/inactive state.
   * Usage: <tab.Icon size={24} weight={isActive ? "fill" : "regular"} color={color} />
   */
  Icon: React.ComponentType<IconProps>;
}



// ── Seller tab configuration — 5 tabs ────────────────────────────
export const SELLER_TABS: TabEntry[] = [
  { name: 'home', label: 'Home', Icon: House },
  { name: 'orders', label: 'Orders', Icon: ClipboardText },
  { name: 'listing', label: 'New', Icon: Plus },
  { name: 'browse', label: 'Browse', Icon: MagnifyingGlass },
  { name: 'profile', label: 'Profile', Icon: User },
];

// ── Aggregator tab configuration — 4 tabs ────────────────────────
// Simplified: Home/Orders/Earnings/Profile.
export const AGGREGATOR_TABS: TabEntry[] = [
  { name: 'home', label: 'Home', Icon: House },
  { name: 'orders', label: 'Feed', Icon: ClipboardText },
  { name: 'route', label: 'Route', Icon: NavigationArrow },
  { name: 'earnings', label: 'Earnings', Icon: Wallet },
  { name: 'profile', label: 'Profile', Icon: User },
];

// ── Shared tab bar style constants ────────────────────────────────
export const TAB_BAR_STYLE = {
  backgroundColor: colors.surface,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  height: 64,
  paddingBottom: 8,
  paddingTop: 8,
} as const;

export const TAB_ACTIVE_TINT = colors.navy;
export const TAB_INACTIVE_TINT = colors.muted;
