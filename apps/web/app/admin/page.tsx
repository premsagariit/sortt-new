/**
 * app/admin/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin Landing Page — public, no sidebar, no auth required.
 * Route: /admin (PUBLIC — see middleware.ts PUBLIC_PATHS)
 *
 * Purpose: Portal entry point before login.
 * Shows the admin portal value prop and directs to /admin/login.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME } from '../../constants/app';

export const metadata: Metadata = {
  title: `Admin Portal — ${APP_NAME}`,
  description: `${APP_NAME} internal operations portal. Manage KYC, disputes, prices, and flagged accounts.`,
  robots: { index: false, follow: false },
};

const PORTAL_FEATURES = [
  {
    icon: '🪪',
    title: 'KYC Queue',
    description: 'Review and approve aggregator identity verification documents before they go live.',
    color: 'amber',
  },
  {
    icon: '⚖️',
    title: 'Dispute Resolution',
    description: 'Manage seller–aggregator disputes within the 72-hour SLA window with full audit trail.',
    color: 'red',
  },
  {
    icon: '💰',
    title: 'Price Override',
    description: 'Set manual scrap rates per material. Every change is logged with admin ID and timestamp.',
    color: 'teal',
  },
  {
    icon: '🚨',
    title: 'Flagged Accounts',
    description: 'Review aggregators flagged for low ratings, policy violations, or unusual activity.',
    color: 'navy',
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  amber: { bg: 'bg-amberLight', border: 'border-amber/20', text: 'text-amber', dot: 'bg-amber' },
  red:   { bg: 'bg-redLight',   border: 'border-red/20',   text: 'text-red',   dot: 'bg-red'   },
  teal:  { bg: 'bg-tealLight',  border: 'border-teal/20',  text: 'text-teal',  dot: 'bg-teal'  },
  navy:  { bg: 'bg-bg',         border: 'border-border',   text: 'text-navy',  dot: 'bg-navySoft' },
};

export default function AdminLandingPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col">

      {/* ── Header / Nav ──────────────────────────────────────── */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Go to public site">
            <div className="w-8 h-8 rounded-lg bg-red flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <div className="text-white font-bold text-[15px] tracking-tight leading-none">{APP_NAME}</div>
              <div className="text-white/35 text-[9px] font-bold uppercase tracking-[0.12em]">Admin Portal</div>
            </div>
          </Link>

          {/* Security indicator */}
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-white/35 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" aria-hidden="true" />
              IP-verified access
            </span>
            <span>·</span>
            <span>15-min session</span>
            <span>·</span>
            <span>10-attempt lockout</span>
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-5xl">

          {/* Hero copy */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-red" aria-hidden="true" />
              <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Internal Operations</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
              Operations
              <br />
              <span className="text-red">command centre.</span>
            </h1>

            <p className="text-white/50 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Manage KYC approvals, dispute resolution, price overrides, and flagged accounts — all from one secure panel.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {PORTAL_FEATURES.map(({ icon, title, description, color }) => {
              const c = COLOR_MAP[color];
              return (
                <div
                  key={title}
                  className={`rounded-2xl border ${c.border} bg-white/5 p-6 backdrop-blur-sm hover:bg-white/8 transition-colors`}
                >
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-xl mb-4`}>
                    {icon}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} aria-hidden="true" />
                    <h2 className="text-white font-bold text-[15px]">{title}</h2>
                  </div>
                  <p className="text-white/45 text-sm leading-relaxed">{description}</p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/admin/login"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-btn bg-red px-8 text-base font-bold text-white hover:opacity-90 transition-opacity"
              id="admin-login-cta"
            >
              Sign in to Admin Panel →
            </Link>
            <Link
              href="/admin/request-access"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-btn border border-white/15 px-8 text-base font-medium text-white/60 hover:text-white hover:border-white/30 transition-all"
            >
              Request access
            </Link>
          </div>

          {/* Security footer note */}
          <p className="text-center text-white/20 text-xs mt-8">
            This portal is restricted to authorised personnel only.
            All sessions are logged and IP-verified.
          </p>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-5">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between text-[11px] text-white/25">
          <span>{APP_NAME} · Hyderabad Pilot · v1 MVP</span>
          <Link href="/" className="hover:text-white/50 transition-colors">
            ← Back to public site
          </Link>
        </div>
      </footer>
    </div>
  );
}
