// Scaffold — backend wired on Day 5 per @PLAN.md
// No Supabase calls here. All actions are local state only.
import { create } from 'zustand';

export type OrderStatus =
  | 'created' | 'accepted' | 'en_route'
  | 'arrived' | 'completed' | 'disputed' | 'cancelled';

export type MaterialCode =
  | 'metal' | 'plastic' | 'paper' | 'ewaste' | 'fabric' | 'glass';

export interface Order {
  orderId: string;
  status: OrderStatus;
  materials: MaterialCode[];
  estimatedAmount: number;
  confirmedAmount: number | null;
  pickupLocality: string;
  pickupAddress: string | null;  // null until post-acceptance (V25)
  createdAt: string;
  updatedAt: string;
  aggregatorId: string | null;
}

interface OrderStoreState {
  orders: Order[];
  activeOrderId: string | null;
  isLoading: boolean;
  // Actions — all no-ops for now, wired on Day 5
  setOrders: (orders: Order[]) => void;
  setActiveOrderId: (id: string | null) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

// Scaffold only — no backend calls until Day 5
export const useOrderStore = create<OrderStoreState>((set) => ({
  orders: [],
  activeOrderId: null,
  isLoading: false,
  setOrders: (orders) => set({ orders }),
  setActiveOrderId: (id) => set({ activeOrderId: id }),
  setLoading: (v) => set({ isLoading: v }),
  reset: () => set({ orders: [], activeOrderId: null, isLoading: false }),
}));
