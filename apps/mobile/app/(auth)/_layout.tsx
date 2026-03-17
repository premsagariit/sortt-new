/**
 * app/(auth)/_layout.tsx
 * ──────────────────────────────────────────────────────────────────
 * Auth group stack layout.
 *
 * All auth screens (phone entry, OTP verify, onboarding) live inside
 * this Stack. Headers are hidden — each screen renders its own NavBar
 * using the design system component (per MEMORY.md §2).
 *
 * Screens in this group:
 *   phone.tsx     — unified phone + OTP flow
 *   onboarding.tsx, user-type.tsx, seller/*, aggregator/*
 * ──────────────────────────────────────────────────────────────────
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
