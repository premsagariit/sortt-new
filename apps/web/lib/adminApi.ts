/**
 * lib/adminApi.ts
 * ─────────────────────────────────────────────────────────────────
 * Typed fetch wrapper for all admin API calls.
 * Reads JWT from sessionStorage and injects Authorization header.
 * Must be called from client components only (sessionStorage is browser-only).
 * ─────────────────────────────────────────────────────────────────
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

type ClerkLike = {
  session?: {
    getToken: () => Promise<string | null>;
  };
};

async function getToken(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const clerk = (window as Window & { Clerk?: ClerkLike }).Clerk;
  if (clerk?.session) {
    try {
      return (await clerk.session.getToken()) || '';
    } catch (err) {
      console.error('Clerk getToken error', err);
    }
  }

  const fallbackToken = window.sessionStorage.getItem('admin_token');
  if (fallbackToken) {
    return fallbackToken;
  }

  const cookieToken = document.cookie
    .split('; ')
    .find((part) => part.startsWith('admin_token='))
    ?.split('=')[1];
  if (cookieToken) {
    return decodeURIComponent(cookieToken);
  }

  return '';
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? `API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Typed helpers ──────────────────────────────────────────────

export interface AdminStats {
  total_pending_kyc: number;
  total_open_disputes: number;
  total_orders_today: number;
  total_completed_orders: number;
  total_active_aggregators: number;
}

export interface KycPendingItem {
  user_id: string;
  business_name: string;
  aggregator_type: 'shop' | 'mobile';
  city_code: string;
  kyc_status: 'pending' | 'verified' | 'rejected';
  submitted_at: string;
  document_count: number;
}

export interface KycDocument {
  id: string;
  media_type: string;
  signed_url: string;
  expires_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  hours_since_raised: number;
  order_status: string;
  seller_id: string;
  aggregator_name: string;
  evidence_urls?: string[];
}

export interface PriceEntry {
  material_code: string;
  rate_per_kg: number;
  is_manual_override: boolean;
  source: 'scraper' | 'override';
  scraped_at: string;
}

export interface FlaggedAggregator {
  aggregator_id: string;
  business_name: string;
  city_code: string;
  kyc_status: string;
  avg_rating: number;
  total_orders: number;
  last_order_at: string;
}

export const adminApi = {
  getStats: () => adminFetch<AdminStats>('/api/admin/stats'),
  getKycPending: () => adminFetch<KycPendingItem[]>('/api/admin/kyc/pending'),
  getKycDocuments: (userId: string) =>
    adminFetch<KycDocument[]>(`/api/admin/kyc/${userId}/documents`),
  updateKycStatus: (userId: string, kyc_status: 'verified' | 'rejected', note?: string) =>
    adminFetch(`/api/admin/aggregators/${userId}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify({ kyc_status, note }),
    }),
  getDisputes: () => adminFetch<Dispute[]>('/api/admin/disputes'),
  resolveDispute: (
    id: string,
    action: 'resolve' | 'dismiss',
    resolution_note?: string
  ) =>
    adminFetch(`/api/admin/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, resolution_note }),
    }),
  getPrices: () => adminFetch<PriceEntry[]>('/api/admin/prices'),
  overridePrice: (material_code: string, rate_per_kg: number) =>
    adminFetch('/api/admin/prices/override', {
      method: 'POST',
      body: JSON.stringify({ material_code, rate_per_kg }),
    }),
  getFlagged: () => adminFetch<FlaggedAggregator[]>('/api/admin/flagged'),
};
