// Scaffold — all cross-cutting UI state, no backend integration
import { create } from 'zustand';

interface UIStoreState {
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | null;
  isOffline: boolean;
  // Actions
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  setOffline: (v: boolean) => void;
  reset: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  toastMessage: null,
  toastType: null,
  isOffline: false,
  showToast: (message, type = 'info') =>
    set({ toastMessage: message, toastType: type }),
  hideToast: () => set({ toastMessage: null, toastType: null }),
  setOffline: (v) => set({ isOffline: v }),
  reset: () => set({ toastMessage: null, toastType: null, isOffline: false }),
}));
