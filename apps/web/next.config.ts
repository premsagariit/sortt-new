import type { NextConfig } from 'next';

/**
 * apps/web/next.config.ts
 * ─────────────────────────────────────────────────────────────────
 * Security headers for all routes.
 * In development, CSP is relaxed to allow Next.js hot-reload (eval)
 * and local backend connections (localhost).
 * In production, a strict CSP is enforced.
 * ─────────────────────────────────────────────────────────────────
 */

const isDev = process.env.NODE_ENV === 'development';

// Production-grade CSP
const ProdCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.sortt.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.cloudflarestorage.com https://*.r2.cloudflarestorage.com https://*.clerk.com https://img.clerk.com",
  "connect-src 'self' https://*.cloudflarestorage.com https://*.r2.cloudflarestorage.com https://*.clerk.accounts.dev https://clerk.sortt.com",
  "frame-ancestors 'none'",
].join('; ');

// Dev CSP — allows Next.js webpack HMR (unsafe-inline + unsafe-eval)
// and local backend on any localhost port
const DevCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.sortt.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http: localhost:*",
  "connect-src 'self' http://localhost:* ws://localhost:* https: http: *.cloudflarestorage.com *.r2.cloudflarestorage.com",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Content-Security-Policy', value: isDev ? DevCSP : ProdCSP },
        ],
      },
    ];
  },
};

export default nextConfig;
