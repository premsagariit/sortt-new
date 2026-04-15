'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi, type PriceEntry } from '../../../../lib/adminApi';
import { BoneyardMetricGrid } from '@/components/ui/Boneyard';

type AdminStatsLite = {
  total_pending_kyc: number;
  total_open_disputes: number;
  total_orders_today: number;
  total_completed_orders: number;
  total_active_aggregators: number;
};

function formatDateTime(value: string | null): string {
  if (!value) return 'N/A';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminConfigPage() {
  const [stats, setStats] = useState<AdminStatsLite | null>(null);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, pricesRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getPrices(),
        ]);
        if (!mounted) return;
        setStats(statsRes as AdminStatsLite);
        setPrices(pricesRes);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load system config');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const latestRateUpdate = useMemo(() => {
    if (prices.length === 0) return null;
    const latest = prices
      .map((p) => p.scraped_at)
      .filter((v) => typeof v === 'string')
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    return latest;
  }, [prices]);

  const manualOverrides = useMemo(
    () => prices.filter((p) => p.is_manual_override).length,
    [prices]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy tracking-tight">System Config</h1>
        <p className="text-[13px] text-muted mt-1">
          Runtime and data freshness snapshot for admin operations.
        </p>
      </div>

      {error ? (
        <div className="px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium">
          {error}
        </div>
      ) : null}

      {loading ? (
        <BoneyardMetricGrid cards={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="text-[11px] uppercase font-bold text-muted tracking-wider">Price Index</div>
              <div className="text-[22px] font-black text-navy mt-2">{prices.length}</div>
              <div className="text-[12px] text-muted">materials tracked</div>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="text-[11px] uppercase font-bold text-muted tracking-wider">Manual Overrides</div>
              <div className="text-[22px] font-black text-amber mt-2">{manualOverrides}</div>
              <div className="text-[12px] text-muted">active override entries</div>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="text-[11px] uppercase font-bold text-muted tracking-wider">Last Price Refresh</div>
              <div className="text-[15px] font-bold text-navy mt-2">{formatDateTime(latestRateUpdate)}</div>
              <div className="text-[12px] text-muted">from `price_index` feed</div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5">
            <h2 className="text-[14px] font-bold text-navy mb-3">Operational Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-[10px] text-muted uppercase tracking-wide font-bold">Pending KYC</div>
                <div className="text-[18px] font-black text-navy">{stats?.total_pending_kyc ?? 0}</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-[10px] text-muted uppercase tracking-wide font-bold">Open Disputes</div>
                <div className="text-[18px] font-black text-navy">{stats?.total_open_disputes ?? 0}</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-[10px] text-muted uppercase tracking-wide font-bold">Orders Today</div>
                <div className="text-[18px] font-black text-navy">{stats?.total_orders_today ?? 0}</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-[10px] text-muted uppercase tracking-wide font-bold">Completed Orders</div>
                <div className="text-[18px] font-black text-navy">{stats?.total_completed_orders ?? 0}</div>
              </div>
              <div className="bg-bg rounded-xl p-3 border border-border">
                <div className="text-[10px] text-muted uppercase tracking-wide font-bold">Active Aggregators</div>
                <div className="text-[18px] font-black text-teal">{stats?.total_active_aggregators ?? 0}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
