import { create } from 'zustand';
import { MaterialCode } from '../components/ui/MaterialChip';

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

export const useListingStore = create<ListingState>((set) => ({
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
}));
