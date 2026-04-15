'use client';

/**
 * components/admin/AdminAuthGuard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Client component that verifies the admin session on mount.
 * Reads the Clerk session token and calls GET /api/users/me.
 * Checks user_type === 'admin' — DB-fetched field, never from JWT (V7).
 * Redirects to /admin/login if not authenticated or not admin.
 *
 * Because the JWT lives in sessionStorage (not HttpOnly cookie),
 * this check must happen client-side.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const AUTH_CACHE_KEY = 'admin_auth_guard_v1';

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[AdminAuthGuard] NEXT_PUBLIC_API_URL is not set');
      router.replace('/admin/login');
      return;
    }

    void (async () => {
      try {
        const fallbackCookie = document.cookie
          .split('; ')
          .find((part) => part.startsWith('admin_token='))
          ?.split('=')[1];
        const token = sessionStorage.getItem('admin_token') || (fallbackCookie ? decodeURIComponent(fallbackCookie) : '');

        if (!token) {
          router.replace('/admin/login');
          return;
        }

        const tokenFingerprint = token.slice(-12);
        const cachedRaw = sessionStorage.getItem(AUTH_CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as {
              verifiedAt: number;
              userType: string;
              passwordChangeRequired: boolean;
              tokenFingerprint: string;
            };
            const isFresh = Date.now() - cached.verifiedAt < 60_000;
            if (isFresh && cached.userType === 'admin' && cached.tokenFingerprint === tokenFingerprint) {
              if (cached.passwordChangeRequired && pathname !== '/admin/create-password') {
                router.replace('/admin/create-password?mode=force');
                return;
              }
              setVerified(true);
              return;
            }
          } catch {
            sessionStorage.removeItem(AUTH_CACHE_KEY);
          }
        }

        const response = await fetch(`${apiUrl}/api/users/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!response.ok) {
          sessionStorage.removeItem('admin_token');
          sessionStorage.removeItem(AUTH_CACHE_KEY);
          document.cookie = 'admin_token=; path=/; max-age=0; samesite=strict';
          router.replace('/admin/login');
          return;
        }

        const data = await response.json();

        if (data?.user_type !== 'admin') {
          sessionStorage.removeItem('admin_token');
          sessionStorage.removeItem(AUTH_CACHE_KEY);
          document.cookie = 'admin_token=; path=/; max-age=0; samesite=strict';
          router.replace('/admin/login?reason=unauthorized');
          return;
        }

        const passwordChangeRequired = Boolean(data?.password_change_required || data?.must_change_password);
        sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
          verifiedAt: Date.now(),
          userType: data?.user_type,
          passwordChangeRequired,
          tokenFingerprint,
        }));

        if (passwordChangeRequired && pathname !== '/admin/create-password') {
          router.replace('/admin/create-password?mode=force');
          return;
        }

        setVerified(true);
      } catch {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem(AUTH_CACHE_KEY);
        document.cookie = 'admin_token=; path=/; max-age=0; samesite=strict';
        router.replace('/admin/login');
      }
    })();
  }, [pathname, router]);

  if (!verified) {
    return (
      <div className="flex h-screen items-center justify-center admin-bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 admin-border-navy border-t-transparent rounded-full animate-spin" />
          <span className="text-sm admin-text-muted font-medium">Verifying session…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
