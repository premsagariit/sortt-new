/**
 * utils/navigation.tsx
 * ──────────────────────────────────────────────────────────────────
 * Shared navigation utilities for ensuring safe router transitions.
 * ──────────────────────────────────────────────────────────────────
 */

import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';

/**
 * Navigates back if history exists, otherwise replaces with a fallback.
 * Prevents getting stuck or being kicked to the root in Expo Router.
 *
 * When no fallback is provided, the default is role-aware:
 *   - aggregator → '/(aggregator)/home'
 *   - seller     → '/(seller)/home'
 *
 * @param fallback - Path to replace with if no history
 */
export function safeBack(fallback?: string) {
  if (router.canGoBack()) {
    router.back();
  } else {
    const fb = fallback ?? (
      useAuthStore.getState().userType === 'aggregator'
        ? '/(aggregator)/home'
        : '/(seller)/home'
    );
    router.replace(fb as any);
  }
}
