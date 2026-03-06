/**
 * store/authStore.ts
 * ──────────────────────────────────────────────────────────────────
 * Zustand auth store — Day 2 §2.1 scaffold.
 *
 * Currently stores only local UI state (no Supabase session yet).
 * Live auth integration happens on Day 5 when the backend is wired.
 *
 * Fields:
 *   phoneNumber  — the E.164-formatted number entered on PhoneScreen
 *                  (without the +91 prefix — stored as 10-digit string)
 *   isLoading    — true while OTP is being sent (simulated in §2.2;
 *                  real network call in §5.4)
 *   session      — null until Supabase session established (Day 5)
 *
 * Future stores to add alongside this one (PLAN.md §2.1):
 *   orderStore.ts, aggregatorStore.ts, chatStore.ts, uiStore.ts
 * ──────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';

// ─── Session type (populated on Day 5 with real Supabase session) ──
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
   * Day 5: add `await supabase.auth.signOut()` call here before `set(initialState)`
   * to invalidate the Supabase JWT and prevent token reuse (BSE finding S1).
   */
  signOut: () => void;
}

const initialState: Pick<AuthState,
  'phoneNumber' | 'isLoading' | 'session' | 'userId' | 'userType' |
  'accountType' | 'name' | 'locality' | 'city'
> = {
  phoneNumber: '',
  isLoading: false,
  session: null,
  userId: null,       // Set after auth — Day 5 populates from Supabase session
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
  // Day 5: add `await supabase.auth.signOut()` before set() — BSE finding S1
  signOut: () => set(initialState),
}));
