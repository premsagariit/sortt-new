import React from 'react';
import { Stack } from 'expo-router';

/**
 * app/(auth)/seller/_layout.tsx
 * ──────────────────────────────────────────────────────────────────
 * Stack layout for seller onboarding screens.
 * ──────────────────────────────────────────────────────────────────
 */
export default function SellerAuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
