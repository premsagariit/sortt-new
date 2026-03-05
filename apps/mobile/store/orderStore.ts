import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  pickupAddress: string | null;
  createdAt: string;
  updatedAt: string;
  aggregatorId: string | null;
  otp: string; // Added for mock flow
}

interface OrderStoreState {
  orders: Order[];
  activeOrderId: string | null;
  isLoading: boolean;
  rejectedOrderIds: string[];

  // Actions
  setOrders: (orders: Order[]) => void;
  setActiveOrderId: (id: string | null) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  rejectOrder: (id: string) => void;
  addOrder: (order: Order) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_ORDERS: Order[] = [
  {
    orderId: 'ORD-7777',
    status: 'arrived',
    materials: ['plastic', 'paper'],
    estimatedAmount: 450,
    confirmedAmount: null,
    pickupLocality: 'Banjara Hills',
    pickupAddress: 'Road No. 12, Hyderabad',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aggregatorId: 'AGG-123',
    otp: '1234',
  }
];

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set) => ({
      orders: INITIAL_ORDERS,
      activeOrderId: null,
      isLoading: false,
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

      reset: () => set({ orders: INITIAL_ORDERS, activeOrderId: null, isLoading: false, rejectedOrderIds: [] }),
    }),
    {
      name: 'sortt-order-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
