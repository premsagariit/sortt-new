'use client';

/**
 * app/admin/kyc/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * KYC Queue — two-call pattern (BLOCK 2):
 *   1. GET /api/admin/kyc/pending (metadata table, no URLs)
 *   2. GET /api/admin/kyc/:userId/documents (on-demand, expand row)
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import { adminApi, type KycPendingItem, type KycDocument } from '../../../lib/adminApi';
import { CheckCircle, XCircle, CaretDown, CaretUp, IconWeight } from 'phosphor-react';
import NextImage from 'next/image';

type IconComponent = React.ComponentType<{ size?: number | string; weight?: IconWeight }>;

const CheckCircleIcon: IconComponent = CheckCircle;
const XCircleIcon: IconComponent = XCircle;
const CaretDownIcon: IconComponent = CaretDown;
const CaretUpIcon: IconComponent = CaretUp;

export default function KycQueuePage() {
  const [items, setItems] = useState<KycPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, KycDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    adminApi.getKycPending()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (userId: string) => {
    if (expanded === userId) {
      setExpanded(null);
      return;
    }
    setExpanded(userId);
    if (!docs[userId]) {
      setDocsLoading(userId);
      try {
        const d = await adminApi.getKycDocuments(userId);
        setDocs((prev) => ({ ...prev, [userId]: d }));
        } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setDocsLoading(null);
      }
    }
  };

  const handleKyc = async (userId: string, status: 'verified' | 'rejected') => {
    setActionLoading(`${userId}-${status}`);
    try {
      await adminApi.updateKycStatus(userId, status, actionNote || undefined);
      setItems((prev) => prev.filter((i) => i.user_id !== userId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
      setActionNote('');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  const docLabel: Record<string, string> = {
    kyc_aadhaar_front: 'Aadhaar Front',
    kyc_aadhaar_back: 'Aadhaar Back',
    kyc_selfie: 'Selfie',
    kyc_shop_photo: 'Shop Photo',
    kyc_vehicle_photo: 'Vehicle Photo',
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-navy tracking-tight">KYC Queue</h2>
          <p className="text-[13px] text-muted mt-0.5">
            {loading ? 'Loading…' : `${items.length} pending verification${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3 opacity-30">✓</div>
          <p className="text-sm">No pending KYC verifications</p>
        </div>
      )}

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                {['Business', 'Type', 'City', 'Submitted', 'Documents', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-bold text-muted uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                // FIX: key must go on React.Fragment, not on <> shorthand
                <React.Fragment key={item.user_id}>
                  <tr
                    className="border-b border-border hover:bg-bg-alt transition-colors cursor-pointer"
                    onClick={() => toggleExpand(item.user_id)}
                  >
                    <td className="px-4 py-3 font-semibold text-navy text-[13px]">
                      {item.business_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.aggregator_type === 'shop'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-muted text-slate'
                      }`}>
                        {item.aggregator_type === 'shop' ? 'Shop' : 'Mobile'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-slate">{item.city_code}</td>
                    <td className="px-4 py-3 text-[12px] text-slate">{formatDate(item.submitted_at)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-slate">{item.document_count}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                        Pending
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {expanded === item.user_id ? <CaretUpIcon size={14} /> : <CaretDownIcon size={14} />}
                    </td>
                  </tr>

                  {expanded === item.user_id && (
                    <tr className="bg-bg-alt">
                      <td colSpan={7} className="px-6 py-5">
                        {docsLoading === item.user_id ? (
                          <div className="flex items-center gap-2 text-muted text-sm">
                            <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                            Loading documents…
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                              {(docs[item.user_id] ?? []).map((doc) => (
                                <a
                                  key={doc.id}
                                  href={doc.signed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block bg-white border border-border rounded-xl overflow-hidden hover:text-navy transition-colors"
                                >
                                  <div className="h-24 bg-bg flex items-center justify-center relative">
                                    <NextImage
                                      src={doc.signed_url}
                                      alt={docLabel[doc.media_type] ?? doc.media_type}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                  <div className="px-3 py-2 text-[11px] font-semibold text-slate">
                                    {docLabel[doc.media_type] ?? doc.media_type}
                                  </div>
                                </a>
                              ))}
                            </div>

                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                placeholder="Optional review note…"
                                value={actionNote}
                                onChange={(e) => setActionNote(e.target.value)}
                                className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-[13px] text-slate outline-none focus:border-transparent transition-colors"
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleKyc(item.user_id, 'verified'); }}
                                disabled={actionLoading === `${item.user_id}-verified`}
                                className="flex items-center gap-1.5 px-4 py-2 bg-teal text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 transition-opacity"
                              >
                                <CheckCircleIcon size={14} />
                                Approve
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleKyc(item.user_id, 'rejected'); }}
                                disabled={actionLoading === `${item.user_id}-rejected`}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 transition-opacity"
                              >
                                <XCircleIcon size={14} />
                                Reject
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
