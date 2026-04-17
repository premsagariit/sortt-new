import { useCallback, useEffect, useState } from 'react';

import { api } from '../lib/api';

export type SellerMaterialTrend = 'up' | 'down' | 'flat';

export interface SellerMaterialRate {
  material_code: string;
  name: string;
  rate_per_kg: number | null;
  previous_rate_per_kg: number | null;
  change_percent: number | null;
  trend: SellerMaterialTrend;
  is_available: boolean;
  contributor_count: number;
  updated_at: string | null;
}

function trendFromChange(changePercent: number | null): SellerMaterialTrend {
  if (typeof changePercent !== 'number' || !Number.isFinite(changePercent)) {
    return 'flat';
  }

  if (changePercent > 0) return 'up';
  if (changePercent < 0) return 'down';
  return 'flat';
}

export function useSellerMaterialRates() {
  const [rates, setRates] = useState<SellerMaterialRate[]>([]);
  const [cityCode, setCityCode] = useState('HYD');
  const [loading, setLoading] = useState(true);

  const loadRates = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get('/api/users/me/local-rates');
      const nextRates = (res.data?.rates || []).map((rate: any) => ({
        material_code: String(rate.material_code ?? ''),
        name: String(rate.name ?? rate.material_code ?? ''),
        rate_per_kg: rate.rate_per_kg != null ? Number(rate.rate_per_kg) : null,
        previous_rate_per_kg: rate.previous_rate_per_kg != null ? Number(rate.previous_rate_per_kg) : null,
        change_percent: rate.change_percent != null ? Number(rate.change_percent) : null,
        trend: trendFromChange(rate.change_percent != null ? Number(rate.change_percent) : null),
        is_available: Boolean(rate.is_available),
        contributor_count: Number(rate.contributor_count ?? 0),
        updated_at: rate.updated_at ?? null,
      }));

      setRates(nextRates);
      setCityCode(String(res.data?.city_code || 'HYD').toUpperCase());
    } catch {
      setRates([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  return { rates, cityCode, loading, reloadRates: loadRates };
}