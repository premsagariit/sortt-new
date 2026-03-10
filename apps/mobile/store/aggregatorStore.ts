// Scaffold — backend wired on Day 4 per @PLAN.md
// No backend API calls here. All actions are local state only.
import { create } from 'zustand';
import type { MaterialCode } from '../components/ui/MaterialChip';

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
  newOrders: NewOrderRequest[];       // Incoming requests (New tab)
  activeOrders: string[];             // Accepted order IDs
  dismissedOrderIds: string[];        // Dismissed from home feed (no-op dismissals)
  earnings: AggregatorEarnings;
  isOnline: boolean;
  isLoading: boolean;

  // ── Photo Capture State ────────────────────────────────────────
  scalePhotoUri: string | null;
  kycAadhaarFrontUri: string | null;
  kycAadhaarBackUri: string | null;
  kycSelfieUri: string | null;
  kycShopPhotoUri: string | null;
  kycVehiclePhotoUri: string | null;

  // ── Actions ────────────────────────────────────────────────────
  setProfile: (p: Partial<Pick<AggregatorStoreState, 'fullName' | 'businessName' | 'aggregatorType' | 'primaryArea' | 'operatingHours' | 'operatingDays' | 'weeklySchedule'>>) => void;
  setOperatingAreas: (areas: string[]) => void;
  setMaterialSelected: (id: string, selected: boolean) => void;
  setMaterialRate: (id: string, rate: number) => void;

  setNearbyOrders: (orders: NearbyOrder[]) => void;
  setOnline: (v: boolean) => void;
  setLoading: (v: boolean) => void;

  /** Home feed: Dismiss (no detail view) — removes from home only */
  dismissOrder: (orderId: string) => void;

  /** New tab: Reject without accepting — removes from newOrders, NOT added to cancelled */
  dismissNewOrder: (orderId: string) => void;

  /** New tab: Accept — moves to Active, creates order in orderStore */
  acceptNewOrder: (orderId: string) => void;

  /** Active tab: Cancel — moves to Cancelled in orderStore */
  cancelOrder: (orderId: string, reason: string) => void;

  /** Legacy: Used by order-detail.tsx Accept button */
  acceptOrder: (orderId: string) => void;

  setScalePhotoUri: (uri: string | null) => void;
  setKycAadhaarFrontUri: (uri: string | null) => void;
  setKycAadhaarBackUri: (uri: string | null) => void;
  setKycSelfieUri: (uri: string | null) => void;
  setKycShopPhotoUri: (uri: string | null) => void;
  setKycVehiclePhotoUri: (uri: string | null) => void;
  reset: () => void;
}

const initialMaterials: MaterialConfig[] = [
  { id: 'metal-iron', name: 'Metal (Iron)', selected: true, ratePerKg: 28, avgRateHint: 28, bgToken: 'metalBg' },
  { id: 'metal-copper', name: 'Metal (Copper)', selected: true, ratePerKg: 480, avgRateHint: 480, bgToken: 'metalBg' },
  { id: 'paper', name: 'Paper', selected: true, ratePerKg: 12, avgRateHint: 12, bgToken: 'paperBg' },
  { id: 'plastic-pet', name: 'Plastic (PET)', selected: false, ratePerKg: 8, avgRateHint: 8, bgToken: 'plasticBg' },
  { id: 'ewaste', name: 'E-Waste', selected: false, ratePerKg: 60, avgRateHint: 60, bgToken: 'ewasteBg' },
  { id: 'fabric', name: 'Fabric', selected: false, ratePerKg: 6, avgRateHint: 6, bgToken: 'fabricBg' },
];

// Seed — guarantees ≥1 card in New tab every rebuild
const SEED_NEW_ORDERS: NewOrderRequest[] = [
  {
    id: 'NEW-001',
    locality: 'Banjara Hills area',
    distanceKm: 1.4,
    materials: ['metal', 'paper'],
    estimatedKg: 22,
    postedMinutesAgo: 8,
    estimatedPrice: 896,
    sellerType: 'Industry seller',
    rating: 4.9,
    isHighValue: true,
    window: 'Today · 10 AM — 12 PM',
  },
  {
    id: 'NEW-002',
    locality: 'Jubilee Hills area',
    distanceKm: 2.1,
    materials: ['plastic', 'glass'],
    estimatedKg: 8,
    postedMinutesAgo: 22,
    estimatedPrice: 320,
    sellerType: 'Residential seller',
    rating: 4.7,
    isHighValue: false,
    window: 'Today · 2 PM — 4 PM',
  },
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
  newOrders: SEED_NEW_ORDERS,
  activeOrders: [],
  dismissedOrderIds: [],
  earnings: { todayAmount: 0, todayPickups: 0, weekAmount: 0, weekPickups: 0 },
  isOnline: false,
  isLoading: false,
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
      aggregatorId: 'user-agg-001',
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
    });
    return {
      newOrders: state.newOrders.filter(o => o.id !== orderId),
      activeOrders: [...state.activeOrders, orderId],
    };
  }),

  cancelOrder: (orderId, _reason) => set((state) => {
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
    nearbyOrders: [], newOrders: SEED_NEW_ORDERS, activeOrders: [], dismissedOrderIds: [],
    earnings: { todayAmount: 0, todayPickups: 0, weekAmount: 0, weekPickups: 0 },
    isOnline: false, isLoading: false,
    scalePhotoUri: null, kycAadhaarFrontUri: null, kycAadhaarBackUri: null, kycSelfieUri: null, kycShopPhotoUri: null, kycVehiclePhotoUri: null,
  }),
}));
