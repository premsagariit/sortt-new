'use client';

/**
 * app/admin/(portal)/prices/page.tsx
 * Professional price override panel with material cards, sanity bounds display, and audit trail.
 */

import { useEffect, useState } from 'react';
import { adminApi, type PriceEntry } from '../../../../lib/adminApi';
import { BoneyardBlock } from '@/components/ui/Boneyard';

const MATERIAL_META: Record<string, {
  label: string;
  emoji: string;
  iconBg: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  bounds: { min: number; max: number };
}> = {
  metal:   { label: 'Metal / Iron', emoji: '🔩', iconBg: 'bg-gray-100', textColor: 'text-gray-600',   badgeBg: 'bg-gray-100',    badgeText: 'text-gray-600',   bounds: { min: 20,  max: 60  } },
  iron:    { label: 'Iron',         emoji: '⚙️', iconBg: 'bg-gray-100', textColor: 'text-gray-600',   badgeBg: 'bg-gray-100',    badgeText: 'text-gray-600',   bounds: { min: 20,  max: 60  } },
  copper:  { label: 'Copper',       emoji: '🟠', iconBg: 'bg-orange-50', textColor: 'text-orange-600', badgeBg: 'bg-orange-100',  badgeText: 'text-orange-600', bounds: { min: 400, max: 900 } },
  paper:   { label: 'Paper',        emoji: '📄', iconBg: 'bg-yellow-50', textColor: 'text-yellow-700', badgeBg: 'bg-yellow-100',  badgeText: 'text-yellow-700', bounds: { min: 5,   max: 20  } },
  plastic: { label: 'Plastic',      emoji: '🧴', iconBg: 'bg-blue-50',  textColor: 'text-blue-600',   badgeBg: 'bg-blue-100',    badgeText: 'text-blue-600',   bounds: { min: 5,   max: 25  } },
  ewaste:  { label: 'E-Waste',      emoji: '💻', iconBg: 'bg-teal/10',  textColor: 'text-teal',       badgeBg: 'bg-teal/10',     badgeText: 'text-teal',       bounds: { min: 50,  max: 500 } },
  glass:   { label: 'Glass',        emoji: '🍶', iconBg: 'bg-sky-50',   textColor: 'text-sky-600',    badgeBg: 'bg-sky-100',     badgeText: 'text-sky-600',    bounds: { min: 1,   max: 10  } },
  fabric:  { label: 'Fabric',       emoji: '🧵', iconBg: 'bg-purple-50',textColor: 'text-purple-600', badgeBg: 'bg-purple-100',  badgeText: 'text-purple-600', bounds: { min: 3,   max: 20  } },
};

function PriceBar({ current, min, max }: { current: number; min: number; max: number }) {
  const pct = Math.min(Math.max(((current - min) / (max - min)) * 100, 0), 100);
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-muted mb-1">
        <span>₹{min}</span>
        <span>₹{max}</span>
      </div>
      <div className="relative h-2 bg-bg border border-border rounded-full overflow-visible">
        <div className="h-full bg-amber rounded-full" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber border-2 border-white shadow"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
    </div>
  );
}

export default function PricesPage() {
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getPrices()
      .then(setPrices)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleOverride = async (materialCode: string) => {
    const raw = overrides[materialCode];
    const rate = parseFloat(raw);
    if (!raw || isNaN(rate) || rate <= 0) {
      setError(`Enter a valid positive rate for ${materialCode}`);
      return;
    }
    setSaving(materialCode);
    setError('');
    try {
      await adminApi.overridePrice(materialCode, rate);
      const updated = await adminApi.getPrices();
      setPrices(updated);
      setOverrides((prev) => ({ ...prev, [materialCode]: '' }));
      setSuccess(materialCode);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setSaving(null);
    }
  };

  const overrideCount = prices.filter((p) => p.is_manual_override).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Price Override</h1>
          <p className="text-[13px] text-muted mt-1">
            Set manual scrap rates. Overrides supersede the automated scraper and are immutably audited.
          </p>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-2">
            {overrideCount > 0 && (
              <span className="px-3 py-1.5 bg-orange-100 text-orange-600 text-[12px] font-bold rounded-xl border border-orange-200">
                🔧 {overrideCount} manual override{overrideCount !== 1 ? 's' : ''}
              </span>
            )}
            <span className="px-3 py-1.5 bg-teal/10 text-teal text-[12px] font-bold rounded-xl border border-teal/20">
              🤖 {prices.length - overrideCount} auto-scraped
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

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <BoneyardBlock className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <BoneyardBlock className="h-4 rounded w-2/3" />
                  <BoneyardBlock className="h-3 rounded w-1/2" />
                </div>
              </div>
              <BoneyardBlock className="h-8 rounded" />
              <BoneyardBlock className="h-2 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && prices.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-amber/10 rounded-2xl flex items-center justify-center text-3xl mb-4">📊</div>
          <h3 className="text-[16px] font-bold text-navy mb-1">No price data</h3>
          <p className="text-[13px] text-muted">Price data will appear here once the scraper runs.</p>
        </div>
      )}

      {/* Material cards grid */}
      {!loading && prices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prices.map((p) => {
            const meta = MATERIAL_META[p.material_code] ?? {
              label: p.material_code,
              emoji: '📦',
              iconBg: 'bg-bg',
              textColor: 'text-muted',
              badgeBg: 'bg-bg',
              badgeText: 'text-muted',
              bounds: { min: 0, max: 1000 },
            };
            const isSaved = success === p.material_code;
            const isSaving = saving === p.material_code;
            const hasInput = !!overrides[p.material_code];
            const inputVal = parseFloat(overrides[p.material_code] || '0');
            const inBounds = !isNaN(inputVal) && inputVal >= meta.bounds.min && inputVal <= meta.bounds.max;

            return (
              <div
                key={p.material_code}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${
                  isSaved ? 'border-teal/40 ring-1 ring-teal/20' : 'border-border'
                }`}
              >
                {/* Material header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-bold ${meta.textColor}`}>{meta.label}</div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      p.is_manual_override ? 'bg-orange-100 text-orange-600' : 'bg-teal/10 text-teal'
                    }`}>
                      {p.is_manual_override ? '🔧 Override' : '🤖 Auto'}
                    </span>
                  </div>
                </div>

                {/* Current rate */}
                <div className="mb-1">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Current Rate</div>
                  <div className="text-[26px] font-black text-amber font-mono leading-none">
                    ₹{Number(p.rate_per_kg).toFixed(2)}
                    <span className="text-[12px] font-semibold text-muted ml-1">/kg</span>
                  </div>
                </div>

                {/* Rate bar */}
                <PriceBar current={Number(p.rate_per_kg)} min={meta.bounds.min} max={meta.bounds.max} />

                <div className="text-[10px] text-muted mt-1">
                  Valid range: ₹{meta.bounds.min} – ₹{meta.bounds.max}/kg
                </div>

                {/* Override input */}
                <div className="mt-4 space-y-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Set New Rate</div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px] font-mono">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min={meta.bounds.min}
                        max={meta.bounds.max}
                        placeholder={String(Number(p.rate_per_kg).toFixed(0))}
                        value={overrides[p.material_code] ?? ''}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [p.material_code]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleOverride(p.material_code)}
                        className={`w-full pl-7 pr-3 py-2.5 bg-bg border rounded-xl text-[13px] font-mono text-navy outline-none transition-colors ${
                          hasInput && !inBounds ? 'border-red focus:border-red' : 'border-border focus:border-navy'
                        }`}
                      />
                    </div>
                    <button
                      onClick={() => handleOverride(p.material_code)}
                      disabled={isSaving || !hasInput}
                      className={`px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all flex-shrink-0 ${
                        isSaved
                          ? 'bg-teal text-white'
                          : 'bg-navy text-white hover:bg-navySoft disabled:opacity-40'
                      }`}
                    >
                      {isSaving ? (
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : isSaved ? '✓' : 'Set'}
                    </button>
                  </div>
                  {hasInput && !inBounds && (
                    <p className="text-[10px] text-red">
                      Must be ₹{meta.bounds.min}–₹{meta.bounds.max}/kg
                    </p>
                  )}
                  {isSaved && (
                    <p className="text-[10px] text-teal font-semibold">✓ Rate updated and audited</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[12px] text-muted">
        💡 Rates outside per-material sanity bounds are rejected by the backend. All overrides are permanently recorded in the audit log.
      </p>
    </div>
  );
}
