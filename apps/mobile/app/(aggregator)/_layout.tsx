/**
 * app/(aggregator)/_layout.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator tab group layout.
 *
 * Tabs: Orders | Map | Earnings | Profile
 * (TAB label="Orders" but route name="feed" — matches AGGREGATOR_TABS)
 *
 * Tab configuration sourced entirely from TabBar.tsx (Day 1):
 *   - AGGREGATOR_TABS — tab entries (name, label, Icon component)
 *   - TAB_BAR_STYLE   — height, padding, bg, border
 *   - TAB_ACTIVE_TINT / TAB_INACTIVE_TINT
 *
 * Phosphor icon API (MEMORY.md §9):
 *   Active:   weight="fill"
 *   Inactive: weight="regular"
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Tabs } from 'expo-router';

import {
  AGGREGATOR_TABS,
  TAB_BAR_STYLE,
  TAB_ACTIVE_TINT,
  TAB_INACTIVE_TINT,
} from '../../components/ui/TabBar';

export default function AggregatorLayout() {
  return (
    <Tabs
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
      {AGGREGATOR_TABS.map((tab) => {
        const Icon = tab.Icon;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.label,
              tabBarIcon: ({ color, focused }) => (
                <Icon
                  size={24}
                  color={color}
                  weight={focused ? 'fill' : 'regular'}
                />
              ),
            }}
          />
        );
      })}
      {/* Hide auxiliary screens and sub-pages from tab bar */}
      <Tabs.Screen name="price-index" options={{ href: null }} />
      <Tabs.Screen name="profile/buy-rates" options={{ href: null }} />
      <Tabs.Screen name="profile/operating-areas" options={{ href: null }} />
      <Tabs.Screen name="profile/hours-availability" options={{ href: null }} />
      <Tabs.Screen name="profile/kyc-documents" options={{ href: null }} />
      <Tabs.Screen name="order-detail" options={{ href: null }} />
      <Tabs.Screen name="execution" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
  );
}
