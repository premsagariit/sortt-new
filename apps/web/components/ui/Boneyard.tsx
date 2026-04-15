import { boneyard, boneyardTableColumns, type BoneyardTablePreset } from '@/lib/boneyard';

type BlockProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function BoneyardBlock({ className = '', style }: BlockProps) {
  return <div className={`${boneyard.baseClass} ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function BoneyardTable({
  preset,
  rows = 8,
}: {
  preset: BoneyardTablePreset;
  rows?: number;
}) {
  const columns = boneyardTableColumns[preset];

  return (
    <div className="p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-3 items-center" style={{ gridTemplateColumns: columns.join(' ') }}>
            {columns.map((_, colIdx) => (
              <BoneyardBlock
                key={`${rowIdx}-${colIdx}`}
                className={colIdx === columns.length - 1 ? 'h-4 w-4 justify-self-end rounded-full' : 'h-4'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoneyardDetailPage() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex items-center justify-between">
        <BoneyardBlock className="h-5 w-36" />
        <BoneyardBlock className="h-7 w-28 rounded-full" />
      </div>
      <div className="space-y-3">
        <BoneyardBlock className="h-8 w-72" />
        <BoneyardBlock className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <BoneyardBlock className="h-4 w-40" />
            <BoneyardBlock className="h-3 w-full" />
            <BoneyardBlock className="h-3 w-5/6" />
            <BoneyardBlock className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoneyardAnalyticsPage() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <BoneyardBlock className="h-7 w-40" />
        <BoneyardBlock className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <BoneyardBlock key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <BoneyardBlock className="h-5 w-40" />
            <BoneyardBlock className="h-56 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoneyardCardList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <BoneyardBlock className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <BoneyardBlock className="h-4 w-1/3" />
              <BoneyardBlock className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoneyardMetricGrid({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-white border border-border rounded-2xl p-5">
          <BoneyardBlock className="h-4 w-1/3 mb-3" />
          <BoneyardBlock className="h-6 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function BoneyardDocGrid({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-hidden="true">
      {Array.from({ length: cards }).map((_, i) => (
        <BoneyardBlock key={i} className="aspect-[4/3] rounded-xl" />
      ))}
    </div>
  );
}

export function BoneyardProfileSection() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex items-end gap-4 -mt-8 mb-4">
        <BoneyardBlock className="w-16 h-16 rounded-2xl border-4 border-white flex-shrink-0" />
        <div className="space-y-1 pb-1">
          <BoneyardBlock className="h-5 w-32" />
          <BoneyardBlock className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-border">
            <BoneyardBlock className="w-32 h-4" />
            <BoneyardBlock className="flex-1 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
