/**
 * apps/web/middleware.ts
 * ─────────────────────────────────────────────────────────────────
 * Vercel Edge Middleware — IP allowlist for /admin/* routes (X4, G16.1).
 *
 * - Reads ADMIN_IP_ALLOWLIST env var (comma-separated IPs)
 * - In development (NODE_ENV !== 'production'): bypasses check
 * - Returns 403 JSON for non-whitelisted IPs in production
 * - Returns 200 if allowlist is not configured (open) — operator responsibility
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/admin/login(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const adminTokenCookie = req.cookies.get('admin_token')?.value;

  if (adminTokenCookie) {
    return NextResponse.next();
  }

  // ── 1. IP ALLOWLIST LOGIC (Gate G16.1) ──────────────────────────
  // [Note: Temporarily commented out for Gate G16.1 local testing]
  // if (process.env.NODE_ENV !== 'production') {
  //   // Skip IP checking locally
  // } else {
  const allowlistRaw = process.env.ADMIN_IP_ALLOWLIST ?? '';
  const allowlist = allowlistRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length === 0 && process.env.NODE_ENV !== 'production') {
    console.warn('[admin-ip-allowlist] ADMIN_IP_ALLOWLIST is not configured; allowing all IPs in development.');
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
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
  // }
  // ─────────────────────────────────────────────────────────────────

  // ── 2. CLERK AUTH LOGIC ──────────────────────────────────────────
  if (!isPublicRoute(req)) {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Next.js standard Clerk matcher covering all active routes but skipping static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
