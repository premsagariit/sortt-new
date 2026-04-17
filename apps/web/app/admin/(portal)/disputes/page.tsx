'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminApi, type Dispute } from '../../../../lib/adminApi';
import { RefreshCw } from 'lucide-react';
import { BoneyardTable } from '@/components/ui/Boneyard';

type StatusTab = 'all' | 'open' | 'closed' | 'dismissed';

const ISSUE_LABELS: Record<string, string> = {
  wrong_weight: 'Wrong Weight',
  payment_not_made: 'Payment Not Made',
  no_show: 'No Show',
  abusive_behaviour: 'Abusive Behaviour',
  other: 'Other',
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

const PAGE_SIZE = 30;

function StatusBadge({ status }: { status: Dispute['status'] }) {
  const label = status === 'resolved' ? 'closed' : status;
  const cls =
    status === 'open'
      ? 'bg-red/10 border-red/20 text-red'
      : status === 'resolved'
        ? 'bg-teal/10 border-teal/20 text-teal'
        : 'bg-slate/10 border-slate/20 text-slate-700';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${cls}`}>
      {label}
    </span>
  );
}

export default function DisputesPage() {
  const router = useRouter();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [issueType, setIssueType] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getDisputes({
        status: statusTab,
        search: searchInput.trim() || undefined,
        issue_type: issueType || undefined,
        date_from: dateFilter || undefined,
        date_to: dateFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setDisputes(res.disputes);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [statusTab, searchInput, issueType, dateFilter, page]);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Disputes</h1>
          <p className="text-sm text-muted mt-1">
            {loading ? 'Loading disputes...' : `${total} dispute records`}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm bg-white hover:bg-bg"
          onClick={() => void fetchDisputes()}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'All'],
          ['open', 'Open'],
          ['closed', 'Closed'],
          ['dismissed', 'Dismissed'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              statusTab === value
                ? 'border-navy text-navy bg-navy/10'
                : 'border-border text-muted bg-white hover:bg-bg'
            }`}
            onClick={() => {
              setStatusTab(value);
              setPage(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <input
          className="w-full xl:flex-1 bg-white border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Search by dispute ID, order ID, description, aggregator..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(0);
          }}
        />
        <select
          className="w-full xl:w-56 bg-white border border-border rounded-lg px-3 py-2 text-sm"
          value={issueType}
          onChange={(e) => {
            setIssueType(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All Issue Types</option>
          <option value="wrong_weight">Wrong Weight</option>
          <option value="payment_not_made">Payment Not Made</option>
          <option value="no_show">No Show</option>
          <option value="abusive_behaviour">Abusive Behaviour</option>
          <option value="other">Other</option>
        </select>
        <input
          type="date"
          className="w-full xl:w-44 bg-white border border-border rounded-lg px-3 py-2 text-sm"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(0);
          }}
        />
        <button
          type="button"
          className="w-full xl:w-auto px-3 py-2 rounded-lg border border-border text-sm bg-white hover:bg-bg"
          onClick={() => {
            setStatusTab('all');
            setSearchInput('');
            setIssueType('');
            setDateFilter('');
            setPage(0);
          }}
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">
          {error}
        </div>
      )}

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4">
            <BoneyardTable preset="orders" rows={8} />
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">No disputes match the current filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Dispute ID</th>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Issue Type</th>
                <th className="px-3 py-2">Raised By</th>
                <th className="px-3 py-2">Aggregator</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Raised At</th>
                <th className="px-3 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr
                  key={`${d.id}-${d.created_at}`}
                  className="border-b border-border hover:bg-bg/50 cursor-pointer"
                  onClick={() => router.push(`/admin/disputes/${encodeURIComponent(d.id)}`)}
                >
                  <td className="px-3 py-2 font-mono text-xs text-navy">{d.id}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/orders/${d.order_id}`}
                      className="text-navy hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {d.order_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{ISSUE_LABELS[d.issue_type] ?? d.issue_type}</td>
                  <td className="px-3 py-2">{d.raised_by_name ?? d.raised_by}</td>
                  <td className="px-3 py-2">{d.aggregator_name ?? '-'}</td>
                  <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(d.created_at)}</td>
                  <td className="px-3 py-2">{d.evidence_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white disabled:opacity-50"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white disabled:opacity-50"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
