'use client';

/**
 * components/admin/InactivityGuard.tsx
 * ─────────────────────────────────────────────────────────────────
 * 15-minute inactivity timeout with 30-second polling interval.
 * Records last activity timestamp in sessionStorage on user events.
 * Polls every 30s and redirects to /admin/login if inactive > 15 min.
 * Also exposes the remaining time for the session timer UI.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';

const DEFAULT_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const TIMEOUT_MS = parseInt(process.env.NEXT_PUBLIC_ADMIN_INACTIVITY_TIMEOUT_MS || String(DEFAULT_TIMEOUT), 10);
const POLL_INTERVAL_MS = Math.min(30 * 1000, Math.floor(TIMEOUT_MS / 2)); // Dynamic polling based on timeout
const ACTIVITY_KEY = 'lastActivity';

export function InactivityGuard({ onTick }: { onTick?: (remainingMs: number) => void }) {
  const { signOut } = useClerk();

  useEffect(() => {
    // Update timestamp on any user interaction
    const updateActivity = () =>
      sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));

    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const;
    events.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    // Set initial timestamp if not already set
    if (!sessionStorage.getItem(ACTIVITY_KEY)) {
      updateActivity();
    }

    // Poll every 30 seconds (not sessionStorage ticking on its own)
    const interval = setInterval(() => {
      const last = Number(sessionStorage.getItem(ACTIVITY_KEY) ?? 0);
      const elapsed = Date.now() - last;
      const remaining = TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        console.log('[InactivityGuard] Timeout reached. Logging out...');
        sessionStorage.removeItem('admin_token');
        document.cookie = 'admin_token=; path=/; max-age=0; samesite=strict';
        sessionStorage.removeItem(ACTIVITY_KEY);
        try {
          void signOut({ redirectUrl: '/admin/login?reason=timeout' });
        } catch (e) {
          console.error('[InactivityGuard] Clerk signOut failed:', e);
        }
        // Force manual redirect in case Clerk is not used or signOut is slow
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login?reason=timeout';
          }
        }, 1000);
      } else {
        onTick?.(remaining);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
      clearInterval(interval);
    };
  }, [onTick, signOut]);

  return null;
}

/** Format remaining milliseconds as MM:SS */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
