// Wired to live API on Day 11.
// Zustand store for aggregator-specific runtime state.
import { create } from 'zustand';
import type { MaterialCode } from '../components/ui/MaterialChip';
import { api } from '../lib/api';
import { isNetworkError } from '../utils/error';
import { mapApiOrder, type OrderStatus } from './orderStore';

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

export interface AggregatorProfile {
  name: string | null;
  businessName: string | null;
  operatingArea: string | null;
  operatingHours: any | null;
  kycStatus: string | null;
  cityCode: string | null;
}

export interface AggregatorRate {
  material_code: string | null;
  rate_per_kg: number;
  updated_at?: string;
  is_custom?: boolean;
  custom_label?: string | null;
}

export interface AggregatorEarningsPayload {
  total_earned: number;
  orders_completed: number;
  avg_rating?: number | null;
  total_weight_kg?: number;
  material_breakdown?: Array<{ material_code: string; amount: number; weight_kg?: number }>;
  daily_series?: Array<{ date: string; amount: number }>;
}

export interface ExecutionDraftItem {
  materialCode: string;
  label: string;
  weightKg: number;
  ratePerKg: number;
  amount: number;
}

export interface ExecutionDraft {
  lineItems: ExecutionDraftItem[];
  totalAmount: number;
  totalWeight: number;
  capturedAt: string;
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
  estimatedWeights: Record<string, number>;
  sellerType: string;
  rating: number;
  isHighValue?: boolean;
  window: string;
  createdAt: string;
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
  profile: AggregatorProfile | null;
  materialRates: AggregatorRate[];
  earningsByPeriod: Record<'today' | 'week' | 'month' | 'all', AggregatorEarningsPayload | null>;
  executionDraftByOrderId: Record<string, ExecutionDraft>;
  isProfileLoading: boolean;
  isRatesLoading: boolean;
  isEarningsLoading: boolean;
  profileError: string | null;
  ratesError: string | null;
  earningsError: string | null;
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
  scalePhotoUris: string[];
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
  prependFeedOrder: (order: NewOrderRequest) => void;

  /** Active tab: Cancel — calls orderStore, moves to cancelled */
  cancelOrder: (orderId: string) => void;

  /** Legacy: Used by order-detail.tsx Accept button */
  acceptOrder: (orderId: string) => void;

  setScalePhotoUri: (uri: string | null) => void;
  addScalePhotoUri: (uri: string) => void;
  removeScalePhotoAt: (index: number) => void;
  clearScalePhotos: () => void;
  setKycAadhaarFrontUri: (uri: string | null) => void;
  setKycAadhaarBackUri: (uri: string | null) => void;
  setKycSelfieUri: (uri: string | null) => void;
  setKycShopPhotoUri: (uri: string | null) => void;
  setKycVehiclePhotoUri: (uri: string | null) => void;
  setExecutionDraft: (orderId: string, draft: ExecutionDraft) => void;
  clearExecutionDraft: (orderId: string) => void;
  reset: () => void;

  // ── Async API Actions ──────────────────────────────────────────
  /** GET /api/orders/feed — populates newOrders (locality only, V25) */
  fetchFeed: (silent?: boolean) => Promise<void>;
  /** GET /api/orders?role=aggregator — populates aggOrders for Active/Completed/Cancelled tabs */
  fetchAggregatorOrders: (silent?: boolean) => Promise<void>;
  /** GET /api/aggregators/me or fallback /api/users/me */
  fetchAggregatorProfile: () => Promise<void>;
  /** GET /api/aggregators/rates or fallback /api/rates */
  fetchAggregatorRates: () => Promise<void>;
  /** GET /api/aggregators/earnings?period=... */
  fetchAggregatorEarnings: (period: 'today' | 'week' | 'month' | 'all') => Promise<void>;
  /** PATCH /api/aggregators/profile — updates business_name, operating_area */
  updateProfile: (payload: { business_name?: string; operating_area?: string; operating_hours?: any }) => Promise<void>;
  /** PATCH /api/aggregators/rates — updates material rates (standard + custom) */
  updateRates: (rates: { material_code?: string; rate_per_kg: number; is_custom?: boolean; custom_label?: string }[]) => Promise<void>;
  /** POST /api/aggregators/heartbeat — updates online status */
  updateOnlineStatus: (v: boolean) => Promise<void>;
  /** POST /api/orders/:id/accept */
  acceptOrderApi: (orderId: string) => Promise<void>;
  /** PATCH /api/orders/:id/status */
  updateOrderStatusApi: (
    orderId: string,
    status: Extract<OrderStatus, 'en_route' | 'arrived' | 'weighing_in_progress'>,
    note?: string,
    location?: { latitude: number; longitude: number } | null
  ) => Promise<void>;
  /** POST /api/orders/:id/finalize-weighing */
  finalizeWeighingApi: (
    orderId: string,
    lineItems: Array<{ materialCode: string; weightKg: number; ratePerKg: number }>
  ) => Promise<void>;
  /** POST /api/orders/:id/media */
  uploadOrderMediaApi: (orderId: string, photoUri: string, mediaType: 'scale_photo' | 'scrap_photo') => Promise<void>;
  /** POST /api/orders/:id/verify-otp */
  verifyOtpApi: (orderId: string, otp: string) => Promise<void>;
}

const initialMaterials: MaterialConfig[] = [
  { id: 'metal', name: 'Metal', selected: false, ratePerKg: 0, avgRateHint: 0, bgToken: 'metalBg' },
  { id: 'paper', name: 'Paper', selected: false, ratePerKg: 0, avgRateHint: 0, bgToken: 'paperBg' },
  { id: 'plastic', name: 'Plastic', selected: false, ratePerKg: 0, avgRateHint: 0, bgToken: 'plasticBg' },
  { id: 'ewaste', name: 'E-Waste', selected: false, ratePerKg: 0, avgRateHint: 0, bgToken: 'ewasteBg' },
  { id: 'fabric', name: 'Fabric', selected: false, ratePerKg: 0, avgRateHint: 0, bgToken: 'fabricBg' },
  { id: 'glass', name: 'Glass', selected: false, ratePerKg: 0, avgRateHint: 0, bgToken: 'glassBg' },
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

// Maps time slot codes to human-readable labels
const SLOT_LABELS: Record<string, string> = {
  morning_8_10: '8–10 AM',
  morning_10_12: '10 AM–12 PM',
  afternoon_12_2: '12–2 PM',
  afternoon_2_4: '2–4 PM',
  afternoon_4_6: '4–6 PM',
  evening_6_plus: '6 PM+',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Flexible',
};

// Maps feed API order → NewOrderRequest (V25: never includes pickup_address)
function mapFeedOrder(o: any): NewOrderRequest {
  const parsedDistance = Number(o.distance_km ?? o.distanceKm ?? 0);
  const distanceKm = Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : 0;
  const createdAt = o.created_at ? new Date(o.created_at) : new Date();
  const postedMinutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000);

  // Compute total estimated weight: prefer explicit field, fall back to summing map
  let estimatedKg: number;
  if (typeof o.estimated_weight_kg === 'number' && o.estimated_weight_kg > 0) {
    estimatedKg = o.estimated_weight_kg;
  } else {
    const weightsMap: Record<string, any> =
      typeof o.estimated_weights === 'object' && o.estimated_weights !== null
        ? o.estimated_weights as Record<string, any>
        : {};
    estimatedKg = Object.values(weightsMap).reduce((s: number, v: any) => s + Number(v ?? 0), 0);
  }

  // Parse preferred_pickup_window — can be:
  //   - old: "morning" (string)
  //   - new: { type: "morning", scheduledDate: "2026-04-04T00:00:00Z", scheduledTime: "morning_8_10" }
  let windowLabel = 'Flexible pickup';
  const ppw = o.preferred_pickup_window;
  if (ppw) {
    let parsed: any = ppw;
    // If stored as JSON string, parse it
    if (typeof ppw === 'string') {
      try { parsed = JSON.parse(ppw); } catch { parsed = { type: ppw }; }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const dateStr = parsed.scheduledDate ?? parsed.date ?? null;
      const slotStr = parsed.scheduledTime ?? parsed.time ?? parsed.type ?? null;
      const dateLabel = dateStr
        ? new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
        : null;
      const slotLabel = slotStr ? (SLOT_LABELS[slotStr] ?? slotStr) : null;
      if (dateLabel && slotLabel) {
        windowLabel = `${dateLabel} · ${slotLabel}`;
      } else if (dateLabel) {
        windowLabel = dateLabel;
      } else if (slotLabel) {
        windowLabel = slotLabel;
      }
    } else if (typeof parsed === 'string') {
      windowLabel = SLOT_LABELS[parsed] ?? parsed;
    }
  }

  return {
    id: o.id,
    orderNumber:
      typeof o.order_display_id === 'string' && o.order_display_id.trim().length > 0
        ? o.order_display_id
        : `#${String(o.id ?? '').slice(0, 8).toUpperCase()}`,
    locality: o.pickup_locality ?? 'Unknown area',    // V25: only locality, never full address
    distanceKm,
    materials: (o.material_codes ?? []) as MaterialCode[],
    estimatedKg: parseFloat(estimatedKg.toFixed(1)),
    postedMinutesAgo,
    estimatedPrice: typeof o.estimated_value === 'number' ? o.estimated_value : 0,
    estimatedWeights: (o.estimated_weights && typeof o.estimated_weights === 'object') ? o.estimated_weights : {},
    window: windowLabel,
    sellerType: typeof o.seller_type === 'string' ? o.seller_type : 'Seller',
    rating: typeof o.seller_rating === 'number' ? o.seller_rating : 4.5,
    isHighValue: (o.estimated_value ?? 0) > 500,
    createdAt: o.created_at ?? o.createdAt ?? new Date().toISOString(),
  };
}

function computeOrderAmount(order: any): number {
  if (typeof order?.orderAmount === 'number' && Number.isFinite(order.orderAmount)) return order.orderAmount;
  if (typeof order?.display_amount === 'number' && Number.isFinite(order.display_amount)) return order.display_amount;
  if (typeof order?.displayAmount === 'number' && Number.isFinite(order.displayAmount)) return order.displayAmount;
  if (typeof order?.confirmed_total === 'number' && Number.isFinite(order.confirmed_total) && order.confirmed_total > 0) return order.confirmed_total;
  if (typeof order?.estimated_total === 'number' && Number.isFinite(order.estimated_total)) return order.estimated_total;

  const items = Array.isArray(order?.order_items) ? order.order_items : [];
  const fromItems = items.reduce((sum: number, item: any) => {
    const weight = Number(item?.estimated_weight_kg ?? 0);
    const rate = Number(item?.rate_per_kg ?? 0);
    if (!Number.isFinite(weight) || !Number.isFinite(rate)) return sum;
    return sum + (weight * rate);
  }, 0);
  if (fromItems > 0) return fromItems;

  if (typeof order?.estimated_value === 'number' && Number.isFinite(order.estimated_value)) return order.estimated_value;
  if (typeof order?.estimatedAmount === 'number' && Number.isFinite(order.estimatedAmount)) return order.estimatedAmount;
  return 0;
}

// Returns true if right now falls within the aggregator's scheduled working hours
function isWithinWorkingHours(schedule: DaySchedule[]): boolean {
  if (!schedule || schedule.length === 0) return true;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const todayEntry = schedule.find(s => s.day === dayNames[now.getDay()]);
  if (!todayEntry || !todayEntry.isOpen) return false;
  const parseTime = (t: string): number => {
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return -1;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = parseTime(todayEntry.start);
  const end = parseTime(todayEntry.end);
  if (start === -1 || end === -1) return true;
  return cur >= start && cur <= end;
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
  profile: null,
  materialRates: [],
  earningsByPeriod: { today: null, week: null, month: null, all: null },
  executionDraftByOrderId: {},
  isProfileLoading: false,
  isRatesLoading: false,
  isEarningsLoading: false,
  profileError: null,
  ratesError: null,
  earningsError: null,
  isOnline: true,
  isLoading: false,
  feedError: null,
  lastFeedError: null,
  lastFeedSyncAt: null,
  lastAcceptedAt: null,
  error: null,
  isNetworkError: false,
  scalePhotoUri: null,
  scalePhotoUris: [],
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

  prependFeedOrder: (order) => set((state) => {
    const exists = state.newOrders.some(existing => existing.id === order.id);
    if (exists) {
      return {};
    }

    // Prepend new order and cap feed at 50 items
    return {
      newOrders: [order, ...state.newOrders].slice(0, 50),
      lastFeedSyncAt: new Date().toISOString(),
    };
  }),

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

  setScalePhotoUri: (uri) => set({
    scalePhotoUri: uri,
    scalePhotoUris: uri ? [uri] : [],
  }),
  addScalePhotoUri: (uri) => set((state) => {
    if (!uri) return state;
    if (state.scalePhotoUris.includes(uri)) {
      return { scalePhotoUri: uri };
    }
    return {
      scalePhotoUri: uri,
      scalePhotoUris: [...state.scalePhotoUris, uri],
    };
  }),
  removeScalePhotoAt: (index) => set((state) => {
    if (index < 0 || index >= state.scalePhotoUris.length) return state;
    const nextScalePhotoUris = state.scalePhotoUris.filter((_, idx) => idx !== index);
    return {
      scalePhotoUris: nextScalePhotoUris,
      scalePhotoUri: nextScalePhotoUris.length > 0 ? nextScalePhotoUris[nextScalePhotoUris.length - 1] : null,
    };
  }),
  clearScalePhotos: () => set({
    scalePhotoUri: null,
    scalePhotoUris: [],
  }),
  setKycAadhaarFrontUri: (uri) => set({ kycAadhaarFrontUri: uri }),
  setKycAadhaarBackUri: (uri) => set({ kycAadhaarBackUri: uri }),
  setKycSelfieUri: (uri) => set({ kycSelfieUri: uri }),
  setKycShopPhotoUri: (uri) => set({ kycShopPhotoUri: uri }),
  setKycVehiclePhotoUri: (uri) => set({ kycVehiclePhotoUri: uri }),
  setExecutionDraft: (orderId, draft) => set((state) => ({
    executionDraftByOrderId: {
      ...state.executionDraftByOrderId,
      [orderId]: draft,
    },
  })),
  clearExecutionDraft: (orderId) => set((state) => {
    const next = { ...state.executionDraftByOrderId };
    delete next[orderId];
    return { executionDraftByOrderId: next };
  }),

  reset: () => set({
    fullName: '', businessName: '', aggregatorType: null, primaryArea: '',
    operatingHours: { from: '08:00 AM', to: '07:00 PM' },
    operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weeklySchedule: WEEKLY_SCHEDULE_DEFAULT,
    operatingAreas: [],
    materials: initialMaterials,
    nearbyOrders: [], newOrders: [], aggOrders: [], activeOrders: [], dismissedOrderIds: [],
    earnings: { todayAmount: 0, todayPickups: 0, weekAmount: 0, weekPickups: 0 },
    profile: null,
    materialRates: [],
    earningsByPeriod: { today: null, week: null, month: null, all: null },
    executionDraftByOrderId: {},
    isProfileLoading: false,
    isRatesLoading: false,
    isEarningsLoading: false,
    profileError: null,
    ratesError: null,
    earningsError: null,
    isOnline: true, isLoading: false, feedError: null, lastFeedError: null, lastFeedSyncAt: null, lastAcceptedAt: null, error: null,
    isNetworkError: false,
    scalePhotoUri: null, scalePhotoUris: [], kycAadhaarFrontUri: null, kycAadhaarBackUri: null,
    kycSelfieUri: null, kycShopPhotoUri: null, kycVehiclePhotoUri: null,
  }),

  // ── Async: GET /api/orders/feed ────────────────────────────────
  fetchFeed: async (silent = false) => {
    // Preserve existing feedError if it exists until we succeed
    // When silent=true: skip setting isLoading to avoid triggering a UI spinner on background polls
    if (!silent && !get().feedError) set({ isLoading: true, feedError: null, lastFeedError: null, isNetworkError: false });
    else if (!silent) set({ isLoading: true, isNetworkError: false });

    try {
      // Try to get device location to enable server-side distance computation
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const Location = require('expo-location');
        const hasPerm = await Location.getForegroundPermissionsAsync();
        if (hasPerm.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 5000 });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      } catch {
        // Location unavailable — distance will show as 0 on cards
      }

      const params: Record<string, any> = {};
      if (lat !== null && lng !== null) {
        params.lat = lat.toFixed(6);
        params.lng = lng.toFixed(6);
      }

      const res = await api.get('/api/orders/feed', { params });
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
    // When silent=true: skip setting isLoading so background polls don't flash the spinner
    if (!silent && !get().error) set({ isLoading: true, error: null, isNetworkError: false });
    else if (!silent) set({ isLoading: true, isNetworkError: false });

    try {
      const res = await api.get('/api/orders', { params: { role: 'aggregator' } });
      const normalized = (res.data.orders ?? []).map((order: any) => ({
        ...order,
        orderAmount: computeOrderAmount(order),
      }));
      set({ aggOrders: normalized, isLoading: false, error: null, isNetworkError: false });
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

  fetchAggregatorProfile: async () => {
    set({ isProfileLoading: true, profileError: null });
    try {
      let profileRes: any;
      try {
        profileRes = await api.get('/api/aggregators/me');
      } catch {
        profileRes = await api.get('/api/users/me');
      }

      const payload = profileRes.data ?? {};
      const name = payload.name ?? null;
      const operatingHours = payload.operating_hours ?? payload.aggregator_operating_hours ?? null;
      const operatingArea = payload.operating_area ?? payload.aggregator_locality ?? null;
      const businessName = payload.business_name ?? payload.aggregator_business_name ?? null;
      const cityCode = payload.city_code ?? payload.aggregator_city_code ?? null;
      const kycStatus = payload.kyc_status ?? payload.aggregator_kyc_status ?? null;
      const isOnline = payload.is_online !== undefined ? Boolean(payload.is_online) : true;

      const parsedSchedule = Array.isArray(operatingHours?.days)
        ? operatingHours.days
        : get().weeklySchedule;

      set({
        profile: {
          name,
          businessName,
          operatingArea,
          operatingHours,
          kycStatus,
          cityCode,
        },
        businessName: businessName ?? '',
        primaryArea: operatingArea ?? '',
        weeklySchedule: parsedSchedule,
        isOnline: isWithinWorkingHours(parsedSchedule),
        isProfileLoading: false,
        profileError: null,
      });
    } catch (e: any) {
      set({
        isProfileLoading: false,
        profileError: e.response?.data?.error ?? e.message ?? 'Failed to load profile',
      });
    }
  },

  fetchAggregatorRates: async () => {
    set({ isRatesLoading: true, ratesError: null });
    try {
      let ratesRes: any;
      try {
        ratesRes = await api.get('/api/aggregators/me/rates');
      } catch {
        ratesRes = await api.get('/api/rates');
      }

      const incoming = (Array.isArray(ratesRes.data) ? ratesRes.data : (ratesRes.data?.rates ?? [])) as AggregatorRate[];
      const ratesMap = new Map(incoming.map((item) => [item.material_code, item.rate_per_kg]));
      set((state) => ({
        materialRates: incoming,
        materials: state.materials.map((material) => {
          const nextRate = ratesMap.get(material.id) ?? material.ratePerKg;
          return {
            ...material,
            ratePerKg: Number(nextRate || 0),
            selected: ratesMap.has(material.id),
          };
        }),
        isRatesLoading: false,
        ratesError: null,
      }));
    } catch (e: any) {
      set({
        isRatesLoading: false,
        ratesError: e.response?.data?.error ?? e.message ?? 'Failed to load rates',
      });
    }
  },

  fetchAggregatorEarnings: async (period) => {
    set({ isEarningsLoading: true, earningsError: null });
    try {
      const res = await api.get('/api/aggregators/earnings', { params: { period } });
      const payload = (res.data ?? {}) as AggregatorEarningsPayload;
      set((state) => ({
        earningsByPeriod: {
          ...state.earningsByPeriod,
          [period]: payload,
        },
        earnings: {
          todayAmount: period === 'today' ? Number(payload.total_earned ?? 0) : state.earnings.todayAmount,
          todayPickups: period === 'today' ? Number(payload.orders_completed ?? 0) : state.earnings.todayPickups,
          weekAmount: period === 'week' ? Number(payload.total_earned ?? 0) : state.earnings.weekAmount,
          weekPickups: period === 'week' ? Number(payload.orders_completed ?? 0) : state.earnings.weekPickups,
        },
        isEarningsLoading: false,
        earningsError: null,
      }));
    } catch (e: any) {
      set({
        isEarningsLoading: false,
        earningsError: e.response?.data?.error ?? e.message ?? 'Failed to load earnings',
      });
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
      await get().fetchAggregatorProfile();
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to save profile', isLoading: false });
      throw e;
    }
  },

  // ── Async: PATCH /api/aggregators/rates ─────────────────────────
  updateRates: async (rates) => {
    const previousRates = get().materialRates;
    // Optimistic update for standard rates only
    const standardRates = rates.filter(r => !r.is_custom && r.material_code);
    set((state) => ({
      isLoading: true,
      error: null,
      materialRates: rates as AggregatorRate[],
      materials: state.materials.map((material) => {
        const incoming = standardRates.find((r) => r.material_code === material.id);
        if (!incoming) return material;
        return {
          ...material,
          ratePerKg: Number(incoming.rate_per_kg || 0),
          selected: true,
        };
      }),
    }));
    try {
      await api.patch('/api/aggregators/rates', { rates });
      await get().fetchAggregatorRates();
      set({ isLoading: false });
    } catch (e: any) {
      set({
        error: e.response?.data?.error ?? e.message ?? 'Failed to update rates',
        isLoading: false,
        materialRates: previousRates,
      });
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
      const completedOrderWithAmount = {
        ...completedOrder,
        orderAmount: computeOrderAmount(completedOrder),
      };
      
      // Add or update it in the global order store so the Active tab sees it instantly
      const { useOrderStore, mapApiOrder } = require('./orderStore');
      const mappedOrder = mapApiOrder(completedOrderWithAmount);
      useOrderStore.getState().addOrder(mappedOrder);
      
      // Update local aggregator state arrays, including aggOrders
      set((state) => ({
        newOrders: state.newOrders.filter((o) => o.id !== orderId),
        activeOrders: [...state.activeOrders, orderId],
        aggOrders: [completedOrderWithAmount, ...state.aggOrders],
        lastAcceptedAt: new Date().toISOString(),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to accept order', isLoading: false });
      throw e;
    }
  },

  // ── Async: PATCH /api/orders/:orderId/status ──────────────────
  updateOrderStatusApi: async (orderId, status, note, location) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch(`/api/orders/${orderId}/status`, {
        status,
        ...(note ? { note } : {}),
        ...(location ? { aggregator_lat: location.latitude, aggregator_lng: location.longitude } : {}),
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
  finalizeWeighingApi: async (orderId, lineItems) => {
    set({ isLoading: true, error: null });
    try {
      const payload = {
        line_items: lineItems.map((item) => ({
          material_code: item.materialCode,
          confirmed_weight_kg: item.weightKg,
          rate_per_kg: item.ratePerKg,
        })),
      };

      const res = await api.post(`/api/orders/${orderId}/finalize-weighing`, payload);
      const updatedOrder = res.data?.order;

      const { useOrderStore } = require('./orderStore');
      if (updatedOrder) {
        useOrderStore.getState().addOrder(mapApiOrder(updatedOrder));
      } else {
        await useOrderStore.getState().fetchOrder(orderId, true);
      }

      set((state) => ({
        aggOrders: state.aggOrders.map((order) => {
          const currentOrderId = order.id ?? order.orderId;
          if (currentOrderId !== orderId) return order;
          return updatedOrder ? { ...order, ...updatedOrder } : order;
        }),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.response?.data?.error ?? e.message ?? 'Failed to finalize weighing', isLoading: false });
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
