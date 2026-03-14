import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

export type OrderStatus =
  | 'created' | 'accepted' | 'en_route'
  | 'arrived' | 'weighing_in_progress' | 'completed'
  | 'cancelled' | 'disputed';

// MaterialCode canonical source is MaterialChip.tsx — import for local use + re-export
import type { MaterialCode } from '../components/ui/MaterialChip';
export type { MaterialCode };

export interface Order {
  orderId: string;
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
  sellerType?: string;
  rating?: number;
}

// Maps API response shape → internal Order type
function mapApiOrder(o: any): Order {
  return {
    orderId: o.id ?? o.orderId,
    status: o.status,
    materials: o.material_codes ?? o.materials ?? [],
    estimatedAmount: o.estimated_value ?? o.estimatedAmount ?? 0,
    confirmedAmount: o.confirmed_value ?? o.confirmedAmount ?? null,
    pickupLocality: o.pickup_locality ?? o.pickupLocality ?? '',
    pickupAddress: o.pickup_address ?? o.pickupAddress ?? null,
    createdAt: o.created_at ?? o.createdAt ?? new Date().toISOString(),
    updatedAt: o.updated_at ?? o.updatedAt ?? new Date().toISOString(),
    aggregatorId: o.aggregator_id ?? o.aggregatorId ?? null,
    otp: o.otp ?? '',
    sellerId: o.seller_id,
    sellerType: o.seller_type,
    rating: o.rating,
  };
}

interface OrderStoreState {
  orders: Order[];
  activeOrderId: string | null;
  isLoading: boolean;
  error: string | null;
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
  fetchOrders: () => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  createOrder: (payload: Record<string, unknown>) => Promise<Order>;
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set, get) => ({
      orders: [],
      activeOrderId: null,
      isLoading: false,
      error: null,
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

      reset: () => set({ orders: [], activeOrderId: null, isLoading: false, error: null, rejectedOrderIds: [] }),

      // ── Async: fetch seller's orders list ──
      fetchOrders: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.get('/api/orders');
          const orders: Order[] = (res.data.orders ?? []).map(mapApiOrder);
          set({ orders, isLoading: false });
        } catch (e: any) {
          set({ error: e.response?.data?.error ?? e.message ?? 'Failed to load orders', isLoading: false });
        }
      },

      // ── Async: fetch single order, merge into store ──
      fetchOrder: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.get(`/api/orders/${id}`);
          const order = mapApiOrder(res.data);
          set((state) => ({
            orders: [...state.orders.filter(o => o.orderId !== order.orderId), order],
            isLoading: false,
          }));
        } catch (e: any) {
          set({ error: e.response?.data?.error ?? e.message ?? 'Failed to load order', isLoading: false });
        }
      },

      // ── Async: cancel an order (V35 — no status='completed' ever set from client) ──
      cancelOrder: async (id: string) => {
        try {
          await api.delete(`/api/orders/${id}`);
          set((state) => ({
            orders: state.orders.map(o =>
              o.orderId === id ? { ...o, status: 'cancelled', updatedAt: new Date().toISOString() } : o
            ),
          }));
        } catch (e: any) {
          set({ error: e.response?.data?.error ?? e.message ?? 'Failed to cancel order' });
          throw e; // re-throw so screen can show feedback
        }
      },

      // ── Async: create a new order ──
      createOrder: async (payload: Record<string, unknown>) => {
        const res = await api.post('/api/orders', payload);
        const order = mapApiOrder(res.data.order);
        set((state) => ({ orders: [order, ...state.orders] }));
        return order;
      },
    }),
    {
      name: 'sortt-order-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
