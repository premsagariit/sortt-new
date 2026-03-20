/**
 * app/(seller)/_layout.tsx
 * ──────────────────────────────────────────────────────────────────
 * Seller tab group layout.
 *
 * Tabs: Home | My Orders | Prices | Profile
 *
 * Tab configuration is sourced entirely from TabBar.tsx (Day 1):
 *   - SELLER_TABS    — tab entries (name, label, Icon component)
 *   - TAB_BAR_STYLE  — height, padding, bg, border
 *   - TAB_ACTIVE_TINT   — colors.navy
 *   - TAB_INACTIVE_TINT — colors.muted
 *
 * Phosphor icon API (MEMORY.md §9):
 *   Active:   weight="fill"
 *   Inactive: weight="regular"
 *
 * Each tab screen renders its own NavBar — no Expo Router header.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Tabs } from 'expo-router';

import {
  SELLER_TABS,
  TAB_BAR_STYLE,
  TAB_ACTIVE_TINT,
  TAB_INACTIVE_TINT,
} from '../../components/ui/TabBar';

export default function SellerLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: TAB_ACTIVE_TINT,
        tabBarInactiveTintColor: TAB_INACTIVE_TINT,
        tabBarLabelStyle: {
          fontFamily: 'DMSans-Medium',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      {SELLER_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, focused }) => (
              <tab.Icon
                size={24}
                color={color}
                weight={focused ? 'fill' : 'regular'}
              />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="prices" options={{ href: null }} />
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
      <Tabs.Screen name="order/receipt/[id]" options={{ href: null }} />
      <Tabs.Screen name="order/otp/[id]" options={{ href: null }} />
      <Tabs.Screen name="agg-profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="earnings" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
  );
}
