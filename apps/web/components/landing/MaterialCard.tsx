/**
 * components/landing/MaterialCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Card for displaying a scrap material category.
 * Tokens: colors.material.* from constants/tokens.ts.
 * ─────────────────────────────────────────────────────────────────
 */

import { colors, type Material } from '../../constants/tokens';

interface MaterialCardProps {
  type: Material;
  label: string;
  description: string;
  emoji: string;
  priceIndicator?: string;
}

const MATERIAL_META: Record<Material, { name: string }> = {
  metal:   { name: 'Metal' },
  plastic: { name: 'Plastic' },
  paper:   { name: 'Paper' },
  ewaste:  { name: 'E-Waste' },
  fabric:  { name: 'Fabric' },
  glass:   { name: 'Glass' },
};

export function MaterialCard({ type, label, description, emoji, priceIndicator }: MaterialCardProps) {
  const token = colors.material[type];
  const meta = MATERIAL_META[type];

  return (
    <article
      className="group rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-all duration-200 cursor-default"
      style={{ borderLeftWidth: 3, borderLeftColor: token.fg }}
      aria-label={`${meta.name} material category`}
    >
      {/* Icon box */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-4"
        style={{ backgroundColor: token.bg }}
      >
        {emoji}
      </div>

      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-bold text-navy">{label}</h3>
        {priceIndicator && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: token.bg, color: token.fg }}
          >
            {priceIndicator}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[12px] text-slate leading-relaxed">{description}</p>
    </article>
  );
}
