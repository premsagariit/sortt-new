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
 *   phone.tsx  — phone number entry (placeholder for §2.1; full UI §2.2)
 *   otp.tsx    — OTP verification  (§2.2)
 * ──────────────────────────────────────────────────────────────────
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
