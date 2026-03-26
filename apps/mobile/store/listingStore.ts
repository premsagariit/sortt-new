import { create } from 'zustand';
import { MaterialCode } from '../components/ui/MaterialChip';
import { api } from '../lib/api';

type SelectedAddressSnapshot = {
  id: string;
  label: string;
  building_name: string | null;
  street: string | null;
  colony: string | null;
  city: string;
  pincode: string;
  pickup_locality: string | null;
};

export interface ListingState {
  // Step 1
  selectedMaterials: MaterialCode[];

  // Step 2
  weights: Record<MaterialCode, string>;
  photoUri: string | null;
  photoUris: string[];
  aiHintShown: boolean;
  aiEstimateHint: { material_code: string; estimated_weight_kg: number; confidence: number } | null;
  isAiEstimate: boolean;
  customNames: Record<string, string>;

  // Step 3
  pickupType: 'scheduled' | 'dropoff' | null;
  scheduledDate: string;
  scheduledTime: string;
  selectedAddressId: string | null;
  selectedAddressSnapshot: SelectedAddressSnapshot | null;
  notes: string;

  // Actions
  setMaterials: (m: MaterialCode[]) => void;
  setWeight: (code: MaterialCode, val: string) => void;
  setPhotoUri: (uri: string | null) => void;
  addPhotoUri: (uri: string) => void;
  removePhotoAt: (index: number) => void;
  setAiHintShown: (v: boolean) => void;
  setAiEstimate: (hint: { material_code: string; estimated_weight_kg: number; confidence: number } | null) => void;
  setCustomName: (code: string, name: string) => void;
  setPickupType: (t: 'scheduled' | 'dropoff') => void;
  setScheduledDate: (d: string) => void;
  setScheduledTime: (t: string) => void;
  setSelectedAddress: (address: SelectedAddressSnapshot | null) => void;
  setNotes: (n: string) => void;
  resetListing: () => void;

  // ── Async API action ──
  submitListing: () => Promise<{ success: boolean; orderId?: string; error?: string }>;
}

const initialState = {
  selectedMaterials: [],
  weights: {} as Record<MaterialCode, string>,
  photoUri: null,
  photoUris: [],
  aiHintShown: false,
  aiEstimateHint: null,
  isAiEstimate: false,
  customNames: {},
  pickupType: null,
  scheduledDate: '',
  scheduledTime: '',
  selectedAddressId: null,
  selectedAddressSnapshot: null,
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

  setPhotoUri: (photoUri) => set({ photoUri, photoUris: photoUri ? [photoUri] : [] }),

  addPhotoUri: (uri) => set((state) => {
    if (!uri) return state;
    if (state.photoUris.includes(uri)) {
      return { photoUri: uri };
    }
    return {
      photoUri: uri,
      photoUris: [...state.photoUris, uri],
    };
  }),

  removePhotoAt: (index) => set((state) => {
    if (index < 0 || index >= state.photoUris.length) return state;
    const nextPhotoUris = state.photoUris.filter((_, idx) => idx !== index);
    return {
      photoUris: nextPhotoUris,
      photoUri: nextPhotoUris.length > 0 ? nextPhotoUris[nextPhotoUris.length - 1] : null,
      aiEstimateHint: null,
      isAiEstimate: false,
      aiHintShown: false,
    };
  }),

  setAiHintShown: (aiHintShown) => set({ aiHintShown }),

  setAiEstimate: (hint) => set({
    aiEstimateHint: hint,
    isAiEstimate: !!hint,
    aiHintShown: !!hint,
  }),

  setCustomName: (code, name) =>
    set((state) => ({
      customNames: { ...state.customNames, [code]: name }
    })),

  setPickupType: (pickupType) => set({ pickupType }),

  setScheduledDate: (scheduledDate) => set({ scheduledDate }),

  setScheduledTime: (scheduledTime) => set({ scheduledTime }),

  setSelectedAddress: (address) =>
    set({
      selectedAddressId: address?.id ?? null,
      selectedAddressSnapshot: address,
    }),

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
        selectedAddressId: state.selectedAddressId,
        pickup_preference,
        seller_note: state.notes || undefined,
      });
      
      const orderId = res.data.order?.id;

      const uploadUris = state.photoUris.length > 0
        ? state.photoUris
        : (state.photoUri ? [state.photoUri] : []);

      if (orderId && uploadUris.length > 0) {
        try {
          for (let idx = 0; idx < uploadUris.length; idx += 1) {
            const formData = new FormData();
            formData.append('media_type', 'scrap_photo');
            formData.append('file', {
              uri: uploadUris[idx],
              name: `scrap_photo_${idx + 1}.jpg`,
              type: 'image/jpeg',
            } as any);

            await api.post(`/api/orders/${orderId}/media`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
          }
        } catch (err: any) {
          console.warn('Failed to upload order photo (non-fatal):', err.message);
        }
      }

      return { success: true, orderId };
    } catch (e: any) {
      const code = e.response?.data?.error;
      const message = e.response?.data?.message ?? e.message ?? 'Submission failed';
      return { success: false, error: code ?? message };
    }
  },
}));

