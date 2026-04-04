'use client';

/**
 * app/admin/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Admin Dashboard — Global KPIs from live backend data.
 * Fetches GET /api/admin/stats on mount.
 * Five exact counters (WARN 1): no GMV.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { adminApi, type AdminStats } from '../../lib/adminApi';
import {
  CheckCircle,
  ShieldCheck,
  Warning,
  Package,
  Buildings,
} from 'phosphor-react';

type IconComponent = React.ComponentType<{ size?: number | string }>;

const CheckCircleIcon: IconComponent = CheckCircle;
const ShieldCheckIcon: IconComponent = ShieldCheck;
const WarningIcon: IconComponent = Warning;
const PackageIcon: IconComponent = Package;
const BuildingsIcon: IconComponent = Buildings;

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch((err) => setError(err.message ?? 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-bold text-navy tracking-tight">Platform Overview</h2>
        <p className="text-[13px] text-muted mt-0.5">Live counters — no page refresh needed</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Pending KYC"
          value={stats?.total_pending_kyc}
          loading={loading}
          color="text-amber"
          icon={<ShieldCheckIcon size={22} />}
          href="/admin/kyc"
        />
        <StatCard
          title="Open Disputes"
          value={stats?.total_open_disputes}
          loading={loading}
          color="text-red"
          icon={<WarningIcon size={22} />}
          href="/admin/disputes"
        />
        <StatCard
          title="Orders Today"
          value={stats?.total_orders_today}
          loading={loading}
          color="text-navy"
          icon={<PackageIcon size={22} />}
        />
        <StatCard
          title="Completed Orders"
          value={stats?.total_completed_orders}
          loading={loading}
          color="text-teal"
          icon={<CheckCircleIcon size={22} />}
        />
        <StatCard
          title="Active Aggregators"
          value={stats?.total_active_aggregators}
          loading={loading}
          color="text-navySoft"
          icon={<BuildingsIcon size={22} />}
          href="/admin/flagged"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActionCard
          title="KYC Queue"
          description="Review pending aggregator verification documents"
          href="/admin/kyc"
          count={stats?.total_pending_kyc}
          urgent={!!stats && stats.total_pending_kyc > 0}
        />
        <QuickActionCard
          title="Open Disputes"
          description="Resolve disputes within 72-hour SLA"
          href="/admin/disputes"
          count={stats?.total_open_disputes}
          urgent={!!stats && stats.total_open_disputes > 0}
        />
        <QuickActionCard
          title="Price Override"
          description="Set manual scrap rates for any material"
          href="/admin/prices"
        />
        <QuickActionCard
          title="Flagged Aggregators"
          description="Aggregators with avg rating below 3.0 after 10+ orders"
          href="/admin/flagged"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  color,
  icon,
  href,
}: {
  title: string;
  value?: number;
  loading: boolean;
  color: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
      <div className="absolute top-3 right-3 opacity-10">{icon}</div>
      <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">
        {title}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-bg rounded animate-pulse mt-1" />
      ) : (
        <div className={`text-[28px] font-bold font-mono leading-none ${color}`}>
          {value ?? '—'}
        </div>
      )}
    </div>
  );

  return href ? <a href={href} className="block">{content}</a> : content;
}

function QuickActionCard({
  title,
  description,
  href,
  count,
  urgent,
}: {
  title: string;
  description: string;
  href: string;
  count?: number;
  urgent?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
        urgent ? 'border-amber/20' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-navy">{title}</h3>
          <p className="text-[12px] text-muted mt-0.5">{description}</p>
        </div>
        {count !== undefined && count > 0 && (
          <span className="ml-3 flex-shrink-0 bg-red text-white text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
            {count}
          </span>
        )}
      </div>
      <div className="mt-3 text-[12px] text-navy font-semibold flex items-center gap-1">
        Open →
      </div>
    </a>
  );
}
