// Scaffold — backend wired on Day 4 per @PLAN.md
// No Supabase calls here. All actions are local state only.
import { create } from 'zustand';

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

interface AggregatorStoreState {
  // ── Onboarding State ───────────────────────────────────────────
  fullName: string;
  businessName: string;
  businessType: 'shop' | 'mobile' | null;
  primaryArea: string;
  operatingHours: { from: string; to: string };
  operatingDays: string[];
  operatingAreas: string[];
  materials: MaterialConfig[];

  // ── Runtime State ──────────────────────────────────────────────
  nearbyOrders: NearbyOrder[];
  activeOrders: string[];  // order IDs
  earnings: AggregatorEarnings;
  isOnline: boolean;
  isLoading: boolean;

  // ── Photo Capture State (local only — Day 8 uploads via IStorageProvider) ──
  scalePhotoUri: string | null;
  kycAadhaarUri: string | null;
  kycShopPhotoUri: string | null;

  // ── Actions ────────────────────────────────────────────────────
  setProfile: (p: Partial<Pick<AggregatorStoreState, 'fullName' | 'businessName' | 'businessType' | 'primaryArea' | 'operatingHours' | 'operatingDays'>>) => void;
  setOperatingAreas: (areas: string[]) => void;
  setMaterialSelected: (id: string, selected: boolean) => void;
  setMaterialRate: (id: string, rate: number) => void;

  setNearbyOrders: (orders: NearbyOrder[]) => void;
  setOnline: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  setScalePhotoUri: (uri: string | null) => void;
  setKycAadhaarUri: (uri: string | null) => void;
  setKycShopPhotoUri: (uri: string | null) => void;
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

// Scaffold only — no backend calls until Day 4
export const useAggregatorStore = create<AggregatorStoreState>((set) => ({
  fullName: '',
  businessName: '',
  businessType: null,
  primaryArea: '',
  operatingHours: { from: '08:00 AM', to: '07:00 PM' },
  operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  operatingAreas: [],
  materials: initialMaterials,

  nearbyOrders: [],
  activeOrders: [],
  earnings: { todayAmount: 0, todayPickups: 0, weekAmount: 0, weekPickups: 0 },
  isOnline: false,
  isLoading: false,
  scalePhotoUri: null,
  kycAadhaarUri: null,
  kycShopPhotoUri: null,

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
  setScalePhotoUri: (uri) => set({ scalePhotoUri: uri }),
  setKycAadhaarUri: (uri) => set({ kycAadhaarUri: uri }),
  setKycShopPhotoUri: (uri) => set({ kycShopPhotoUri: uri }),
  reset: () => set({
    fullName: '', businessName: '', businessType: null, primaryArea: '',
    operatingHours: { from: '08:00 AM', to: '07:00 PM' },
    operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    operatingAreas: [],
    materials: initialMaterials,
    nearbyOrders: [], activeOrders: [], isOnline: false, isLoading: false,
  }),
}));
