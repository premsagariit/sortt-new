/**
 * components/landing/PriceTicker.tsx
 * ─────────────────────────────────────────────────────────────────
 * Animated price ticker showing real-time scrap material rates.
 * Prices are static/illustrative — marked as indicative.
 * Tokens: colors.amber, colors.teal, colors.navy, colors.material.*
 * ─────────────────────────────────────────────────────────────────
 */

'use client';

import { useState, useEffect } from 'react';
import { colors, type Material } from '../../constants/tokens';

interface PriceRow {
  type: Material;
  label: string;
  emoji: string;
  baseRate: number;
  unit: string;
}

const PRICE_ROWS: PriceRow[] = [
  { type: 'metal',   label: 'Iron / Steel',   emoji: '🔩', baseRate: 32,  unit: 'kg' },
  { type: 'metal',   label: 'Copper',         emoji: '🪙', baseRate: 480, unit: 'kg' },
  { type: 'metal',   label: 'Aluminium',      emoji: '🥄', baseRate: 95,  unit: 'kg' },
  { type: 'paper',   label: 'Newspaper',      emoji: '📰', baseRate: 12,  unit: 'kg' },
  { type: 'plastic', label: 'Hard Plastic',   emoji: '🧴', baseRate: 18,  unit: 'kg' },
  { type: 'ewaste',  label: 'Old Mobile',     emoji: '📱', baseRate: 150, unit: 'pc' },
  { type: 'glass',   label: 'Glass Bottles',  emoji: '🍶', baseRate: 3,   unit: 'kg' },
  { type: 'fabric',  label: 'Cotton Fabric',  emoji: '👕', baseRate: 8,   unit: 'kg' },
];

export function PriceTicker() {
  const [ticks, setTicks] = useState<Record<string, 'up' | 'down' | 'flat'>>(
    () => Object.fromEntries(PRICE_ROWS.map((r) => [r.label, 'flat']))
  );

  // Simulate minor price fluctuation — purely UI animation
  useEffect(() => {
    const interval = setInterval(() => {
      const randomLabel = PRICE_ROWS[Math.floor(Math.random() * PRICE_ROWS.length)].label;
      const direction = Math.random() > 0.5 ? 'up' : 'down';
      setTicks((prev) => ({ ...prev, [randomLabel]: direction }));
      // Reset after 1.5s
      setTimeout(() => {
        setTicks((prev) => ({ ...prev, [randomLabel]: 'flat' }));
      }, 1500);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden" role="region" aria-label="Live scrap material prices">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse inline-block" aria-hidden="true" />
          <span className="text-[11px] font-bold text-teal uppercase tracking-widest">Live Indicative Rates</span>
        </div>
        <span className="text-[10px] text-muted font-medium">Hyderabad · Updated daily</span>
      </div>

      {/* Price grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRICE_ROWS.map((row) => {
          const token = colors.material[row.type];
          const tick = ticks[row.label];
          return (
            <div
              key={row.label}
              className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: token.bg }}
                >
                  {row.emoji}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-navy leading-tight">{row.label}</div>
                  <div className="text-[10px] text-muted">per {row.unit}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1">
                  <span
                    className="text-[15px] font-bold font-mono"
                    style={{ color: colors.amber }}
                  >
                    ₹{row.baseRate}
                  </span>
                  {tick === 'up' && (
                    <span className="text-teal text-[10px] font-bold animate-bounce">▲</span>
                  )}
                  {tick === 'down' && (
                    <span className="text-red text-[10px] font-bold animate-bounce">▼</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted mt-3 text-center">
        * Indicative rates for Hyderabad pilot. Final price confirmed at pickup.
      </p>
    </div>
  );
}
