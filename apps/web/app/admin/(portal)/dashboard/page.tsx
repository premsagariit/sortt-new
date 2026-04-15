'use client';

/**
 * app/admin/(portal)/dashboard/page.tsx
 * Professional Admin Dashboard with live KPIs, trend indicators, and quick actions.
 */

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { adminApi, type AdminStats } from '../../../../lib/adminApi';
import { BoneyardBlock } from '@/components/ui/Boneyard';

function CountUp({ target, loading }: { target: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading || target === 0) { setDisplay(target); return; }
    const start = 0;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, loading]);

  return <>{display}</>;
}

const STAT_CARDS = [
  {
    key: 'total_pending_kyc' as keyof AdminStats,
    label: 'Pending KYC',
    sub: 'Awaiting review',
    href: '/admin/kyc',
    accentClass: 'from-amber/20 to-amber/5 border-amber/30',
    iconBg: 'bg-amber/10',
    iconColor: 'text-amber',
    valueColor: 'text-amber',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: 'total_open_disputes' as keyof AdminStats,
    label: 'Open Disputes',
    sub: '72-hour SLA',
    href: '/admin/disputes',
    accentClass: 'from-red/20 to-red/5 border-red/30',
    iconBg: 'bg-red/10',
    iconColor: 'text-red',
    valueColor: 'text-red',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
        <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  {
    key: 'total_orders_today' as keyof AdminStats,
    label: 'Orders Today',
    sub: 'Rolling 24h',
    href: '/admin/orders',
    accentClass: 'from-navy/20 to-navy/5 border-navy/30',
    iconBg: 'bg-navy/10',
    iconColor: 'text-navy',
    valueColor: 'text-navy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: 'total_completed_orders' as keyof AdminStats,
    label: 'Completed Orders',
    sub: 'All time',
    href: '/admin/orders?status=completed',
    accentClass: 'from-teal/20 to-teal/5 border-teal/30',
    iconBg: 'bg-teal/10',
    iconColor: 'text-teal',
    valueColor: 'text-teal',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'total_active_aggregators' as keyof AdminStats,
    label: 'Active Aggregators',
    sub: 'Online now',
      href: '/admin/active-aggregators',
    accentClass: 'from-navySoft/20 to-navySoft/5 border-navySoft/30',
    iconBg: 'bg-navySoft/10',
    iconColor: 'text-navySoft',
    valueColor: 'text-navySoft',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

const QUICK_ACTIONS = [
  {
    title: 'KYC Verification Queue',
    description: 'Review and approve pending aggregator identity documents',
    href: '/admin/kyc',
    emoji: '🪪',
    statKey: 'total_pending_kyc' as keyof AdminStats,
    urgentThreshold: 1,
    color: 'border-l-amber',
    badgeClass: 'bg-amber text-white',
  },
  {
    title: 'Dispute Resolution',
    description: 'Manage open disputes within the 72-hour SLA window',
    href: '/admin/disputes',
    emoji: '⚖️',
    statKey: 'total_open_disputes' as keyof AdminStats,
    urgentThreshold: 1,
    color: 'border-l-red',
    badgeClass: 'bg-red text-white',
  },
  {
    title: 'Live Price Override',
    description: 'Set manual scrap material rates — all actions are audited',
    href: '/admin/prices',
    emoji: '📈',
    statKey: null,
    urgentThreshold: 0,
    color: 'border-l-teal',
    badgeClass: 'bg-teal text-white',
  },
  {
    title: 'Flagged Aggregators',
    description: 'Aggregators with avg rating below 3.0 after 10+ orders',
    href: '/admin/flagged',
    emoji: '🚩',
    statKey: null,
    urgentThreshold: 0,
    color: 'border-l-navySoft',
    badgeClass: 'bg-navySoft text-white',
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = () => {
    setLoading(true);
    adminApi.getStats()
      .then((s) => { setStats(s); setLastUpdated(new Date()); })
      .catch((err) => setError(err.message ?? 'Failed to load stats'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  const disputeRatio = stats
    ? Math.round((stats.total_open_disputes / Math.max(stats.total_orders_today, 1)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Platform Overview</h1>
          <p className="text-[13px] text-muted mt-1">
            {lastUpdated
              ? `Last refreshed at ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Loading live data…'}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-[13px] font-semibold text-navy hover:bg-bg transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} stroke="currentColor" strokeWidth={2}>
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map((card) => {
          const value = stats?.[card.key] ?? 0;
          const inner = (
            <div className={`bg-gradient-to-br ${card.accentClass} border rounded-2xl p-5 relative overflow-hidden hover:shadow-md transition-all group`}>
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-4`}>
                {card.icon}
              </div>
              <div className={`text-3xl font-black font-mono leading-none ${card.valueColor} mb-1`}>
                {loading ? (
                  <BoneyardBlock className="h-9 w-16 bg-white/40" />
                ) : (
                  <CountUp target={value} loading={loading} />
                )}
              </div>
              <div className="text-[13px] font-semibold text-navy">{card.label}</div>
              <div className="text-[11px] text-muted mt-0.5">{card.sub}</div>
              {card.href && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-navy/40">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}
            </div>
          );
          return card.href ? (
            <Link key={card.key} href={card.href} className="block">{inner}</Link>
          ) : (
            <div key={card.key}>{inner}</div>
          );
        })}
      </div>

      {/* Status bar row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dispute health */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-navy">Dispute Health</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${disputeRatio > 20 ? 'bg-red/10 text-red' : 'bg-teal/10 text-teal'}`}>
                {disputeRatio}% dispute rate
              </span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${disputeRatio > 20 ? 'bg-red' : 'bg-teal'}`}
                style={{ width: `${Math.min(disputeRatio, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted mt-2">
              {stats.total_open_disputes} open disputes vs {stats.total_orders_today} orders today
            </p>
          </div>

          {/* Order completion */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-navy">Completion Rate</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal/10 text-teal">All time</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-teal w-full" />
            </div>
            <p className="text-[11px] text-muted mt-2">
              {stats.total_completed_orders.toLocaleString('en-IN')} total completed pick-ups
            </p>
          </div>

          {/* Aggregator activity */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-navy">Aggregator Activity</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal/10 text-teal">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse inline-block" />
                Live
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy">{stats.total_active_aggregators}</span>
              <span className="text-[12px] text-muted">aggregators online</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-[16px] font-bold text-navy mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const count = action.statKey ? stats?.[action.statKey] : undefined;
            const isUrgent = count !== undefined && count >= action.urgentThreshold;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-white border border-border border-l-4 rounded-2xl p-5 hover:shadow-md transition-all flex items-start gap-4"
                style={{ borderLeftColor: isUrgent ? (action.color.includes('red') ? '#C0392B' : '#B7791F') : '#DDE3EA' }}
              >
                <div className="text-2xl leading-none mt-0.5">{action.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[14px] font-bold text-navy">{action.title}</h3>
                    {count !== undefined && count > 0 && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${action.badgeClass}`}>
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{action.description}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-muted group-hover:text-navy transition-colors flex-shrink-0 mt-1" stroke="currentColor" strokeWidth={2}>
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
