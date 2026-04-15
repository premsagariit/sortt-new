'use client';

/**
 * app/admin/(portal)/flagged/page.tsx
 * Professional flagged aggregators view with risk scoring, star ratings, and detail cards.
 */

import { useEffect, useState } from 'react';
import { adminApi, type FlaggedAggregator } from '../../../../lib/adminApi';
import { BoneyardCardList } from '@/components/ui/Boneyard';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2; // half-star precision
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rounded);
        const half = !filled && star <= rounded + 0.5;
        return (
          <svg
            key={star}
            viewBox="0 0 24 24"
            className={`w-4 h-4 ${filled ? 'text-amber fill-amber' : half ? 'text-amber' : 'text-border fill-border'}`}
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={`half-${star}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="50%" stopColor="#B7791F" />
                    <stop offset="50%" stopColor="#DDE3EA" />
                  </linearGradient>
                </defs>
                <path fill={`url(#half-${star})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </>
            ) : (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            )}
          </svg>
        );
      })}
      <span className="ml-1 text-[13px] font-black text-navy font-mono">
        {Number(rating).toFixed(2)}
      </span>
    </div>
  );
}

function RiskBadge({ rating }: { rating: number }) {
  if (rating < 1.5) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red text-white">🔴 High Risk</span>;
  if (rating < 2.5) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red/20 text-red border border-red/30">🟠 Elevated</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber/10 text-amber border border-amber/30">🟡 Low Risk</span>;
}

export default function FlaggedPage() {
  const [aggregators, setAggregators] = useState<FlaggedAggregator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getFlagged()
      .then(setAggregators)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const highRisk = aggregators.filter((a) => a.avg_rating < 1.5).length;
  const elevated = aggregators.filter((a) => a.avg_rating >= 1.5 && a.avg_rating < 2.5).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Flagged Aggregators</h1>
          <p className="text-[13px] text-muted mt-1">
            {loading
              ? 'Loading…'
              : `${aggregators.length} aggregator${aggregators.length !== 1 ? 's' : ''} with avg rating below 3.0 after 10+ orders`}
          </p>
        </div>

        {!loading && aggregators.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {highRisk > 0 && (
              <span className="px-3 py-1.5 bg-red/10 text-red text-[12px] font-bold rounded-xl border border-red/20">
                🔴 {highRisk} High Risk
              </span>
            )}
            {elevated > 0 && (
              <span className="px-3 py-1.5 bg-orange-100 text-orange-600 text-[12px] font-bold rounded-xl border border-orange-200">
                🟠 {elevated} Elevated
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <BoneyardCardList rows={3} />
      )}

      {/* Empty state */}
      {!loading && aggregators.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-3xl mb-4">⭐</div>
          <h3 className="text-[16px] font-bold text-navy mb-1">All aggregators performing well!</h3>
          <p className="text-[13px] text-muted">No aggregators below the 3.0 rating threshold after 10+ orders.</p>
        </div>
      )}

      {/* Flagged cards */}
      {!loading && aggregators.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {aggregators.map((agg) => {
            const initials = agg.business_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
            return (
              <div
                key={agg.aggregator_id}
                className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red/20 to-red/10 border border-red/20 flex items-center justify-center text-red font-black text-[14px] flex-shrink-0">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-[14px] font-bold text-navy">{agg.business_name}</div>
                        <div className="text-[11px] text-muted mt-0.5">🏙️ {agg.city_code}</div>
                      </div>
                      <RiskBadge rating={agg.avg_rating} />
                    </div>

                    <div className="mt-3">
                      <StarRating rating={agg.avg_rating} />
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Orders', value: agg.total_orders.toString() },
                    { label: 'KYC Status', value: agg.kyc_status.charAt(0).toUpperCase() + agg.kyc_status.slice(1) },
                    { label: 'Last Order', value: fmtDate(agg.last_order_at) },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-bg rounded-xl p-3 text-center">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">{stat.label}</div>
                      <div className={`text-[12px] font-bold ${
                        stat.label === 'KYC Status'
                          ? agg.kyc_status === 'verified'
                            ? 'text-teal'
                            : agg.kyc_status === 'pending'
                            ? 'text-amber'
                            : 'text-red'
                          : 'text-navy'
                      }`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Rating bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-muted mb-1">
                    <span>Rating</span>
                    <span>{Number(agg.avg_rating).toFixed(2)} / 5.0</span>
                  </div>
                  <div className="h-2 bg-bg border border-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        agg.avg_rating < 1.5 ? 'bg-red' : agg.avg_rating < 2.5 ? 'bg-orange-500' : 'bg-amber'
                      }`}
                      style={{ width: `${(agg.avg_rating / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
