'use client';

/**
 * app/admin/disputes/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Disputes management — SLA bar, chat history, resolve/dismiss.
 * 72-hour SLA indicator: hours_since_raised from backend.
 * audit_log inside transaction guaranteed by backend (BLOCK 3).
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { adminApi, type Dispute } from '../../../lib/adminApi';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getDisputes()
      .then(setDisputes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: 'resolve' | 'dismiss') => {
    setActionLoading(`${id}-${action}`);
    try {
      await adminApi.resolveDispute(id, action, resolutionNote[id]);
      setDisputes((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getSlaInfo = (hours: number) => {
    const pct = Math.min((hours / 72) * 100, 100);
    if (hours >= 60) return { pct, barClass: 'bg-red', label: 'Urgent', textColor: 'text-red' };
    if (hours >= 24) return { pct, barClass: 'bg-orange-500', label: 'Warning', textColor: 'text-orange-600' };
    return { pct, barClass: 'bg-teal', label: 'On track', textColor: 'text-teal' };
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold text-navy tracking-tight">Disputes</h2>
        <p className="text-[13px] text-muted mt-0.5">
          {loading ? 'Loading…' : `${disputes.length} open dispute${disputes.length !== 1 ? 's' : ''} — 72-hour SLA`}
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium">
          {error}
        </div>
      )}

      {!loading && disputes.length === 0 && !error && (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">No open disputes</p>
        </div>
      )}

      <div className="space-y-3">
        {disputes.map((d) => {
          const sla = getSlaInfo(d.hours_since_raised);
          const isOpen = expanded === d.id;
          return (
            <div key={d.id} className="bg-white border border-border rounded-xl overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg-alt transition-colors"
                onClick={() => setExpanded(isOpen ? null : d.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy text-[13px] truncate">
                      {d.aggregator_name ?? 'Unknown Aggregator'}
                    </span>
                    <span className="font-mono text-[11px] text-muted">#{d.order_id.slice(-8)}</span>
                  </div>
                  <p className="text-[12px] text-slate mt-0.5 truncate">{d.description}</p>
                </div>

                {/* SLA bar */}
                <div className="flex items-center gap-2 w-36">
                  <div className="flex-1 h-1 border border-border rounded-full overflow-hidden bg-bg">
                    <div
                      className={`h-full rounded-full transition-all ${sla.barClass}`}
                      style={{ width: `${sla.pct}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-mono font-bold ${sla.textColor} min-w-[36px] text-right`}>
                    {Math.round(d.hours_since_raised)}h
                  </span>
                </div>

                <div className="text-[12px] text-muted">{formatDate(d.created_at)}</div>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-600">
                  Open
                </span>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-border px-5 py-4 bg-bg-alt space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <div>
                      <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Dispute</div>
                      <p className="text-slate">{d.description}</p>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Order Status</div>
                      <span className="font-mono text-navy">{d.order_status}</span>
                    </div>
                  </div>

                  {d.evidence_urls?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {d.evidence_urls.map((url, index) => (
                        <a
                          key={`${d.id}-evidence-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-white border border-border rounded-xl overflow-hidden"
                        >
                          <div className="relative w-full h-44 object-cover">
                            <NextImage 
                              src={url} 
                              alt={`Evidence ${index + 1}`} 
                              fill 
                              className="object-cover" 
                              unoptimized
                            />
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Resolution note (optional)…"
                      value={resolutionNote[d.id] ?? ''}
                      onChange={(e) =>
                        setResolutionNote((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                      className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-[13px] text-slate outline-none focus:border-transparent transition-colors"
                    />
                    <button
                      onClick={() => handleAction(d.id, 'resolve')}
                      disabled={actionLoading === `${d.id}-resolve`}
                      className="px-4 py-2 bg-teal text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 transition-opacity"
                    >
                      {actionLoading === `${d.id}-resolve` ? 'Resolving…' : 'Resolve'}
                    </button>
                    <button
                      onClick={() => handleAction(d.id, 'dismiss')}
                      disabled={actionLoading === `${d.id}-dismiss`}
                      className="px-4 py-2 bg-white border border-border text-slate rounded-lg text-[13px] font-semibold disabled:opacity-50 hover:bg-bg transition-colors"
                    >
                      {actionLoading === `${d.id}-dismiss` ? 'Dismissing…' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
