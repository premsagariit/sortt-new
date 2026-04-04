'use client';

/**
 * app/admin/prices/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Price override — per-material rate entry with sanity bounds.
 * Fetches current rates from GET /api/admin/prices.
 * Submits overrides via POST /api/admin/prices/override.
 * Backend validates bounds and writes audit_log in same transaction.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { adminApi, type PriceEntry } from '../../../lib/adminApi';

const MATERIAL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  metal:   { label: 'Metal / Iron', color: 'text-muted',    bg: 'bg-muted text-slate' },
  iron:    { label: 'Iron',         color: 'text-muted',    bg: 'bg-muted text-slate' },
  copper:  { label: 'Copper',       color: 'text-orange-600', bg: 'bg-orange-50 text-orange-600' },
  paper:   { label: 'Paper',        color: 'text-orange-600', bg: 'bg-orange-50 text-orange-600' },
  plastic: { label: 'Plastic',      color: 'text-navy/70',   bg: 'bg-bg-alt text-navy' },
  ewaste:  { label: 'E-Waste',      color: 'text-teal',     bg: 'bg-teal/10 text-teal' },
  glass:   { label: 'Glass',        color: 'text-navy/70',   bg: 'bg-bg-alt text-navy' },
  fabric:  { label: 'Fabric',       color: 'text-navy/70',   bg: 'bg-bg-alt text-navy' },
};

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
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleOverride = async (materialCode: string) => {
    const raw = overrides[materialCode];
    const rate = parseFloat(raw);
    if (!raw || isNaN(rate) || rate <= 0) {
      setError(`Enter a valid rate for ${materialCode}`);
      return;
    }
    setSaving(materialCode);
    setError('');
    try {
      await adminApi.overridePrice(materialCode, rate);
      // Refresh prices
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold text-navy tracking-tight">Price Override</h2>
        <p className="text-[13px] text-muted mt-0.5">
          Set manual scrap rates. Overrides supersede the automated scraper.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red/5 border border-red/20 rounded-xl text-[13px] text-red font-medium">
          {error}
        </div>
      )}

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Loading rates…</div>
        ) : prices.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">No price data available</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
            {/* Header */}
            <div className="bg-bg-alt border-b border-border px-5 py-3 grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 text-[11px] font-bold text-muted uppercase tracking-wider">
              <span>Material</span>
              <span>Current Rate</span>
              <span>Source</span>
              <span>Override (₹/kg)</span>
              <span></span>
            </div>

            {prices.map((p) => {
              const meta = MATERIAL_LABELS[p.material_code] ?? { label: p.material_code, color: 'text-muted', bg: 'bg-muted text-slate' };
              const isSaved = success === p.material_code;
              return (
                <div
                  key={p.material_code}
                  className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 items-center px-5 py-4 border-b border-border last:border-0"
                >
                  {/* Material */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: 'currentColor' }}
                    />
                    <span className={`text-[13px] font-semibold ${meta.color}`}>{meta.label}</span>
                  </div>

                  {/* Current rate */}
                  <span className="font-mono text-[14px] font-medium text-orange-600">
                    ₹{Number(p.rate_per_kg).toFixed(2)}
                  </span>

                  {/* Source chip */}
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold w-fit ${
                      p.is_manual_override
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-teal/10 text-teal'
                    }`}
                  >
                    {p.is_manual_override ? 'Override' : 'Auto'}
                  </span>

                  {/* Override input */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px] font-mono">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder={String(Number(p.rate_per_kg).toFixed(2))}
                      value={overrides[p.material_code] ?? ''}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [p.material_code]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleOverride(p.material_code)}
                      className="w-full pl-7 pr-3 py-2 bg-bg border border-border rounded-lg text-[13px] font-mono text-slate outline-none focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Save button */}
                  <button
                    onClick={() => handleOverride(p.material_code)}
                    disabled={saving === p.material_code || !overrides[p.material_code]}
                    className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                      isSaved
                        ? 'bg-teal text-white'
                        : 'bg-navy text-white disabled:opacity-40'
                    }`}
                  >
                    {saving === p.material_code ? 'Saving…' : isSaved ? '✓ Saved' : 'Set Rate'}
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[12px] text-muted">
        Rates outside per-material sanity bounds are rejected by the backend. All overrides are recorded in the audit log.
      </p>
    </div>
  );
}
