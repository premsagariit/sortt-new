// Wired to live API on Day 11.
// Zustand store for aggregator-specific runtime state.
import { create } from 'zustand';
import type { MaterialCode } from '../components/ui/MaterialChip';
import { api } from '../lib/api';

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
  error: string | null;

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
  setOnline: (v: boolean) => void;
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
  fetchFeed: () => Promise<void>;
  /** GET /api/orders?role=aggregator — populates aggOrders for Active/Completed/Cancelled tabs */
  fetchAggregatorOrders: () => Promise<void>;
  /** PATCH /api/aggregators/profile — updates business_name, operating_area */
  updateProfile: (payload: { business_name?: string; operating_area?: string; operating_hours?: string }) => Promise<void>;
  /** PATCH /api/aggregators/rates — updates material rates */
  updateRates: (rates: { material_code: string; rate_per_kg: number }[]) => Promise<void>;
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
  return {
    id: o.id,
    locality: o.pickup_locality ?? 'Unknown area',    // V25: only locality, never full address
    distanceKm: o.distance_km ?? 0,
    materials: (o.material_codes ?? []) as MaterialCode[],
    estimatedKg: o.estimated_weight_kg ?? 0,
    postedMinutesAgo,
    estimatedPrice: o.estimated_value ?? 0,
    sellerType: o.seller_type ?? 'Seller',
    rating: o.seller_rating ?? 4.5,
    isHighValue: (o.estimated_value ?? 0) > 500,
    window: o.preferred_pickup_window ?? 'Flexible',
  };
}

export const useAggregatorStore = create<AggregatorStoreState>((set) => ({
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
  error: null,
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
  setOnline: (v) => set({ isOnline: v }),
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
    isOnline: false, isLoading: false, feedError: null, error: null,
    scalePhotoUri: null, kycAadhaarFrontUri: null, kycAadhaarBackUri: null,
    kycSelfieUri: null, kycShopPhotoUri: null, kycVehiclePhotoUri: null,
  }),

  // ── Async: GET /api/orders/feed ────────────────────────────────
  fetchFeed: async () => {
    set({ isLoading: true, feedError: null });
    try {
      const res = await api.get('/api/orders/feed');
      const orders = (res.data.orders ?? []).map(mapFeedOrder);
      set({ newOrders: orders, isLoading: false });
    } catch (e: any) {
      set({ feedError: e.response?.data?.error ?? e.message ?? 'Failed to load feed', isLoading: false });
    }
  },

  // ── Async: GET /api/orders?role=aggregator ─────────────────────
  fetchAggregatorOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/orders', { params: { role: 'aggregator' } });
      set({ aggOrders: res.data.orders ?? [], isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to load orders', isLoading: false });
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
}));
