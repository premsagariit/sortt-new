import { create } from 'zustand';
import { MaterialCode } from '../components/ui/MaterialChip';
import { api } from '../lib/api';

export interface ListingState {
  // Step 1
  selectedMaterials: MaterialCode[];

  // Step 2
  weights: Record<MaterialCode, string>;
  photoUri: string | null;
  aiHintShown: boolean;
  customNames: Record<string, string>;

  // Step 3
  pickupType: 'scheduled' | 'dropoff' | null;
  scheduledDate: string;
  scheduledTime: string;
  addressLine: string;
  notes: string;

  // Actions
  setMaterials: (m: MaterialCode[]) => void;
  setWeight: (code: MaterialCode, val: string) => void;
  setPhotoUri: (uri: string | null) => void;
  setAiHintShown: (v: boolean) => void;
  setCustomName: (code: string, name: string) => void;
  setPickupType: (t: 'scheduled' | 'dropoff') => void;
  setScheduledDate: (d: string) => void;
  setScheduledTime: (t: string) => void;
  setAddressLine: (a: string) => void;
  setNotes: (n: string) => void;
  resetListing: () => void;

  // ── Async API action ──
  submitListing: () => Promise<{ success: boolean; orderId?: string; error?: string }>;
}

const initialState = {
  selectedMaterials: [],
  weights: {} as Record<MaterialCode, string>,
  photoUri: null,
  aiHintShown: false,
  customNames: {},
  pickupType: null,
  scheduledDate: '',
  scheduledTime: '',
  addressLine: '',
  notes: '',
};

const SLOT_TO_SESSION: Record<string, string> = {
  morning_8_10: 'morning',
  morning_10_12: 'morning',
  afternoon_12_2: 'afternoon',
  afternoon_2_4: 'afternoon',
  afternoon_4_6: 'afternoon',
  evening_6_plus: 'evening',
};

export const useListingStore = create<ListingState>((set, get) => ({
  ...initialState,

  setMaterials: (selectedMaterials) => set({ selectedMaterials }),

  setWeight: (code, val) =>
    set((state) => ({
      weights: { ...state.weights, [code]: val }
    })),

  setPhotoUri: (photoUri) => set({ photoUri }),

  setAiHintShown: (aiHintShown) => set({ aiHintShown }),

  setCustomName: (code, name) =>
    set((state) => ({
      customNames: { ...state.customNames, [code]: name }
    })),

  setPickupType: (pickupType) => set({ pickupType }),

  setScheduledDate: (scheduledDate) => set({ scheduledDate }),

  setScheduledTime: (scheduledTime) => set({ scheduledTime }),

  setAddressLine: (addressLine) => set({ addressLine }),

  setNotes: (notes) => set({ notes }),

  resetListing: () => set(initialState),

  // ── POST /api/orders — builds payload from current form state ──
  submitListing: async () => {
    const state = get();
    const material_codes = state.selectedMaterials;
    const estimated_weights: Record<string, number> = {};
    for (const code of material_codes) {
      estimated_weights[code] = parseFloat(state.weights[code] ?? '0') || 0;
    }

    const pickup_preference = SLOT_TO_SESSION[state.scheduledTime] || 'anytime';

    try {
      const res = await api.post('/api/orders', {
        material_codes,
        estimated_weights,
        pickup_address: state.addressLine,
        pickup_preference,
        seller_note: state.notes || undefined,
      });
      return { success: true, orderId: res.data.order?.id };
    } catch (e: any) {
      const code = e.response?.data?.error;
      const message = e.response?.data?.message ?? e.message ?? 'Submission failed';
      return { success: false, error: code ?? message };
    }
  },
}));

