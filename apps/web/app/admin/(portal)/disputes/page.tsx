'use client';

/**
 * app/admin/(portal)/disputes/page.tsx
 * Professional disputes queue with full order timeline, evidence lightbox, and SLA tracking.
 */

import { useEffect, useState, useCallback } from 'react';
import NextImage from 'next/image';
import { adminApi, type Dispute, type AdminOrderDetail, type AdminOrderItem } from '../../../../lib/adminApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function getSla(hours: number) {
  const pct = Math.min((hours / 72) * 100, 100);
  if (hours >= 60) return { pct, bar: 'bg-red', label: 'Urgent', text: 'text-red', bg: 'bg-red/10 border-red/20' };
  if (hours >= 24) return { pct, bar: 'bg-amber', label: 'Warning', text: 'text-amber', bg: 'bg-amber/10 border-amber/20' };
  return { pct, bar: 'bg-teal', label: 'On track', text: 'text-teal', bg: 'bg-teal/10 border-teal/20' };
}

const STATUS_MAP: Record<string, string> = {
  placed: 'Order Placed',
  scheduled: 'Pickup Scheduled',
  picked_up: 'Picked Up',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ─── Order Timeline ────────────────────────────────────────────────────────────

function OrderTimeline({ order }: { order: AdminOrderDetail }) {
  const steps = [
    { key: 'placed', label: 'Order Placed', time: order.created_at, icon: '📦' },
    { key: 'scheduled', label: 'Pickup Scheduled', time: order.scheduled_at, icon: '📅' },
    { key: 'picked_up', label: 'Picked Up', time: order.picked_up_at, icon: '🚛' },
    { key: 'completed', label: 'Completed', time: order.completed_at, icon: '✅' },
  ];

  if (order.cancelled_at) {
    steps.push({ key: 'cancelled', label: 'Cancelled', time: order.cancelled_at, icon: '❌' });
  }

  const activeIdx = (() => {
    if (order.cancelled_at) return steps.length - 1;
    if (order.completed_at) return 3;
    if (order.picked_up_at) return 2;
    if (order.scheduled_at) return 1;
    return 0;
  })();

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-6 bottom-0 w-0.5 bg-border last:hidden" />
      <div className="space-y-4">
        {steps.map((step, i) => {
          const isDone = i <= activeIdx;
          const isCurrent = i === activeIdx;
          const isCancelled = step.key === 'cancelled';
          return (
            <div key={step.key} className="flex gap-4 relative">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base z-10
                ${isDone
                  ? isCancelled
                    ? 'bg-red/10 border-2 border-red'
                    : isCurrent
                    ? 'bg-navy border-2 border-navy'
                    : 'bg-teal/10 border-2 border-teal'
                  : 'bg-white border-2 border-border'
                }
              `}>
                {step.icon}
              </div>
              <div className="flex-1 pb-2">
                <div className={`text-[13px] font-semibold ${isDone ? (isCancelled ? 'text-red' : 'text-navy') : 'text-muted'}`}>
                  {step.label}
                </div>
                {step.time ? (
                  <div className="text-[11px] text-muted mt-0.5">{fmt(step.time)}</div>
                ) : (
                  <div className="text-[11px] text-muted/50 mt-0.5 italic">Not yet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ urls, initial, onClose }: { urls: string[]; initial: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initial);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
          <NextImage src={urls[idx]} alt={`Evidence ${idx + 1}`} fill className="object-contain" unoptimized />
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setIdx((p) => Math.max(0, p - 1))}
            disabled={idx === 0}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm disabled:opacity-30 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-white/60 text-sm">{idx + 1} / {urls.length}</span>
          <button
            onClick={() => setIdx((p) => Math.min(urls.length - 1, p + 1))}
            disabled={idx === urls.length - 1}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dispute Row ──────────────────────────────────────────────────────────────

function DisputeRow({
  d,
  isOpen,
  onToggle,
  onAction,
  actionLoading,
}: {
  d: Dispute;
  isOpen: boolean;
  onToggle: () => void;
  onAction: (id: string, action: 'resolve' | 'dismiss', note: string) => Promise<void>;
  actionLoading: string | null;
}) {
  const sla = getSla(d.hours_since_raised);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [note, setNote] = useState('');
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && !order && !orderLoading) {
      setOrderLoading(true);
      adminApi.getOrder(d.order_id)
        .then(setOrder)
        .catch((err: Error) => setOrderError(err.message ?? 'Failed to load order'))
        .finally(() => setOrderLoading(false));
    }
  }, [isOpen, d.order_id, order, orderLoading]);

  const addr = (() => {
    try {
      if (!order?.pickup_address) return null;
      return order.pickup_address;
    } catch { return null; }
  })();

  return (
    <>
      {lightbox !== null && d.evidence_urls && (
        <Lightbox urls={d.evidence_urls} initial={lightbox} onClose={() => setLightbox(null)} />
      )}

      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Header row */}
        <div
          className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg transition-colors"
          onClick={onToggle}
        >
          {/* SLA ring */}
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${sla.bg} border flex-shrink-0`}>
            <span className={`text-[11px] font-black ${sla.text}`}>{Math.round(d.hours_since_raised)}h</span>
            <span className={`text-[9px] font-bold ${sla.text} uppercase tracking-wide`}>{sla.label}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-navy truncate">{d.aggregator_name ?? 'Unknown Aggregator'}</span>
              <code className="bg-bg border border-border text-muted text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                #{d.order_id.slice(-8).toUpperCase()}
              </code>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                Open
              </span>
            </div>
            <p className="text-[12px] text-slate mt-1 line-clamp-1">{d.description}</p>
          </div>

          {/* SLA bar */}
          <div className="hidden sm:flex flex-col gap-1 w-32">
            <div className="flex justify-between text-[10px] text-muted">
              <span>SLA</span>
              <span>{Math.round(sla.pct)}%</span>
            </div>
            <div className="h-1.5 bg-bg rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${sla.bar}`} style={{ width: `${sla.pct}%` }} />
            </div>
          </div>

          <div className="text-[11px] text-muted hidden md:block">{fmtDate(d.created_at)}</div>

          {/* Chevron */}
          <div className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded panel */}
        {isOpen && (
          <div className="border-t border-border">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] divide-y lg:divide-y-0 lg:divide-x divide-border">

              {/* Left: full details */}
              <div className="p-5 space-y-6">

                {/* Dispute description */}
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Dispute Description</div>
                  <p className="text-[13px] text-slate leading-relaxed bg-bg rounded-xl p-3">{d.description}</p>
                </div>

                {/* Order summary */}
                {orderLoading && (
                  <div className="flex items-center gap-2 text-muted text-[13px]">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Loading order details…
                  </div>
                )}

                {orderError && (
                  <div className="text-[12px] text-red bg-red/5 border border-red/20 rounded-xl p-3">{orderError}</div>
                )}

                {order && (
                  <div className="space-y-4">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Order Details</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Order Status', value: STATUS_MAP[order.status] ?? order.status },
                        { label: 'Amount Due', value: order.amount_due ? `₹${Number(order.amount_due).toLocaleString('en-IN')}` : '—' },
                        { label: 'Seller Phone', value: order.seller_phone ?? '—' },
                        { label: 'Aggregator', value: order.aggregator_name ?? '—' },
                        { label: 'Pickup Address', value: addr ?? '—' },
                      ].map((f) => (
                        <div key={f.label} className="bg-bg rounded-xl p-3">
                          <div className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">{f.label}</div>
                          <div className="text-[13px] font-semibold text-navy">{f.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Items picked up */}
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Items</div>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item: AdminOrderItem, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-navy/5 border border-navy/10 text-navy text-[12px] font-medium px-3 py-1 rounded-full">
                              {item.material_code}
                              {item.actual_weight_kg ? ` · ${item.actual_weight_kg}kg` : item.estimated_weight_kg ? ` · ~${item.estimated_weight_kg}kg` : ''}
                              {item.unit_price_per_kg ? ` · ₹${item.unit_price_per_kg}/kg` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence images */}
                {d.evidence_urls && d.evidence_urls.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
                      Evidence Photos ({d.evidence_urls.length})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {d.evidence_urls.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setLightbox(i)}
                          className="group relative aspect-square bg-bg rounded-xl overflow-hidden border border-border hover:border-navy transition-colors"
                        >
                          <NextImage src={url} alt={`Evidence ${i + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" stroke="currentColor" strokeWidth={2}>
                              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution actions */}
                <div className="pt-2 border-t border-border">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Resolution</div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <textarea
                      rows={2}
                      placeholder="Add resolution note (required for resolve, optional for dismiss)…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 text-[13px] text-slate outline-none focus:border-navy transition-colors resize-none"
                    />
                    <div className="flex sm:flex-col gap-2 sm:gap-2">
                      <button
                        onClick={() => onAction(d.id, 'resolve', note)}
                        disabled={!!actionLoading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-teal text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-opacity hover:bg-teal/90"
                      >
                        {actionLoading === `${d.id}-resolve` ? (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : '✓'} Resolve
                      </button>
                      <button
                        onClick={() => onAction(d.id, 'dismiss', note)}
                        disabled={!!actionLoading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-border text-slate rounded-xl text-[13px] font-bold disabled:opacity-50 transition-colors hover:bg-bg"
                      >
                        {actionLoading === `${d.id}-dismiss` ? (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : '✕'} Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: order timeline */}
              <div className="p-5 bg-bg/40">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Order Timeline</div>
                {orderLoading ? (
                  <div className="space-y-3">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-10 h-10 rounded-full bg-border animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5 pt-2">
                          <div className="h-3 bg-border rounded animate-pulse w-2/3" />
                          <div className="h-2.5 bg-border rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : order ? (
                  <OrderTimeline order={order} />
                ) : (
                  <div className="text-[12px] text-muted">Timeline unavailable</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    adminApi.getDisputes()
      .then(setDisputes)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = useCallback(async (id: string, action: 'resolve' | 'dismiss', note: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      await adminApi.resolveDispute(id, action, note);
      setDisputes((prev) => prev.filter((d) => d.id !== id));
      setExpanded(null);
      setSuccessMsg(`Dispute successfully ${action === 'resolve' ? 'resolved' : 'dismissed'}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const urgent = disputes.filter((d) => d.hours_since_raised >= 60).length;
  const warning = disputes.filter((d) => d.hours_since_raised >= 24 && d.hours_since_raised < 60).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Disputes</h1>
          <p className="text-[13px] text-muted mt-1">
            {loading ? 'Loading…' : `${disputes.length} open dispute${disputes.length !== 1 ? 's' : ''} — 72-hour SLA`}
          </p>
        </div>

        {/* SLA summary pills */}
        {!loading && disputes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {urgent > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red/10 border border-red/20 text-red text-[12px] font-bold rounded-xl">
                🔴 {urgent} urgent
              </span>
            )}
            {warning > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber/10 border border-amber/20 text-amber text-[12px] font-bold rounded-xl">
                🟡 {warning} warning
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-teal/10 border border-teal/20 text-teal text-[12px] font-bold rounded-xl">
              🟢 {disputes.length - urgent - warning} on track
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red/60 hover:text-red">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="px-4 py-3 bg-teal/10 border border-teal/20 rounded-xl text-[13px] text-teal font-medium flex items-center gap-2">
          ✓ {successMsg}
        </div>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-border flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-border rounded w-1/3" />
                  <div className="h-3 bg-border rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && disputes.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-3xl mb-4">✅</div>
          <h3 className="text-[16px] font-bold text-navy mb-1">All clear!</h3>
          <p className="text-[13px] text-muted">No open disputes at this time. The platform is operating smoothly.</p>
        </div>
      )}

      {/* Dispute list */}
      <div className="space-y-3">
        {disputes.map((d) => (
          <DisputeRow
            key={d.id}
            d={d}
            isOpen={expanded === d.id}
            onToggle={() => setExpanded((prev) => (prev === d.id ? null : d.id))}
            onAction={handleAction}
            actionLoading={actionLoading}
          />
        ))}
      </div>
    </div>
  );
}
