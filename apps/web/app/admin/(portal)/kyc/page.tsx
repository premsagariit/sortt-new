'use client';

/**
 * app/admin/(portal)/kyc/page.tsx
 * Professional KYC verification queue with document lightbox and approval workflow.
 */

import React, { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { adminApi, type KycPendingItem, type KycDocument } from '../../../../lib/adminApi';
import { BoneyardCardList, BoneyardDocGrid } from '@/components/ui/Boneyard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const DOC_LABELS: Record<string, { label: string; emoji: string }> = {
  kyc_aadhaar_front: { label: 'Aadhaar Front', emoji: '🪪' },
  kyc_aadhaar_back: { label: 'Aadhaar Back', emoji: '🪪' },
  kyc_selfie: { label: 'Selfie', emoji: '🤳' },
  kyc_shop_photo: { label: 'Shop Photo', emoji: '🏪' },
  kyc_vehicle_photo: { label: 'Vehicle Photo', emoji: '🛺' },
};

function Lightbox({ docs, initial, onClose }: { docs: KycDocument[]; initial: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initial);
  const doc = docs[idx];
  const meta = DOC_LABELS[doc?.media_type] ?? { label: doc?.media_type ?? '', emoji: '📄' };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-semibold text-[14px]">{meta.emoji} {meta.label}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden">
          {doc && (
            <NextImage
              src={doc.signed_url}
              alt={meta.label}
              fill
              className="object-contain"
              unoptimized
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setIdx((p) => Math.max(0, p - 1))}
            disabled={idx === 0}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm disabled:opacity-30 transition-colors"
          >
            ← Prev
          </button>
          <div className="flex gap-2">
            {docs.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setIdx((p) => Math.min(docs.length - 1, p + 1))}
            disabled={idx === docs.length - 1}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function KycCard({
  item,
  isOpen,
  onToggle,
  docs,
  docsLoading,
  onApprove,
  onReject,
  actionLoading,
}: {
  item: KycPendingItem;
  isOpen: boolean;
  onToggle: () => void;
  docs: KycDocument[] | undefined;
  docsLoading: boolean;
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
  actionLoading: string | null;
}) {
  const [note, setNote] = useState('');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const isShop = item.aggregator_type === 'shop';
  const initials = item.business_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const isApproving = actionLoading === `${item.user_id}-verified`;
  const isRejecting = actionLoading === `${item.user_id}-rejected`;

  return (
    <>
      {lightbox !== null && docs && (
        <Lightbox docs={docs} initial={lightbox} onClose={() => setLightbox(null)} />
      )}

      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Card header */}
        <div
          className="flex items-center gap-4 p-5 cursor-pointer hover:bg-bg transition-colors"
          onClick={onToggle}
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy to-navySoft flex items-center justify-center text-white font-black text-[14px] flex-shrink-0 overflow-hidden">
            {item.photo_url ? (
              <NextImage
                src={item.photo_url}
                alt={item.business_name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-navy">{item.business_name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                isShop ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {isShop ? '🏪 Shop' : '🛺 Mobile'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber/10 text-amber border border-amber/20">
                ⏳ Pending
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
              <span>🏙️ {item.city_code}</span>
              <span>·</span>
              <span>📅 Submitted {fmtDate(item.submitted_at)}</span>
              <span>·</span>
              <span>📁 {item.document_count} doc{item.document_count !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className={`text-muted transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded panel */}
        {isOpen && (
          <div className="border-t border-border p-5 space-y-5 bg-bg/30">

            {/* Document gallery */}
            <div>
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
                KYC Documents
              </div>

              {docsLoading && (
                <BoneyardDocGrid cards={4} />
              )}

              {!docsLoading && docs && docs.length === 0 && (
                <div className="py-8 text-center text-[13px] text-muted bg-bg rounded-xl border border-border border-dashed">
                  No documents uploaded yet
                </div>
              )}

              {!docsLoading && docs && docs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {docs.map((doc, i) => {
                    const meta = DOC_LABELS[doc.media_type] ?? { label: doc.media_type, emoji: '📄' };
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setLightbox(i)}
                        className="group relative bg-white border border-border rounded-xl overflow-hidden hover:border-navy transition-all hover:shadow-md"
                      >
                        <div className="relative aspect-[4/3] bg-bg">
                          <NextImage
                            src={doc.signed_url}
                            alt={meta.label}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" stroke="currentColor" strokeWidth={2}>
                              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="px-3 py-2 bg-white">
                          <div className="text-[10px] font-semibold text-slate truncate">{meta.emoji} {meta.label}</div>
                          <div className="text-[9px] text-muted mt-0.5">
                            Expires {new Date(doc.expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Review note + actions */}
            <div className="pt-2 border-t border-border">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Review Decision</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Add review note (optional)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 bg-white border border-border rounded-xl px-4 py-3 text-[13px] text-slate outline-none focus:border-navy transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onApprove(note); }}
                    disabled={isApproving || isRejecting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-opacity hover:bg-teal/90 whitespace-nowrap"
                  >
                    {isApproving ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Approve KYC
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReject(note); }}
                    disabled={isApproving || isRejecting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-opacity hover:bg-red/90 whitespace-nowrap"
                  >
                    {isRejecting ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function KycQueuePage() {
  const [items, setItems] = useState<KycPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, KycDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    adminApi.getKycPending()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (userId: string) => {
    if (expanded === userId) { setExpanded(null); return; }
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

  const handleKyc = async (userId: string, status: 'verified' | 'rejected', note: string) => {
    setActionLoading(`${userId}-${status}`);
    try {
      await adminApi.updateKycStatus(userId, status, note || undefined);
      setItems((prev) => prev.filter((i) => i.user_id !== userId));
      setExpanded(null);
      setSuccessMsg(`KYC ${status === 'verified' ? 'approved' : 'rejected'} for business.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const shopCount = items.filter((i) => i.aggregator_type === 'shop').length;
  const mobileCount = items.filter((i) => i.aggregator_type === 'mobile').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">KYC Queue</h1>
          <p className="text-[13px] text-muted mt-1">
            {loading ? 'Loading…' : `${items.length} pending verification${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {!loading && items.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {shopCount > 0 && (
              <span className="px-3 py-1.5 bg-orange-100 text-orange-600 text-[12px] font-bold rounded-xl border border-orange-200">
                🏪 {shopCount} Shop
              </span>
            )}
            {mobileCount > 0 && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-600 text-[12px] font-bold rounded-xl border border-blue-200">
                🛺 {mobileCount} Mobile
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
          <button onClick={() => setError('')} className="ml-auto">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="px-4 py-3 bg-teal/10 border border-teal/20 rounded-xl text-[13px] text-teal font-medium">
          ✓ {successMsg}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <BoneyardCardList rows={3} />
      )}

      {/* Empty */}
      {!loading && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center text-3xl mb-4">✅</div>
          <h3 className="text-[16px] font-bold text-navy mb-1">Queue is clear!</h3>
          <p className="text-[13px] text-muted">No pending KYC verifications at this time.</p>
        </div>
      )}

      {/* KYC card list */}
      <div className="space-y-3">
        {items.map((item) => (
          <KycCard
            key={item.user_id}
            item={item}
            isOpen={expanded === item.user_id}
            onToggle={() => toggleExpand(item.user_id)}
            docs={docs[item.user_id]}
            docsLoading={docsLoading === item.user_id}
            onApprove={(note) => handleKyc(item.user_id, 'verified', note)}
            onReject={(note) => handleKyc(item.user_id, 'rejected', note)}
            actionLoading={actionLoading}
          />
        ))}
      </div>
    </div>
  );
}
