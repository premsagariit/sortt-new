'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { adminApi, type AdminDisputeDetail, type AdminOrderDetail, type AdminOrderItem } from '@/lib/adminApi';

function fmtDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AdminDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [dispute, setDispute] = useState<AdminDisputeDetail | null>(null);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionLoading, setActionLoading] = useState<'resolve' | 'dismiss' | null>(null);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess('');
    try {
      const disputeRes = await adminApi.getDispute(params.id);
      setDispute(disputeRes);
      const orderRes = await adminApi.getOrder(disputeRes.order_id);
      setOrder(orderRes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dispute');
      setDispute(null);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAction = async (action: 'resolve' | 'dismiss') => {
    if (!dispute) return;
    setActionLoading(action);
    setError(null);
    try {
      await adminApi.resolveDispute(dispute.id, action, resolutionNote.trim() || undefined);
      setSuccess(`Dispute ${action === 'resolve' ? 'resolved' : 'dismissed'} successfully.`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate p-6">Loading dispute details...</div>;
  }

  if (error || !dispute) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-red text-sm">{error ?? 'Dispute not found'}</div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm"
          onClick={() => router.push('/admin/disputes')}
        >
          <ArrowLeft size={16} />
          Back to Disputes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm"
          onClick={() => router.push('/admin/disputes')}
        >
          <ArrowLeft size={16} />
          Back to Disputes
        </button>
        <span className="text-xs font-semibold px-2 py-1 rounded-full border border-border bg-white">
          {dispute.status.toUpperCase()}
        </span>
      </div>

      {error && <div className="text-sm text-red bg-red/5 border border-red/20 rounded-xl px-3 py-2">{error}</div>}
      {success && <div className="text-sm text-teal bg-teal/10 border border-teal/20 rounded-xl px-3 py-2">{success}</div>}

      <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
        <h1 className="text-xl font-bold" style={{ color: '#1e3a8a' }}>
          Dispute {dispute.id}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted text-xs">Order ID</div>
            <Link href={`/admin/orders/${dispute.order_id}`} className="font-semibold text-navy hover:underline">
              {dispute.order_id}
            </Link>
          </div>
          <div>
            <div className="text-muted text-xs">Issue Type</div>
            <div className="font-semibold">{dispute.issue_type}</div>
          </div>
          <div>
            <div className="text-muted text-xs">Raised By</div>
            <div className="font-semibold">{dispute.raised_by_name ?? dispute.raised_by}</div>
          </div>
          <div>
            <div className="text-muted text-xs">Raised At</div>
            <div className="font-semibold">{fmtDate(dispute.created_at)}</div>
          </div>
          <div>
            <div className="text-muted text-xs">Order Status</div>
            <div className="font-semibold">{dispute.order_status}</div>
          </div>
          <div>
            <div className="text-muted text-xs">Resolved At</div>
            <div className="font-semibold">{fmtDate(dispute.resolved_at)}</div>
          </div>
          <div>
            <div className="text-muted text-xs">Hours Since Raised</div>
            <div className="font-semibold">{Math.round(dispute.hours_since_raised)}h</div>
          </div>
        </div>

        <div>
          <div className="text-muted text-xs mb-1">Description</div>
          <p className="text-sm leading-relaxed">{dispute.description}</p>
        </div>

        {dispute.resolution_note && (
          <div>
            <div className="text-muted text-xs mb-1">Resolution Note</div>
            <p className="text-sm leading-relaxed">{dispute.resolution_note}</p>
          </div>
        )}

        {dispute.evidence && dispute.evidence.length > 0 && (
          <div>
            <div className="text-muted text-xs mb-2">Evidence</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {dispute.evidence.map((item, idx) => (
                <div key={`${item.url}-${idx}`} className="rounded-xl overflow-hidden border border-border bg-bg">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square"
                  >
                    <img src={item.url} alt={`Evidence ${idx + 1}`} className="h-full w-full object-cover" />
                  </a>
                  <div className="px-2 py-1.5 border-t border-border bg-white">
                    <div className="text-[11px] font-semibold text-slate-700">
                      Uploaded by: {item.uploaded_by_label || 'User'}
                    </div>
                    <div className="text-[10px] text-muted">{fmtDate(item.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dispute.status === 'open' && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="text-muted text-xs">Resolution Action</div>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="Add resolution note (recommended)..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={actionLoading !== null}
                className="px-3 py-2 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50"
                onClick={() => void onAction('resolve')}
              >
                {actionLoading === 'resolve' ? 'Resolving...' : 'Resolve'}
              </button>
              <button
                type="button"
                disabled={actionLoading !== null}
                className="px-3 py-2 rounded-lg border border-border bg-white text-sm font-semibold disabled:opacity-50"
                onClick={() => void onAction('dismiss')}
              >
                {actionLoading === 'dismiss' ? 'Dismissing...' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}
      </div>

      {order && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-navy">Order Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted text-xs">Order Status</div>
              <div className="font-semibold">{order.status}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Amount Due</div>
              <div className="font-semibold">{order.amount_due != null ? `Rs ${Number(order.amount_due).toFixed(2)}` : '-'}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Pickup Address</div>
              <div className="font-semibold">{order.pickup_address || '-'}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Seller</div>
              <div className="font-semibold">{order.seller_name || '-'}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Seller Phone</div>
              <div className="font-semibold">{order.seller_phone || '-'}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Aggregator</div>
              <div className="font-semibold">{order.aggregator_name || order.aggregator_business_name || '-'}</div>
            </div>
          </div>

          <div>
            <div className="text-muted text-xs mb-2">Items</div>
            {order.items.length === 0 ? (
              <p className="text-sm text-muted">No item rows recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted uppercase">
                      <th className="py-2">Material</th>
                      <th className="py-2">Estimated (kg)</th>
                      <th className="py-2">Actual (kg)</th>
                      <th className="py-2">Rate / kg</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item: AdminOrderItem, idx: number) => (
                      <tr key={`${item.material_code}-${idx}`} className="border-t border-border">
                        <td className="py-2">{item.material_code}</td>
                        <td className="py-2">{item.estimated_weight_kg ?? '-'}</td>
                        <td className="py-2">{item.actual_weight_kg ?? '-'}</td>
                        <td className="py-2">{item.unit_price_per_kg ?? '-'}</td>
                        <td className="py-2">{item.line_amount ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
