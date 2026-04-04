'use client';

/**
 * app/admin/flagged/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Flagged Aggregators — avg rating < 3.0 after 10+ completed orders.
 * Fetches from GET /api/admin/flagged.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { adminApi, type FlaggedAggregator } from '../../../lib/adminApi';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= Math.round(rating) ? 'text-orange-500' : 'text-muted'}
        >
          ★
        </span>
      ))}
      <span className="ml-1.5 font-mono text-[13px] font-bold text-navy">
        {Number(rating).toFixed(2)}
      </span>
    </div>
  );
}

export default function FlaggedPage() {
  const [aggregators, setAggregators] = useState<FlaggedAggregator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getFlagged()
      .then(setAggregators)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold text-navy tracking-tight">Flagged Aggregators</h2>
        <p className="text-[13px] text-muted mt-0.5">
          {loading ? 'Loading…' : `${aggregators.length} aggregator${aggregators.length !== 1 ? 's' : ''} below 3.0 rating after 10+ orders`}
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium">
          {error}
        </div>
      )}

      {!loading && aggregators.length === 0 && !error && (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3 opacity-30">✓</div>
          <p className="text-sm">No flagged aggregators — all ratings above threshold</p>
        </div>
      )}

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {aggregators.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                {['Business', 'City', 'Avg Rating', 'Total Orders', 'Last Order', 'KYC Status'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-bold text-muted uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggregators.map((agg) => (
                <tr key={agg.aggregator_id} className="border-b border-border hover:bg-bg-alt transition-colors">
                  <td className="px-4 py-3 font-semibold text-navy text-[13px]">
                    {agg.business_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-slate">{agg.city_code}</td>
                  <td className="px-4 py-3">
                    <StarRating rating={agg.avg_rating} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-slate">{agg.total_orders}</td>
                  <td className="px-4 py-3 text-[12px] text-slate">{formatDate(agg.last_order_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        agg.kyc_status === 'verified'
                          ? 'bg-teal/10 text-teal'
                          : agg.kyc_status === 'pending'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-red/10 text-red'
                      }`}
                    >
                      {agg.kyc_status.charAt(0).toUpperCase() + agg.kyc_status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
