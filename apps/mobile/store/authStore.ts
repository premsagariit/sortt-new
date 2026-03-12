/**
 * store/authStore.ts
 * ──────────────────────────────────────────────────────────────────
 * Zustand auth store — Day 2 §2.1 scaffold.
 *
 * Currently stores only local UI state (no backend session yet).
 * Live auth integration happens on Day 5 when the backend is wired.
 *
 * Fields:
 *   phoneNumber  — the E.164-formatted number entered on PhoneScreen
 *                  (without the +91 prefix — stored as 10-digit string)
 *   isLoading    — true while OTP is being sent (simulated in §2.2;
 *                  real network call in §5.4)
 *   session      — null until Clerk session established (Day 7)
 *
 * Future stores to add alongside this one (PLAN.md §2.1):
 *   orderStore.ts, aggregatorStore.ts, chatStore.ts, uiStore.ts
 * ──────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';

// ── Global Clerk Hooks ────────────────────────────────────────────
let globalClerkSignOut: (() => Promise<void>) | null = null;

export const setGlobalClerkSignOut = (fn: () => Promise<void>) => {
  globalClerkSignOut = fn;
};

// ─── Session type (populated on Day 7 with real session) ──
export interface AuthSession {
  userId: string;
  userType: 'seller' | 'aggregator';
  accessToken: string;
}

// ─── Store shape ──────────────────────────────────────────────────
interface AuthState {
  /** 10-digit phone number (no country code prefix) */
  phoneNumber: string;
  /** True while OTP send is in-flight */
  isLoading: boolean;
  /** Null until Day 5 live auth */
  session: AuthSession | null;

  // ── Onboarding & Mock State ───────────────────────────────────────────
  userId: string | null;
  userType: 'seller' | 'aggregator' | null;
  accountType: 'individual' | 'business' | null;
  name: string;
  locality: string;
  city: string;

  // ── Actions ────────────────────────────────────────────────────
  setPhoneNumber: (phone: string) => void;
  setIsLoading: (loading: boolean) => void;
  setSession: (session: AuthSession | null) => void;

  requestOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string, userType?: string) => Promise<{ success: boolean; token?: string; error?: string }>;

  setUserId: (id: string | null) => void;
  setUserType: (type: 'seller' | 'aggregator' | null) => void;
  setAccountType: (type: 'individual' | 'business' | null) => void;
  setName: (name: string) => void;
  setLocality: (locality: string) => void;
  setCity: (city: string) => void;

  /** Reset to initial state — kept as low-level utility */
  reset: () => void;
  /**
   * Sign out the current user and clear all local auth state.
   * Invokes the injected clerk.signOut() to invalidate the JWT.
   */
  signOut: () => Promise<void>;
}

const initialState: Pick<AuthState,
  'phoneNumber' | 'isLoading' | 'session' | 'userId' | 'userType' |
  'accountType' | 'name' | 'locality' | 'city'
> = {
  phoneNumber: '',
  isLoading: false,
  session: null,
  userId: null,       // Set after auth — Day 7 populates from Clerk session
  userType: null,     // Set on user-type screen — null until user makes a choice
  accountType: null,
  name: '',
  locality: '',
  city: '',
};

// ─── Store ────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSession: (session) => set({ session }),
  setUserId: (id) => set({ userId: id }),
  setUserType: (type) => set({ userType: type }),
  setAccountType: (type) => set({ accountType: type }),
  setName: (name) => set({ name }),
  setLocality: (locality) => set({ locality }),
  setCity: (city) => set({ city }),
  reset: () => set(initialState),

  signOut: async () => {
    if (globalClerkSignOut) {
      try {
        await globalClerkSignOut();
      } catch (err) {
        console.error('Clerk root sign out failed:', err);
      }
    }
    set(initialState);
  },

  requestOtp: async (phone: string) => {
    set({ isLoading: true });
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}` }),
      });
      if (!response.ok) {
        // Parse the actual error from backend (rate limit, invalid phone, etc.)
        let errorMsg = "Failed to request OTP";
        try {
          const errBody = await response.json();
          errorMsg = errBody?.error || errorMsg;
        } catch { }
        throw new Error(errorMsg);
      }
      set({ isLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err.message };
    }
  },

  verifyOtp: async (phone: string, otp: string, userType?: string) => {
    set({ isLoading: true });
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}`, otp, user_type: userType }),
      });
      if (!response.ok) {
        let errorMsg = "Invalid OTP";
        try {
          const errBody = await response.json();
          errorMsg = errBody?.error || errorMsg;
        } catch { }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      set({
        userId: data.user?.id || null,
        userType: data.user?.user_type || null,
        name: data.user?.name || '',
        isLoading: false,
      });
      return { success: true, token: data.token }; // Note: Component uses this token for Clerk
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err.message };
    }
  },
}));
