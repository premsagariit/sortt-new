import React from 'react';
import { Stack } from 'expo-router';

/**
 * app/(auth)/aggregator/_layout.tsx
 * ──────────────────────────────────────────────────────────────────
 * Stack layout for aggregator onboarding screens.
 * ──────────────────────────────────────────────────────────────────
 */
export default function AggregatorAuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
