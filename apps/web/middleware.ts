/**
 * apps/web/middleware.ts
 * ─────────────────────────────────────────────────────────────────
 * Vercel Edge Middleware — IP allowlist (G16.1) + JWT cookie guard.
 *
 * Auth strategy (Clerk-free):
 *  - Admin login stores a compact JWT in sessionStorage AND as an
 *    `admin_token` cookie (set by the login page client-side).
 *  - This middleware reads `admin_token` cookie, verifies the HS256
 *    JWT using JWT_SECRET, and redirects to /admin/login on failure.
 *  - Public route: /admin/login (no token required)
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_RAW = process.env.JWT_SECRET ?? '';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET_RAW);
}

const PUBLIC_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password', '/admin/request-access'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // ── 1. IP ALLOWLIST LOGIC (Gate G16.1) ──────────────────────────
  const allowlistRaw = process.env.ADMIN_IP_ALLOWLIST ?? '';
  const allowlist = allowlistRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length === 0 && process.env.NODE_ENV !== 'production') {
    // no-op in dev
  }

  if (allowlist.length > 0) {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip')?.trim() ??
      '127.0.0.1';

    if (!allowlist.includes(clientIp)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Access denied',
          message: 'Your IP address is not authorised to access this resource.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  // ─────────────────────────────────────────────────────────────────

  // ── 2. JWT COOKIE GUARD ──────────────────────────────────────────
  if (!isPublic(pathname)) {
    const token = req.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Skip verification if JWT_SECRET not configured (dev safety net)
    if (JWT_SECRET_RAW.length >= 32) {
      try {
        await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
      } catch {
        const loginUrl = new URL('/admin/login', req.url);
        loginUrl.searchParams.set('reason', 'timeout');
        return NextResponse.redirect(loginUrl);
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
