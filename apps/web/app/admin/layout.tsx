/**
 * app/admin/layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin shell layout with:
 * - AdminAuthGuard (verifies sessionStorage JWT via /api/users/me — V7)
 * - InactivityGuard (15-min timeout, 30-second polling)
 * - Session timer pill in topbar
 * - Sidebar with Next.js Link navigation
 * ─────────────────────────────────────────────────────────────────
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import {
  ChartBar,
  Buildings,
  ShieldCheck,
  Gear,
  SignOut,
  Globe,
  WarningCircle,
  Timer,
  List,
  X,
  IconWeight,
} from 'phosphor-react';
import Image from 'next/image';
import { AdminAuthGuard } from '../../components/admin/AdminAuthGuard';
import { InactivityGuard, formatCountdown } from '../../components/admin/InactivityGuard';

type IconComponent = React.ComponentType<{ size?: number | string; weight?: IconWeight }>;

const ChartBarIcon: IconComponent = ChartBar;
const BuildingsIcon: IconComponent = Buildings;
const ShieldCheckIcon: IconComponent = ShieldCheck;
const GearIcon: IconComponent = Gear;
const SignOutIcon: IconComponent = SignOut;
const GlobeIcon: IconComponent = Globe;
const WarningCircleIcon: IconComponent = WarningCircle;
const TimerIcon: IconComponent = Timer;

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: ChartBarIcon },
  { label: 'KYC Queue', href: '/admin/kyc', icon: ShieldCheckIcon },
  { label: 'Disputes', href: '/admin/disputes', icon: WarningCircleIcon },
  { label: 'Price Override', href: '/admin/prices', icon: GlobeIcon },
  { label: 'Flagged', href: '/admin/flagged', icon: BuildingsIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  // Remaining session time in ms (15 min initially, ticked down by InactivityGuard)
  const [remainingMs, setRemainingMs] = useState(15 * 60 * 1000);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTick = useCallback((ms: number) => setRemainingMs(ms), []);

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_token');
    document.cookie = 'admin_token=; path=/; max-age=0; samesite=strict';
    sessionStorage.removeItem('lastActivity');
    await signOut({ redirectUrl: '/admin/login' });
  };

  // Skip the guard and the sidebar entirely for auth routes
  const isAuthRoute = [
    '/admin/login',
    '/admin/request-access',
    '/admin/forgot-password',
    '/admin/reset-password',
    '/admin/create-password'
  ].includes(pathname || '');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Warning colour when < 2 minutes remain
  const isNearTimeout = remainingMs < 2 * 60 * 1000;

  const navContent = (
    <>
      <div className="px-4 py-5 border-b border-white/8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
          <Image src="/icon.png" alt="Sortt" fill className="object-cover" />
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-tight">Sortt</div>
          <div className="text-white/40 text-[9px] uppercase tracking-widest font-semibold">Admin</div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        <div className="px-3 pb-2 text-[9px] font-bold text-white/30 uppercase tracking-widest">Management</div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium relative transition-all
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-red rounded-r" />
              )}
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-white/8 pt-3 space-y-1">
        <Link
          href="/admin/config"
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-white/60 hover:bg-white/5 hover:text-white/90 rounded transition-all"
        >
          <GearIcon size={18} />
          <span>System Config</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red hover:bg-red/5 rounded transition-all"
        >
          <SignOutIcon size={18} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    // AdminAuthGuard checks sessionStorage JWT + /api/users/me DB check (V7)
    <AdminAuthGuard>
      {/* InactivityGuard: polls every 30s, resets on interaction events */}
      <InactivityGuard onTick={handleTick} />

      <div className="flex h-screen overflow-hidden bg-bg" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-navy flex flex-col shadow-2xl overflow-y-auto">
              {navContent}
            </aside>
          </div>
        )}

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="hidden md:flex w-60 bg-navy flex-col flex-shrink-0 overflow-y-auto">
          {navContent}
        </aside>

        {/* ── Main Content ─────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <header className="min-h-[60px] bg-white border-b border-border flex items-center justify-between px-3 md:px-8 py-2 flex-shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-navy hover:bg-bg transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
              </button>
              <div className="text-[12px] md:text-[13px] text-muted truncate">
                <span className="md:inline hidden">Admin /</span>
                <span className="text-slate font-semibold ml-0 md:ml-1">Internal Control Center</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Session timer pill */}
              <div
                className={`flex items-center gap-1 text-[10px] md:text-[11px] px-2 md:px-3 py-1 rounded-full border font-mono ${
                  isNearTimeout
                    ? 'bg-red/5 border-red/20 text-red'
                    : 'bg-amberLight border-amber/20 text-amber'
                }`}
              >
                <TimerIcon size={12} weight="fill" />
                <span>{formatCountdown(remainingMs)}</span>
              </div>
              <div className="hidden md:flex flex-col items-end mr-1">
                <span className="text-[13px] font-bold text-navy">Super Admin</span>
                <span className="text-[9px] text-amber font-bold uppercase tracking-wider bg-amberLight px-1.5 rounded">
                  Production
                </span>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-teal flex items-center justify-center text-white font-bold text-xs md:text-sm">
                SA
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </AdminAuthGuard>
  );
}
