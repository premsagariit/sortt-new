import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { isNetworkError } from '../utils/error';

export type OrderStatus =
  | 'created' | 'accepted' | 'en_route'
  | 'arrived' | 'weighing_in_progress' | 'completed'
  | 'cancelled' | 'disputed';

export type DisputeStatus = 'open' | 'resolved' | 'dismissed';

// MaterialCode canonical source is MaterialChip.tsx — import for local use + re-export
import type { MaterialCode } from '../components/ui/MaterialChip';
export type { MaterialCode };

export interface Order {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  materials: MaterialCode[];
  estimatedAmount: number;
  confirmedAmount: number | null;
  estimatedTotal?: number;
  confirmedTotal?: number;
  displayAmount: number;
  isFinalAmount: boolean;
  pickupLocality: string;
  pickupAddress: string | null;
  createdAt: string;
  updatedAt: string;
  aggregatorId: string | null;
  aggregatorName?: string;
  aggregatorPhone?: string | null;
  otp: string;
  // ── Extended fields from API (may be undefined for list views) ──
  sellerId?: string;
  sellerName?: string;
  sellerType?: string;
  sellerPhone?: string | null;  // SP1: only non-null post-acceptance, aggregator or seller
  chatChannelToken?: string | null;      // BLOCK: Ably channel name with HMAC prefix
  orderChannelToken?: string | null;     // BLOCK: Ably channel name with HMAC prefix
  pickupLat?: number | null;
  pickupLng?: number | null;
  aggregatorLat?: number | null;
  aggregatorLng?: number | null;
  liveDistanceKm?: number | null;
  rating?: number;
  sellerHasRated?: boolean;
  aggregatorHasRated?: boolean;
  window?: string;
  estimatedWeights?: Record<string, number>;
  orderItems?: Array<{
    id: string;
    materialCode: string;
    materialLabel: string;
    estimatedWeightKg: number | null;
    confirmedWeightKg: number | null;
    ratePerKg: number | null;
    amount: number | null;
  }>;
  lineItems?: Array<{
    materialCode: string;
    weightKg: number;
    ratePerKg: number;
    amount: number;
  }>;
  materialCodes?: string[];
  history?: any[];
  disputeId?: string | null;
  disputeStatus?: DisputeStatus | null;
}

export function getOrderDisplayAmount(order: any): number {
  if (typeof order?.displayAmount === 'number' && Number.isFinite(order.displayAmount) && order.displayAmount > 0) return order.displayAmount;
  if (typeof order?.confirmedAmount === 'number' && Number.isFinite(order.confirmedAmount) && order.confirmedAmount > 0) return order.confirmedAmount;
  if (typeof order?.confirmedTotal === 'number' && Number.isFinite(order.confirmedTotal) && order.confirmedTotal > 0) return order.confirmedTotal;
  if (typeof order?.confirmed_total === 'number' && Number.isFinite(order.confirmed_total) && order.confirmed_total > 0) return order.confirmed_total;
  if (typeof order?.orderAmount === 'number' && Number.isFinite(order.orderAmount) && order.orderAmount > 0) return order.orderAmount;

  const lineItems = Array.isArray(order?.lineItems)
    ? order.lineItems
    : (Array.isArray(order?.line_items) ? order.line_items : []);
  const orderItems = Array.isArray(order?.orderItems)
    ? order.orderItems
    : (Array.isArray(order?.order_items) ? order.order_items : []);

  const fromLineItems = lineItems.reduce((sum: number, item: any) => {
    const amount = Number(item?.amount ?? 0);
    if (Number.isFinite(amount) && amount > 0) return sum + amount;

    const weight = Number(item?.weightKg ?? item?.weight_kg ?? item?.confirmed_weight_kg ?? item?.confirmedWeightKg ?? item?.estimated_weight_kg ?? item?.estimatedWeightKg ?? 0);
    const rate = Number(item?.ratePerKg ?? item?.rate_per_kg ?? 0);
    if (!Number.isFinite(weight) || !Number.isFinite(rate)) return sum;
    return sum + (weight * rate);
  }, 0);
  if (fromLineItems > 0) return fromLineItems;

  const fromOrderItems = orderItems.reduce((sum: number, item: any) => {
    const amount = Number(item?.amount ?? 0);
    if (Number.isFinite(amount) && amount > 0) return sum + amount;

    const weight = Number(item?.confirmedWeightKg ?? item?.confirmed_weight_kg ?? item?.estimatedWeightKg ?? item?.estimated_weight_kg ?? 0);
    const rate = Number(item?.ratePerKg ?? item?.rate_per_kg ?? 0);
    if (!Number.isFinite(weight) || !Number.isFinite(rate)) return sum;
    return sum + (weight * rate);
  }, 0);
  if (fromOrderItems > 0) return fromOrderItems;

  if (typeof order?.display_amount === 'number' && Number.isFinite(order.display_amount) && order.display_amount > 0) return order.display_amount;
  if (typeof order?.estimatedTotal === 'number' && Number.isFinite(order.estimatedTotal) && order.estimatedTotal > 0) return order.estimatedTotal;
  if (typeof order?.estimated_total === 'number' && Number.isFinite(order.estimated_total) && order.estimated_total > 0) return order.estimated_total;
  if (typeof order?.estimatedAmount === 'number' && Number.isFinite(order.estimatedAmount) && order.estimatedAmount > 0) return order.estimatedAmount;
  return 0;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// Maps API response shape → internal Order type
export function mapApiOrder(o: any): Order {
  // Normalize preferred_pickup_window
  let windowLabel = 'Flexible';
  if (o.preferred_pickup_window) {
    if (typeof o.preferred_pickup_window === 'object') {
      windowLabel = o.preferred_pickup_window.type || 'Flexible';
    } else {
      windowLabel = String(o.preferred_pickup_window);
    }
  }

  const rawOrderId = o.id ?? o.orderId ?? '';
  const parsedRating = toNumberOrNull(o.rating);
  const orderNumber =
    typeof o.order_display_id === 'string' && o.order_display_id.trim().length > 0
      ? o.order_display_id
      : `#${String(rawOrderId).slice(0, 8).toUpperCase()}`;

  return {
    orderId: rawOrderId,
    orderNumber,
    status: o.status,
    materials: o.material_codes ?? o.materials ?? [],
    estimatedAmount:
      typeof o.estimated_total === 'number'
        ? o.estimated_total
        : (typeof o.estimated_value === 'number' ? o.estimated_value : (o.estimatedAmount ?? 0)),
    confirmedAmount:
      typeof o.confirmed_total === 'number'
        ? o.confirmed_total
        : (typeof o.confirmed_value === 'number' ? o.confirmed_value : (o.confirmedAmount ?? null)),
    estimatedTotal:
      typeof o.estimated_total === 'number'
        ? o.estimated_total
        : (typeof o.estimated_value === 'number' ? o.estimated_value : (o.estimatedAmount ?? 0)),
    confirmedTotal:
      typeof o.confirmed_total === 'number'
        ? o.confirmed_total
        : (typeof o.confirmed_value === 'number' ? o.confirmed_value : 0),
    displayAmount:
      typeof o.display_amount === 'number'
        ? o.display_amount
        : (typeof o.confirmed_total === 'number' && o.confirmed_total > 0
          ? o.confirmed_total
          : (typeof o.estimated_total === 'number'
            ? o.estimated_total
            : (typeof o.confirmed_value === 'number'
              ? o.confirmed_value
              : (typeof o.estimated_value === 'number' ? o.estimated_value : (o.estimatedAmount ?? 0))))),
    isFinalAmount:
      typeof o.is_final_amount === 'boolean'
        ? o.is_final_amount
        : ((typeof o.confirmed_total === 'number' && o.confirmed_total > 0) || typeof o.confirmed_value === 'number'),
    pickupLocality: o.pickup_locality ?? o.pickupLocality ?? '',
    pickupAddress: o.pickup_address ?? o.pickupAddress ?? null,
    createdAt: o.created_at ?? o.createdAt ?? new Date().toISOString(),
    updatedAt: o.updated_at ?? o.updatedAt ?? new Date().toISOString(),
    aggregatorId: o.aggregator_id ?? o.aggregatorId ?? null,
    aggregatorName: o.aggregator_name ?? o.aggregatorName,
    aggregatorPhone: o.aggregator_phone ?? o.aggregatorPhone ?? null,
    otp: o.otp ?? '',
    sellerId: o.seller_id,
    sellerName: typeof o.seller_name === 'string' ? o.seller_name : (typeof o.sellerName === 'string' ? o.sellerName : undefined),
    sellerType: typeof o.seller_type === 'string' ? o.seller_type : 'Seller',
    sellerPhone: typeof o.seller_phone === 'string' ? o.seller_phone : (o.sellerPhone ?? null),  // SP1
    chatChannelToken: o.chatChannelToken ?? o.chat_channel ?? null,      // BLOCK: map from API
    orderChannelToken: o.orderChannelToken ?? o.order_channel ?? null,   // BLOCK: map from API
    pickupLat: toNumberOrNull(o.pickup_lat ?? o.pickupLat),
    pickupLng: toNumberOrNull(o.pickup_lng ?? o.pickupLng),
    aggregatorLat: toNumberOrNull(o.aggregator_lat ?? o.aggregatorLat),
    aggregatorLng: toNumberOrNull(o.aggregator_lng ?? o.aggregatorLng),
    liveDistanceKm: toNumberOrNull(o.distance_km ?? o.liveDistanceKm),
    rating: parsedRating !== null && parsedRating > 0 ? parsedRating : undefined,
    sellerHasRated: typeof o.seller_has_rated === 'boolean' ? o.seller_has_rated : undefined,
    aggregatorHasRated: typeof o.aggregator_has_rated === 'boolean' ? o.aggregator_has_rated : undefined,
    window: windowLabel,
    estimatedWeights: o.estimated_weights ?? o.estimatedWeights ?? {},
    orderItems: Array.isArray(o.order_items)
      ? o.order_items.map((item: any, idx: number) => ({
          id: String(item.id ?? `${rawOrderId}-${idx}`),
          materialCode: String(item.material_code ?? item.materialCode ?? ''),
          materialLabel: String(item.material_label ?? item.materialLabel ?? item.material_code ?? item.materialCode ?? ''),
          estimatedWeightKg: typeof item.estimated_weight_kg === 'number' ? item.estimated_weight_kg : (typeof item.estimatedWeightKg === 'number' ? item.estimatedWeightKg : null),
          confirmedWeightKg: typeof item.confirmed_weight_kg === 'number' ? item.confirmed_weight_kg : (typeof item.confirmedWeightKg === 'number' ? item.confirmedWeightKg : null),
          ratePerKg: typeof item.rate_per_kg === 'number' ? item.rate_per_kg : (typeof item.ratePerKg === 'number' ? item.ratePerKg : null),
          amount: typeof item.amount === 'number' ? item.amount : null,
        }))
      : undefined,
    lineItems: Array.isArray(o.line_items)
      ? o.line_items.map((item: any) => ({
          materialCode: item.material_code ?? item.materialCode,
          weightKg: Number(item.weight_kg ?? item.weightKg ?? 0),
          ratePerKg: Number(item.rate_per_kg ?? item.ratePerKg ?? 0),
          amount: Number(item.amount ?? 0),
        }))
      : undefined,
    materialCodes: o.material_codes ?? o.materialCodes ?? o.materials ?? [],
    history: o.history ?? [],
    disputeId: typeof o.dispute_id === 'string' ? o.dispute_id : (typeof o.disputeId === 'string' ? o.disputeId : null),
    disputeStatus: toDisputeStatusOrNull(o.dispute_status ?? o.disputeStatus),
  };
}

function toDisputeStatusOrNull(value: unknown): DisputeStatus | null {
  if (value === 'closed') return 'resolved';
  if (value === 'open' || value === 'resolved' || value === 'dismissed') return value;
  return null;
}

interface OrderStoreState {
  orders: Order[];
  activeOrderId: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isNetworkError: boolean;
  rejectedOrderIds: string[];

  // ── Sync actions (used by aggregator flow / mock transition) ──
  setOrders: (orders: Order[]) => void;
  setActiveOrderId: (id: string | null) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateOrderLiveLocation: (id: string, payload: { aggregatorLat: number; aggregatorLng: number; liveDistanceKm?: number | null }) => void;
  rejectOrder: (id: string) => void;
  addOrder: (order: Order) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;

  // ── Async API actions ──
  fetchOrders: (silent?: boolean) => Promise<void>;
  fetchOrder: (id: string, silent?: boolean) => Promise<void>;
  refreshAggregatorOrder: (id: string) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  cancelOrder: (id: string) => Promise<void>;
  createOrder: (payload: Record<string, unknown>) => Promise<Order>;
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set, get) => ({
      orders: [],
      activeOrderId: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      isNetworkError: false,
      rejectedOrderIds: [],

      setOrders: (orders) => set({ orders }),
      setActiveOrderId: (id) => set({ activeOrderId: id }),

      updateOrderStatus: (id, status) => set((state) => ({
        orders: state.orders.map((o) =>
          o.orderId === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
        ),
      })),

      updateOrderLiveLocation: (id, payload) => set((state) => ({
        orders: state.orders.map((o) =>
          o.orderId === id
            ? {
                ...o,
                aggregatorLat: payload.aggregatorLat,
                aggregatorLng: payload.aggregatorLng,
                liveDistanceKm: typeof payload.liveDistanceKm === 'number' ? payload.liveDistanceKm : o.liveDistanceKm ?? null,
                updatedAt: new Date().toISOString(),
              }
            : o
        ),
      })),

      rejectOrder: (id) => set((state) => ({
        rejectedOrderIds: [...state.rejectedOrderIds, id]
      })),

      addOrder: (order) => set((state) => ({
        orders: [...state.orders.filter(o => o.orderId !== order.orderId), order]
      })),

      setLoading: (v) => set({ isLoading: v }),

      reset: () => set({ orders: [], activeOrderId: null, isLoading: false, isRefreshing: false, error: null, isNetworkError: false, rejectedOrderIds: [] }),

      // ── Async: fetch seller's orders list ──
      fetchOrders: async (silent = false) => {
        const hasExistingOrders = get().orders.length > 0;
        const useRefreshingState = silent || hasExistingOrders;

        if (useRefreshingState) {
          set({ isRefreshing: true, error: null, isNetworkError: false });
        } else {
          set({ isLoading: true, error: null, isNetworkError: false });
        }

        try {
          const res = await api.get('/api/orders', { params: { role: 'seller' } });
          const incoming: Order[] = (res.data.orders ?? []).map(mapApiOrder);
          
          const existing = get().orders;
          const merged = incoming.map(newOrder => {
            const old = existing.find(o => o.orderId === newOrder.orderId);
            if (!old) return newOrder;
            // Smart Merge: Preserve detail-only fields if missing or shallow in list response
            return {
              ...old,
              ...newOrder,
              sellerName: newOrder.sellerName || old.sellerName,
              sellerPhone: newOrder.sellerPhone || old.sellerPhone,
              aggregatorName: newOrder.aggregatorName || old.aggregatorName,
              aggregatorPhone: newOrder.aggregatorPhone || old.aggregatorPhone,
              estimatedWeights: (newOrder.estimatedWeights && Object.keys(newOrder.estimatedWeights).length > 0)
                ? newOrder.estimatedWeights
                : old.estimatedWeights,
              history: (newOrder.history && newOrder.history.length > 0) ? newOrder.history : old.history,
              // List endpoint omits order_items/line_items — preserve them from a prior detail fetch
              orderItems: (Array.isArray(newOrder.orderItems) && newOrder.orderItems.length > 0)
                ? newOrder.orderItems
                : old.orderItems,
              lineItems: (Array.isArray(newOrder.lineItems) && newOrder.lineItems.length > 0)
                ? newOrder.lineItems
                : old.lineItems,
              pickupLat: typeof newOrder.pickupLat === 'number' ? newOrder.pickupLat : old.pickupLat,
              pickupLng: typeof newOrder.pickupLng === 'number' ? newOrder.pickupLng : old.pickupLng,
              aggregatorLat: typeof newOrder.aggregatorLat === 'number' ? newOrder.aggregatorLat : old.aggregatorLat,
              aggregatorLng: typeof newOrder.aggregatorLng === 'number' ? newOrder.aggregatorLng : old.aggregatorLng,
              liveDistanceKm: typeof newOrder.liveDistanceKm === 'number' ? newOrder.liveDistanceKm : old.liveDistanceKm,
            };
          });

          set({ orders: merged, error: null }); 
        } catch (e: any) {
          const errorMsg = e.response?.data?.error ?? e.message ?? 'Failed to load orders';
          const errorString = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
          
          console.warn(`[OrderStore] fetchOrders failed: ${errorString}`);
          if (isNetworkError(e)) {
            set({ isNetworkError: true });
          } else if (!silent) {
            set({ error: errorString });
          }
        } finally {
          if (useRefreshingState) {
            set({ isRefreshing: false });
          } else {
            set({ isLoading: false });
          }
        }
      },

      // ── Async: fetch single order, merge into store ──
      fetchOrder: async (id: string, silent = false) => {
        if (!silent) set({ isLoading: true, error: null, isNetworkError: false });
        try {
          const res = await api.get(`/api/orders/${id}`);
          const incomingOrder = mapApiOrder(res.data);
          set((state) => ({
            orders: [
              ...state.orders.filter(o => o.orderId !== incomingOrder.orderId),
              (() => {
                const old = state.orders.find(o => o.orderId === incomingOrder.orderId);
                if (!old) return incomingOrder;
                return {
                  ...old,
                  ...incomingOrder,
                  pickupLat: typeof incomingOrder.pickupLat === 'number' ? incomingOrder.pickupLat : old.pickupLat,
                  pickupLng: typeof incomingOrder.pickupLng === 'number' ? incomingOrder.pickupLng : old.pickupLng,
                  aggregatorLat: typeof incomingOrder.aggregatorLat === 'number' ? incomingOrder.aggregatorLat : old.aggregatorLat,
                  aggregatorLng: typeof incomingOrder.aggregatorLng === 'number' ? incomingOrder.aggregatorLng : old.aggregatorLng,
                  liveDistanceKm: typeof incomingOrder.liveDistanceKm === 'number' ? incomingOrder.liveDistanceKm : old.liveDistanceKm,
                };
              })(),
            ],
            isLoading: false,
          }));
        } catch (e: any) {
          const errorMsg = e.response?.data?.error ?? e.message ?? 'Failed to load order';
          const errorString = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
          
          console.warn(`[OrderStore] fetchOrder(${id}) failed: ${errorString}`);
          if (isNetworkError(e)) {
            set({ isNetworkError: true, isLoading: false });
          } else if (!silent) {
            set({ error: errorString, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        }
      },

      refreshAggregatorOrder: async (id: string) => {
        await get().fetchOrder(id, true);
      },

      getOrderById: (id: string) => get().orders.find((o) => o.orderId === id),

      // ── Async: cancel an order (V35 — no status='completed' ever set from client) ──
      cancelOrder: async (id: string, note?: string) => {
        set({ error: null, isNetworkError: false });
        try {
          await api.delete(`/api/orders/${id}`, { data: note ? { note } : undefined });
          set((state) => ({
            orders: state.orders.map(o =>
              o.orderId === id ? { ...o, status: 'cancelled', updatedAt: new Date().toISOString() } : o
            ),
          }));
        } catch (e: any) {
          const errorMsg = e.response?.data?.error ?? e.message ?? 'Failed to cancel order';
          const errorString = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
          
          console.warn(`[OrderStore] cancelOrder(${id}) failed: ${errorString}`);
          if (isNetworkError(e)) {
            set({ isNetworkError: true });
          } else {
            set({ error: errorString });
          }
          throw e; // re-throw so screen can show feedback
        }
      },

      // ── Async: create a new order ──
      createOrder: async (payload: Record<string, unknown>) => {
        set({ error: null, isNetworkError: false, isLoading: true });
        try {
          const res = await api.post('/api/orders', payload);
          const order = mapApiOrder(res.data.order);
          set((state) => ({ orders: [order, ...state.orders], isLoading: false }));
          return order;
        } catch (e: any) {
          if (isNetworkError(e)) {
            set({ isNetworkError: true, isLoading: false });
          } else {
            const errorMsg = e.response?.data?.error ?? e.message ?? 'Failed to create order';
            set({ error: String(errorMsg), isLoading: false });
          }
          throw e;
        }
      },
    }),
    {
      name: 'sortt-order-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
