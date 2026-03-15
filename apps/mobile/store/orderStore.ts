import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { isNetworkError } from '../utils/error';

export type OrderStatus =
  | 'created' | 'accepted' | 'en_route'
  | 'arrived' | 'weighing_in_progress' | 'completed'
  | 'cancelled' | 'disputed';

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
  pickupLocality: string;
  pickupAddress: string | null;
  createdAt: string;
  updatedAt: string;
  aggregatorId: string | null;
  otp: string;
  // ── Extended fields from API (may be undefined for list views) ──
  sellerId?: string;
  sellerName?: string;
  sellerType?: string;
  rating?: number;
  window?: string;
  estimatedWeights?: Record<string, number>;
}

// Maps API response shape → internal Order type
function mapApiOrder(o: any): Order {
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
  const orderNumber =
    typeof o.order_display_id === 'string' && o.order_display_id.trim().length > 0
      ? o.order_display_id
      : `#${String(rawOrderId).slice(0, 8).toUpperCase()}`;

  return {
    orderId: rawOrderId,
    orderNumber,
    status: o.status,
    materials: o.material_codes ?? o.materials ?? [],
    estimatedAmount: typeof o.estimated_value === 'number' ? o.estimated_value : (o.estimatedAmount ?? 0),
    confirmedAmount: typeof o.confirmed_value === 'number' ? o.confirmed_value : (o.confirmedAmount ?? null),
    pickupLocality: o.pickup_locality ?? o.pickupLocality ?? '',
    pickupAddress: o.pickup_address ?? o.pickupAddress ?? null,
    createdAt: o.created_at ?? o.createdAt ?? new Date().toISOString(),
    updatedAt: o.updated_at ?? o.updatedAt ?? new Date().toISOString(),
    aggregatorId: o.aggregator_id ?? o.aggregatorId ?? null,
    otp: o.otp ?? '',
    sellerId: o.seller_id,
    sellerName: typeof o.seller_name === 'string' ? o.seller_name : (typeof o.sellerName === 'string' ? o.sellerName : undefined),
    sellerType: typeof o.seller_type === 'string' ? o.seller_type : 'Seller',
    rating: typeof o.rating === 'number' ? o.rating : undefined,
    window: windowLabel,
    estimatedWeights: o.estimated_weights ?? o.estimatedWeights ?? {},
  };
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
  rejectOrder: (id: string) => void;
  addOrder: (order: Order) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;

  // ── Async API actions ──
  fetchOrders: (silent?: boolean) => Promise<void>;
  fetchOrder: (id: string, silent?: boolean) => Promise<void>;
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
          const orders: Order[] = (res.data.orders ?? []).map(mapApiOrder);
          set({ orders, error: null }); // Clear error on successful fetch
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
          const order = mapApiOrder(res.data);
          set((state) => ({
            orders: [...state.orders.filter(o => o.orderId !== order.orderId), order],
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

      // ── Async: cancel an order (V35 — no status='completed' ever set from client) ──
      cancelOrder: async (id: string) => {
        set({ error: null, isNetworkError: false });
        try {
          await api.delete(`/api/orders/${id}`);
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
