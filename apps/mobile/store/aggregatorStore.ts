// Wired to live API on Day 11.
// Zustand store for aggregator-specific runtime state.
import { create } from 'zustand';
import type { MaterialCode } from '../components/ui/MaterialChip';
import { api } from '../lib/api';
import { isNetworkError } from '../utils/error';
import type { OrderStatus } from './orderStore';

export interface NearbyOrder {
  orderId: string;
  locality: string;
  distanceKm: number;
  materials: string[];
  estimatedWeight: number;
  postedMinutesAgo: number;
}

export interface AggregatorEarnings {
  todayAmount: number;
  todayPickups: number;
  weekAmount: number;
  weekPickups: number;
}

export interface MaterialConfig {
  id: string;
  name: string;
  selected: boolean;
  ratePerKg: number;
  avgRateHint: number;
  bgToken: string;
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  start: string;
  end: string;
}

// ── Typed incoming order request (New tab) ─────────────────────────
export interface NewOrderRequest {
  id: string;
  orderNumber: string;
  locality: string;
  distanceKm: number;
  materials: MaterialCode[];
  estimatedKg: number;
  postedMinutesAgo: number;
  estimatedPrice: number;
  sellerType: string;
  rating: number;
  isHighValue?: boolean;
  window: string;
}

interface AggregatorStoreState {
  // ── Onboarding State ───────────────────────────────────────────
  fullName: string;
  businessName: string;
  aggregatorType: 'shop' | 'mobile' | null;
  primaryArea: string;
  operatingHours: { from: string; to: string };
  operatingDays: string[];
  weeklySchedule: DaySchedule[];
  operatingAreas: string[];
  materials: MaterialConfig[];

  // ── Runtime State ──────────────────────────────────────────────
  nearbyOrders: NearbyOrder[];
  newOrders: NewOrderRequest[];       // Incoming requests (New tab, from live feed)
  aggOrders: any[];                   // Accepted orders for Active/Completed/Cancelled tabs
  activeOrders: string[];             // Accepted order IDs (legacy compat)
  dismissedOrderIds: string[];
  earnings: AggregatorEarnings;
  isOnline: boolean;
  isLoading: boolean;
  feedError: string | null;
  lastFeedError: string | null;
  lastFeedSyncAt: string | null;
  lastAcceptedAt: string | null;
  error: string | null;
  isNetworkError: boolean;

  // ── Photo Capture State ────────────────────────────────────────
  scalePhotoUri: string | null;
  kycAadhaarFrontUri: string | null;
  kycAadhaarBackUri: string | null;
  kycSelfieUri: string | null;
  kycShopPhotoUri: string | null;
  kycVehiclePhotoUri: string | null;

  // ── Sync Actions ───────────────────────────────────────────────
  setProfile: (p: Partial<Pick<AggregatorStoreState, 'fullName' | 'businessName' | 'aggregatorType' | 'primaryArea' | 'operatingHours' | 'operatingDays' | 'weeklySchedule'>>) => void;
  setOperatingAreas: (areas: string[]) => void;
  setMaterialSelected: (id: string, selected: boolean) => void;
  setMaterialRate: (id: string, rate: number) => void;

  setNearbyOrders: (orders: NearbyOrder[]) => void;
  setLoading: (v: boolean) => void;

  dismissOrder: (orderId: string) => void;
  dismissNewOrder: (orderId: string) => void;
  acceptNewOrder: (orderId: string) => void;

  /** Active tab: Cancel — calls orderStore, moves to cancelled */
  cancelOrder: (orderId: string) => void;

  /** Legacy: Used by order-detail.tsx Accept button */
  acceptOrder: (orderId: string) => void;

  setScalePhotoUri: (uri: string | null) => void;
  setKycAadhaarFrontUri: (uri: string | null) => void;
  setKycAadhaarBackUri: (uri: string | null) => void;
  setKycSelfieUri: (uri: string | null) => void;
  setKycShopPhotoUri: (uri: string | null) => void;
  setKycVehiclePhotoUri: (uri: string | null) => void;
  reset: () => void;

  // ── Async API Actions ──────────────────────────────────────────
  /** GET /api/orders/feed — populates newOrders (locality only, V25) */
  fetchFeed: (silent?: boolean) => Promise<void>;
  /** GET /api/orders?role=aggregator — populates aggOrders for Active/Completed/Cancelled tabs */
  fetchAggregatorOrders: (silent?: boolean) => Promise<void>;
  /** PATCH /api/aggregators/profile — updates business_name, operating_area */
  updateProfile: (payload: { business_name?: string; operating_area?: string; operating_hours?: string }) => Promise<void>;
  /** PATCH /api/aggregators/rates — updates material rates */
  updateRates: (rates: { material_code: string; rate_per_kg: number }[]) => Promise<void>;
  /** POST /api/aggregators/heartbeat — updates online status */
  updateOnlineStatus: (v: boolean) => Promise<void>;
  /** POST /api/orders/:id/accept */
  acceptOrderApi: (orderId: string) => Promise<void>;
  /** PATCH /api/orders/:id/status */
  updateOrderStatusApi: (orderId: string, status: Extract<OrderStatus, 'en_route' | 'arrived' | 'weighing_in_progress'>, note?: string) => Promise<void>;
  /** POST /api/orders/:id/media */
  uploadOrderMediaApi: (orderId: string, photoUri: string, mediaType: 'scale_photo' | 'scrap_photo') => Promise<void>;
  /** POST /api/orders/:id/verify-otp */
  verifyOtpApi: (orderId: string, otp: string) => Promise<void>;
}

const initialMaterials: MaterialConfig[] = [
  { id: 'metal', name: 'Metal', selected: true, ratePerKg: 28, avgRateHint: 28, bgToken: 'metalBg' },
  { id: 'paper', name: 'Paper', selected: true, ratePerKg: 12, avgRateHint: 12, bgToken: 'paperBg' },
  { id: 'plastic', name: 'Plastic', selected: false, ratePerKg: 8, avgRateHint: 8, bgToken: 'plasticBg' },
  { id: 'ewaste', name: 'E-Waste', selected: false, ratePerKg: 60, avgRateHint: 60, bgToken: 'ewasteBg' },
  { id: 'fabric', name: 'Fabric', selected: false, ratePerKg: 6, avgRateHint: 6, bgToken: 'fabricBg' },
  { id: 'glass', name: 'Glass', selected: false, ratePerKg: 5, avgRateHint: 5, bgToken: 'glassBg' },
];

const WEEKLY_SCHEDULE_DEFAULT: DaySchedule[] = [
  { day: 'Monday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
  { day: 'Tuesday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
  { day: 'Wednesday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
  { day: 'Thursday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
  { day: 'Friday', isOpen: true, start: '09:00 AM', end: '06:00 PM' },
  { day: 'Saturday', isOpen: true, start: '10:00 AM', end: '04:00 PM' },
  { day: 'Sunday', isOpen: false, start: '10:00 AM', end: '02:00 PM' },
];

// Maps feed API order → NewOrderRequest (V25: never includes pickup_address)
function mapFeedOrder(o: any): NewOrderRequest {
  const createdAt = o.created_at ? new Date(o.created_at) : new Date();
  const postedMinutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000);
  
  // V10 Fix: preferred_pickup_window might be an object { type: '...' }
  let windowLabel = 'Flexible';
  if (o.preferred_pickup_window) {
    if (typeof o.preferred_pickup_window === 'object') {
      windowLabel = o.preferred_pickup_window.type || 'Flexible';
    } else {
      windowLabel = String(o.preferred_pickup_window);
    }
  }

  return {
    id: o.id,
    orderNumber:
      typeof o.order_display_id === 'string' && o.order_display_id.trim().length > 0
        ? o.order_display_id
        : `#${String(o.id ?? '').slice(0, 8).toUpperCase()}`,
    locality: o.pickup_locality ?? 'Unknown area',    // V25: only locality, never full address
    distanceKm: typeof o.distance_km === 'number' ? o.distance_km : 0,
    materials: (o.material_codes ?? []) as MaterialCode[],
    estimatedKg: typeof o.estimated_weight_kg === 'number' ? o.estimated_weight_kg : 0,
    postedMinutesAgo,
    estimatedPrice: typeof o.estimated_value === 'number' ? o.estimated_value : 0,
    window: windowLabel,
    sellerType: typeof o.seller_type === 'string' ? o.seller_type : 'Seller',
    rating: typeof o.seller_rating === 'number' ? o.seller_rating : 4.5,
    isHighValue: (o.estimated_value ?? 0) > 500,
  };
}

export const useAggregatorStore = create<AggregatorStoreState>((set, get) => ({
  fullName: '',
  businessName: '',
  aggregatorType: null,
  primaryArea: '',
  operatingHours: { from: '08:00 AM', to: '07:00 PM' },
  operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  weeklySchedule: WEEKLY_SCHEDULE_DEFAULT,
  operatingAreas: [],
  materials: initialMaterials,

  nearbyOrders: [],
  newOrders: [],           // Populated via fetchFeed (no seed data)
  aggOrders: [],           // Populated via fetchAggregatorOrders
  activeOrders: [],
  dismissedOrderIds: [],
  earnings: { todayAmount: 0, todayPickups: 0, weekAmount: 0, weekPickups: 0 },
  isOnline: false,
  isLoading: false,
  feedError: null,
  lastFeedError: null,
  lastFeedSyncAt: null,
  lastAcceptedAt: null,
  error: null,
  isNetworkError: false,
  scalePhotoUri: null,
  kycAadhaarFrontUri: null,
  kycAadhaarBackUri: null,
  kycSelfieUri: null,
  kycShopPhotoUri: null,
  kycVehiclePhotoUri: null,

  setProfile: (p) => set((state) => ({ ...state, ...p })),
  setOperatingAreas: (areas) => set({ operatingAreas: areas }),
  setMaterialSelected: (id, selected) => set((state) => ({
    materials: state.materials.map(m => m.id === id ? { ...m, selected } : m)
  })),
  setMaterialRate: (id, rate) => set((state) => ({
    materials: state.materials.map(m => m.id === id ? { ...m, ratePerKg: rate } : m)
  })),

  setNearbyOrders: (orders) => set({ nearbyOrders: orders }),
  setLoading: (v) => set({ isLoading: v }),

  dismissOrder: (orderId) => set((state) => ({
    dismissedOrderIds: [...state.dismissedOrderIds, orderId],
  })),

  dismissNewOrder: (orderId) => set((state) => ({
    newOrders: state.newOrders.filter(o => o.id !== orderId),
  })),

  acceptNewOrder: (orderId) => set((state) => {
    const order = state.newOrders.find(o => o.id === orderId);
    if (!order) return {};
    const { useOrderStore } = require('./orderStore');
    useOrderStore.getState().addOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'accepted',
      materials: order.materials,
      estimatedAmount: order.estimatedPrice,
      confirmedAmount: null,
      pickupLocality: order.locality,
      pickupAddress: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aggregatorId: 'self',
      otp: '',
    });
    return {
      newOrders: state.newOrders.filter(o => o.id !== orderId),
      activeOrders: [...state.activeOrders, orderId],
      lastAcceptedAt: new Date().toISOString(),
    };
  }),

  cancelOrder: (orderId) => set((state) => {
    const { useOrderStore } = require('./orderStore');
    useOrderStore.getState().updateOrderStatus(orderId, 'cancelled');
    return {
      activeOrders: state.activeOrders.filter(id => id !== orderId),
    };
  }),

  acceptOrder: (orderId) => set((state) => {
    const { useOrderStore } = require('./orderStore');
    useOrderStore.getState().updateOrderStatus(orderId, 'accepted');
    return {
      dismissedOrderIds: [...state.dismissedOrderIds, orderId],
      activeOrders: [...state.activeOrders, orderId],
      lastAcceptedAt: new Date().toISOString(),
    };
  }),

  setScalePhotoUri: (uri) => set({ scalePhotoUri: uri }),
  setKycAadhaarFrontUri: (uri) => set({ kycAadhaarFrontUri: uri }),
  setKycAadhaarBackUri: (uri) => set({ kycAadhaarBackUri: uri }),
  setKycSelfieUri: (uri) => set({ kycSelfieUri: uri }),
  setKycShopPhotoUri: (uri) => set({ kycShopPhotoUri: uri }),
  setKycVehiclePhotoUri: (uri) => set({ kycVehiclePhotoUri: uri }),

  reset: () => set({
    fullName: '', businessName: '', aggregatorType: null, primaryArea: '',
    operatingHours: { from: '08:00 AM', to: '07:00 PM' },
    operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weeklySchedule: WEEKLY_SCHEDULE_DEFAULT,
    operatingAreas: [],
    materials: initialMaterials,
    nearbyOrders: [], newOrders: [], aggOrders: [], activeOrders: [], dismissedOrderIds: [],
    earnings: { todayAmount: 0, todayPickups: 0, weekAmount: 0, weekPickups: 0 },
    isOnline: false, isLoading: false, feedError: null, lastFeedError: null, lastFeedSyncAt: null, lastAcceptedAt: null, error: null,
    isNetworkError: false,
    scalePhotoUri: null, kycAadhaarFrontUri: null, kycAadhaarBackUri: null,
    kycSelfieUri: null, kycShopPhotoUri: null, kycVehiclePhotoUri: null,
  }),

  // ── Async: GET /api/orders/feed ────────────────────────────────
  fetchFeed: async (silent = false) => {
    // Preserve existing feedError if it exists until we succeed
    if (!silent && !get().feedError) set({ isLoading: true, feedError: null, lastFeedError: null, isNetworkError: false });
    else set({ isLoading: true, isNetworkError: false });

    try {
      const res = await api.get('/api/orders/feed');
      const orders = (res.data.orders ?? []).map(mapFeedOrder);
      set({ newOrders: orders, isLoading: false, feedError: null, lastFeedError: null, lastFeedSyncAt: new Date().toISOString(), isNetworkError: false });
    } catch (e: any) {
      const message = e.response?.data?.error ?? e.message ?? 'Failed to load feed';
      if (isNetworkError(e)) {
        set({ isNetworkError: true, isLoading: false });
      } else if (!silent) {
        set({ feedError: message, lastFeedError: message, isLoading: false });
      } else {
        set({ lastFeedError: message, isLoading: false });
      }
    }
  },

  // ── Async: GET /api/orders?role=aggregator ─────────────────────
  fetchAggregatorOrders: async (silent = false) => {
    if (!silent && !get().error) set({ isLoading: true, error: null, isNetworkError: false });
    else set({ isLoading: true, isNetworkError: false });

    try {
      const res = await api.get('/api/orders', { params: { role: 'aggregator' } });
      set({ aggOrders: res.data.orders ?? [], isLoading: false, error: null, isNetworkError: false });
    } catch (e: any) {
      if (isNetworkError(e)) {
        set({ isNetworkError: true, isLoading: false });
      } else if (!silent) {
        set({ error: e.response?.data?.error ?? e.message ?? 'Failed to load orders', isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },

  // ── Async: PATCH /api/aggregators/profile ─────────────────────
  // NOTE: fields match backend contract exactly (not name/locality — V35 guard)
  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch('/api/aggregators/profile', payload);
      // Reflect business_name in local state if provided
      if (payload.business_name !== undefined) {
        set({ businessName: payload.business_name });
      }
      if (payload.operating_area !== undefined) {
        set({ primaryArea: payload.operating_area });
      }
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to save profile', isLoading: false });
      throw e;
    }
  },

  // ── Async: PATCH /api/aggregators/rates ─────────────────────────
  updateRates: async (rates) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch('/api/aggregators/rates', { rates });
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to update rates', isLoading: false });
      throw e;
    }
  },

  // ── Async: POST /api/aggregators/heartbeat ─────────────────────
  updateOnlineStatus: async (v) => {
    // Optimistic update
    set({ isOnline: v, error: null });
    try {
      await api.post('/api/aggregators/heartbeat', { is_online: v });
    } catch (e: any) {
      // Revert on failure
      set({ isOnline: !v, error: e.response?.data?.error ?? e.message ?? 'Failed to update status' });
      throw e;
    }
  },

  // ── Async: POST /api/orders/:orderId/accept ───────────────────
  acceptOrderApi: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/orders/${orderId}/accept`);
      
      // The backend returns the updated full order DTO
      const completedOrder = res.data.order;
      
      // Add or update it in the global order store so the Active tab sees it instantly
      const { useOrderStore, mapApiOrder } = require('./orderStore');
      const mappedOrder = mapApiOrder(completedOrder);
      useOrderStore.getState().addOrder(mappedOrder);
      
      // Update local aggregator state arrays, including aggOrders
      set((state) => ({
        newOrders: state.newOrders.filter((o) => o.id !== orderId),
        activeOrders: [...state.activeOrders, orderId],
        aggOrders: [completedOrder, ...state.aggOrders],
        lastAcceptedAt: new Date().toISOString(),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to accept order', isLoading: false });
      throw e;
    }
  },

  // ── Async: PATCH /api/orders/:orderId/status ──────────────────
  updateOrderStatusApi: async (orderId, status, note) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch(`/api/orders/${orderId}/status`, {
        status,
        ...(note ? { note } : {}),
      });

      const { useOrderStore } = require('./orderStore');
      useOrderStore.getState().updateOrderStatus(orderId, status);

      set((state) => ({
        aggOrders: state.aggOrders.map((order) => {
          const currentOrderId = order.id ?? order.orderId;
          if (currentOrderId !== orderId) return order;

          return {
            ...order,
            status,
            updated_at: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to update order status', isLoading: false });
      throw e;
    }
  },

  // ── Async: POST /api/orders/:orderId/media ────────────────────
  uploadOrderMediaApi: async (orderId, photoUri, mediaType) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('media_type', mediaType);
      formData.append('file', {
        uri: photoUri,
        name: `${mediaType}.jpg`,
        type: 'image/jpeg',
      } as any);

      await api.post(`/api/orders/${orderId}/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to upload order media', isLoading: false });
      throw e;
    }
  },

  // ── Async: POST /api/orders/:orderId/verify-otp ────────────────
  verifyOtpApi: async (orderId, otp) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/api/orders/${orderId}/verify-otp`, { otp });
      
      // Update order store status to completed
      const { useOrderStore } = require('./orderStore');
      useOrderStore.getState().updateOrderStatus(orderId, 'completed');

      set((state) => ({
        aggOrders: state.aggOrders.map((order) => {
          const currentOrderId = order.id ?? order.orderId;
          if (currentOrderId !== orderId) return order;

          return {
            ...order,
            status: 'completed',
            updated_at: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }),
        activeOrders: state.activeOrders.filter((activeOrderId) => activeOrderId !== orderId),
        isLoading: false,
      }));
      
      void get().fetchAggregatorOrders(true);
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to verify OTP', isLoading: false });
      throw e;
    }
  },
}));
