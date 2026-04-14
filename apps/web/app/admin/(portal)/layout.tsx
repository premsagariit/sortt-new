/**
 * app/admin/(portal)/layout.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin portal shell layout (authenticated routes only).
 * Included:
 * - AdminAuthGuard
 * - InactivityGuard
 * - Sidebar (collapsible on desktop)
 * ─────────────────────────────────────────────────────────────────
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  UserCircle,
  ShoppingBag,
  ChartLine,
  MapPin,
  IconWeight,
} from 'phosphor-react';
import Image from 'next/image';
import { AdminAuthGuard } from '../../../components/admin/AdminAuthGuard';
import { InactivityGuard, formatCountdown } from '../../../components/admin/InactivityGuard';

type IconComponent = React.ComponentType<{ size?: number | string; weight?: IconWeight; className?: string }>;

const ChartBarIcon: IconComponent = ChartBar;
const BuildingsIcon: IconComponent = Buildings;
const ShieldCheckIcon: IconComponent = ShieldCheck;
const GearIcon: IconComponent = Gear;
const SignOutIcon: IconComponent = SignOut;
const GlobeIcon: IconComponent = Globe;
const WarningCircleIcon: IconComponent = WarningCircle;
const TimerIcon: IconComponent = Timer;
const UserCircleIcon: IconComponent = UserCircle;
const ShoppingBagIcon: IconComponent = ShoppingBag;
const ChartLineIcon: IconComponent = ChartLine;
const MapIconComp: IconComponent = MapPin;

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin/dashboard', icon: ChartBarIcon },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBagIcon },
  { label: 'Analytics', href: '/admin/analytics', icon: ChartLineIcon },
  { label: 'Map', href: '/admin/map', icon: MapIconComp },
  { label: 'KYC Queue', href: '/admin/kyc', icon: ShieldCheckIcon },
  { label: 'Disputes', href: '/admin/disputes', icon: WarningCircleIcon },
  { label: 'Price Override', href: '/admin/prices', icon: GlobeIcon },
  { label: 'Flagged', href: '/admin/flagged', icon: BuildingsIcon },
  { label: 'My Profile', href: '/admin/profile', icon: UserCircleIcon },
];

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [remainingMs, setRemainingMs] = useState(15 * 60 * 1000);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTick = useCallback((ms: number) => setRemainingMs(ms), []);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    document.cookie = 'admin_token=; path=/; max-age=0; samesite=strict';
    sessionStorage.removeItem('lastActivity');
    router.push('/admin/login?reason=timeout');
  };

  const isNearTimeout = remainingMs < 2 * 60 * 1000;

  const NavContent = ({ collapsed }: { collapsed: boolean }) => (
    <>
      <div className={`px-4 py-5 border-b border-white/8 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 min-h-[76px]`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
            <Image src="/icon.png" alt="Sortt" fill className="object-cover" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-white font-bold text-sm tracking-tight truncate">Sortt</div>
              <div className="text-white/40 text-[9px] uppercase tracking-widest font-semibold">Admin</div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-x-hidden overflow-y-auto no-scrollbar">
        <div className={`px-4 pb-2 text-[9px] font-bold text-white/30 uppercase tracking-widest ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? '—' : 'Management'}
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center px-4 py-3 text-[13px] font-medium relative transition-colors group
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }
                ${collapsed ? 'justify-center' : 'gap-3'}
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-red rounded-r" />
              )}
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              
              {/* Tooltip for collapsed state (hover) */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-white text-navy text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-white/8 pt-3 space-y-1 overflow-visible">
        <Link
          href="/admin/config"
          title={collapsed ? "System Config" : undefined}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`group relative flex items-center px-4 py-3 text-[13px] font-medium text-white/60 hover:bg-white/5 hover:text-white/90 rounded transition-all ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <GearIcon size={20} className="shrink-0" />
          {!collapsed && <span className="truncate">System Config</span>}
          {collapsed && (
            <div className="absolute left-full ml-5 px-2 py-1 bg-white text-navy text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
              System Config
            </div>
          )}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={`group relative w-full flex items-center px-4 py-3 text-[13px] font-medium text-red hover:bg-red/5 rounded transition-all ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <SignOutIcon size={20} className="shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
          {collapsed && (
            <div className="absolute left-full ml-5 px-2 py-1 bg-white text-navy text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
              Logout
            </div>
          )}
        </button>
      </div>
    </>
  );

  return (
    <AdminAuthGuard>
      <InactivityGuard onTick={handleTick} />

      <div className="flex h-screen overflow-hidden bg-bg" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* Mobile slide-out menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-navy flex flex-col shadow-2xl overflow-y-auto no-scrollbar">
              <NavContent collapsed={false} />
            </aside>
          </div>
        )}

        {/* Desktop Sidebar (Collapsible) */}
        <aside 
          className={`hidden md:flex flex-col flex-shrink-0 bg-navy overflow-visible transition-all duration-300 ease-in-out border-r border-navySoft relative ${isSidebarCollapsed ? 'w-[72px]' : 'w-60'}`}
        >
          <NavContent collapsed={isSidebarCollapsed} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Topbar */}
          <header className="min-h-[60px] bg-white border-b border-border flex items-center justify-between px-3 md:px-6 py-2 flex-shrink-0 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              
              {/* Desktop Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate hover:bg-bg transition-colors"
                aria-label="Toggle sidebar"
              >
                <List size={22} weight="bold" />
              </button>

              {/* Mobile Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-navy hover:bg-bg transition-colors shrink-0"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
              </button>
              
              <div className="text-[12px] md:text-[13px] text-muted truncate flex-shrink">
                <span className="hidden sm:inline">Admin /</span>
                <span className="text-navy font-semibold ml-0 sm:ml-1 hidden sm:inline">Internal Control Center</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              {/* Session timer pill */}
              <div
                className={`flex items-center gap-1.5 text-[10px] md:text-[11px] px-2.5 md:px-3 py-1 rounded-full border font-mono ${
                  isNearTimeout
                    ? 'bg-red/5 border-red/20 text-red'
                    : 'bg-amberLight border-amber/20 text-amber'
                }`}
              >
                <TimerIcon size={14} weight={isNearTimeout ? "fill" : "regular"} />
                <span className="font-semibold tracking-wide">{formatCountdown(remainingMs)}</span>
              </div>
              
              <div className="hidden md:flex flex-col items-end mr-1">
                <span className="text-[13px] font-bold text-navy leading-tight">Super Admin</span>
                <span className="text-[9px] text-amber font-bold uppercase tracking-wider bg-amberLight px-1.5 py-0.5 rounded leading-tight mt-0.5">
                  Production
                </span>
              </div>
              <Link
                href="/admin/profile"
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-teal flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm hover:ring-2 hover:ring-teal/40 transition-all"
                title="View profile"
              >
                SA
              </Link>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto bg-bg p-4 md:p-8 no-scrollbar">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </AdminAuthGuard>
  );
}
