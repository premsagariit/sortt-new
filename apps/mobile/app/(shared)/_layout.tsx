/**
 * app/(shared)/_layout.tsx
 * ──────────────────────────────────────────────────────────────────
 * Shared stack layout — accessible from both seller and aggregator
 * navigation contexts.
 *
 * Screens housed here:
 *   order/[id]       — Order Detail
 *   otp-confirm/[id] — Pickup OTP Confirmation
 *   receipt/[id]     — Transaction Receipt
 *
 * Each screen renders its own NavBar (or SafeAreaView for receipt).
 * No Expo Router header shown.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function SharedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
