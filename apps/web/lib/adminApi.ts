/**
 * lib/adminApi.ts
 * ─────────────────────────────────────────────────────────────────
 * Typed fetch wrapper for all admin API calls.
 * Reads JWT from sessionStorage and injects Authorization header.
 * Must be called from client components only (sessionStorage is browser-only).
 * ─────────────────────────────────────────────────────────────────
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function getToken(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const fallbackToken = window.sessionStorage.getItem('admin_token');
  if (fallbackToken) return fallbackToken;

  const cookieToken = document.cookie
    .split('; ')
    .find((part) => part.startsWith('admin_token='))
    ?.split('=')[1];
  if (cookieToken) return decodeURIComponent(cookieToken);

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

// ─── Typed helpers ───────────────────────────────────────────────

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

// ─── Orders ──────────────────────────────────────────────────────

export interface AdminOrderSummary {
  id: string; status: string; created_at: string;
  scheduled_at: string | null; picked_up_at: string | null;
  completed_at: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; amount_due: number | null;
  pickup_address: string; pickup_lat: number | null; pickup_lng: number | null;
  city_code: string; seller_id: string; aggregator_id: string | null;
  seller_name: string; seller_phone: string;
  aggregator_business_name: string | null; aggregator_phone: string | null;
  aggregator_type: string | null;
}

export interface AdminOrdersResponse {
  orders: AdminOrderSummary[]; total: number; limit: number; offset: number;
}

export interface AdminTimelineEvent {
  status: string; changed_at: string; changed_by: string | null; note: string | null;
}

export interface AdminOrderItem {
  material_code: string;
  estimated_weight_kg: number | null; actual_weight_kg: number | null;
  unit_price_per_kg: number | null; line_amount: number | null;
}

export interface AdminOrderMedia {
  id: string; media_type: string; url: string; created_at: string;
}

export interface AdminOrderDetail {
  id: string; status: string; created_at: string;
  scheduled_at: string | null; picked_up_at: string | null;
  completed_at: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; amount_due: number | null;
  seller_note: string | null; pickup_address: string;
  pickup_lat: number | null; pickup_lng: number | null; city_code: string;
  preferred_pickup_window: unknown; aggregator_accepted_at: string | null;
  seller_id: string; seller_name: string; seller_phone: string;
  seller_joined_at: string; seller_flat: string | null; seller_street: string | null;
  seller_area: string | null; seller_city: string | null; seller_pincode: string | null;
  aggregator_id: string | null; aggregator_name: string | null;
  aggregator_business_name: string | null; aggregator_type: string | null;
  aggregator_city: string | null; aggregator_kyc_status: string | null;
  aggregator_phone: string | null; distance_km: number | null;
  items: AdminOrderItem[]; timeline: AdminTimelineEvent[]; media: AdminOrderMedia[];
}

export interface AdminOrderPin {
  id: string; status: string; lat: number; lng: number;
  created_at: string; city_code: string; seller_name: string;
  aggregator_name: string | null;
}

// ─── Analytics ───────────────────────────────────────────────────

export interface AdminAnalytics {
  daily_orders: Array<{ day: string; orders: number; completed: number; cancelled: number }>;
  status_breakdown: Array<{ status: string; count: number }>;
  city_breakdown: Array<{ city_code: string; total: number; completed: number }>;
  top_sellers: Array<{ id: string; name: string; display_phone: string; total_orders: number; completed_orders: number; total_gmv: number }>;
  top_aggregators: Array<{ id: string; name: string; business_name: string; display_phone: string; completed_orders: number; avg_rating: number }>;
  hourly_distribution: Array<{ hour: number; orders: number }>;
  revenue_weekly: Array<{ week_start: string; completed_orders: number; gmv: number }>;
}

// ─── API object ───────────────────────────────────────────────────

export const adminApi = {
  // Stats
  getStats: () => adminFetch<AdminStats>('/api/admin/stats'),

  // KYC
  getKycPending: () => adminFetch<KycPendingItem[]>('/api/admin/kyc/pending'),
  getKycDocuments: (userId: string) =>
    adminFetch<KycDocument[]>(`/api/admin/kyc/${userId}/documents`),
  updateKycStatus: (userId: string, kyc_status: 'verified' | 'rejected', note?: string) =>
    adminFetch(`/api/admin/aggregators/${userId}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify({ kyc_status, note }),
    }),

  // Disputes
  getDisputes: () => adminFetch<Dispute[]>('/api/admin/disputes'),
  resolveDispute: (id: string, action: 'resolve' | 'dismiss', resolution_note?: string) =>
    adminFetch(`/api/admin/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, resolution_note }),
    }),

  // Prices
  getPrices: () => adminFetch<PriceEntry[]>('/api/admin/prices'),
  overridePrice: (material_code: string, rate_per_kg: number) =>
    adminFetch('/api/admin/prices/override', {
      method: 'POST',
      body: JSON.stringify({ material_code, rate_per_kg }),
    }),

  // Flagged
  getFlagged: () => adminFetch<FlaggedAggregator[]>('/api/admin/flagged'),

  // Orders
  getOrders: (params?: { status?: string; seller_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.seller_id) qs.set('seller_id', params.seller_id);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    return adminFetch<AdminOrdersResponse>(`/api/admin/orders?${qs}`);
  },
  getOrder: (id: string) => adminFetch<AdminOrderDetail>(`/api/admin/orders/${id}`),
  getOrderLocations: () => adminFetch<AdminOrderPin[]>('/api/admin/orders/locations'),

  // Analytics
  getAnalytics: () => adminFetch<AdminAnalytics>('/api/admin/analytics'),
};
