export const boneyard = {
  // Shared class recipe used by all web skeleton placeholders.
  baseClass:
    'bg-skeleton/95 animate-pulse rounded-md motion-reduce:animate-none',
} as const;

export type BoneyardTablePreset = 'orders' | 'users';

export const boneyardTableColumns: Record<BoneyardTablePreset, string[]> = {
  orders: ['20%', '12%', '16%', '16%', '10%', '10%', '12%', '4%'],
  users: ['20%', '12%', '20%', '12%', '10%', '12%', '4%'],
};
