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
import { useAuth, useClerk } from '@clerk/nextjs';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState(false);
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

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
        const fallbackToken = sessionStorage.getItem('admin_token') || (fallbackCookie ? decodeURIComponent(fallbackCookie) : '');

        if (!isSignedIn && !fallbackToken) {
          router.replace('/admin/login');
          return;
        }

        const token = fallbackToken || await getToken();
        if (!token) {
          router.replace('/admin/login');
          return;
        }

        const response = await fetch(`${apiUrl}/api/users/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!response.ok) {
          sessionStorage.removeItem('admin_token');
          await signOut({ redirectUrl: '/admin/login' });
          return;
        }

        const data = await response.json();

        // user_type comes from DB-fetched /api/users/me — V7 compliance
        if (data?.user_type !== 'admin') {
          sessionStorage.removeItem('admin_token');
          await signOut({ redirectUrl: '/admin/login?reason=unauthorized' });
          return;
        }

        if ((data?.password_change_required || data?.must_change_password) && pathname !== '/admin/create-password') {
          router.replace('/admin/create-password?mode=force');
          return;
        }

        setVerified(true);
      } catch {
        sessionStorage.removeItem('admin_token');
        await signOut({ redirectUrl: '/admin/login' });
      }
    })();
  }, [getToken, isLoaded, isSignedIn, pathname, router, signOut]);

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
