/**
 * utils/navigation.tsx
 * ──────────────────────────────────────────────────────────────────
 * Shared navigation utilities for ensuring safe router transitions.
 * ──────────────────────────────────────────────────────────────────
 */

import { router } from 'expo-router';

/**
 * Navigates back if history exists, otherwise replaces with a fallback.
 * Prevents getting stuck or being kicked to the root in Expo Router.
 *
 * @param fallback - Path to replace with if no history (default: '/(seller)/home')
 */
export function safeBack(fallback: string = '/(seller)/home') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
