import { create } from 'zustand';
import { api } from '../lib/api';

let globalClerkSignOut: (() => Promise<void>) | null = null;

export const setGlobalClerkSignOut = (fn: () => Promise<void>) => {
  globalClerkSignOut = fn;
};

type UserType = 'seller' | 'aggregator' | null;

interface SessionUser {
  id: string;
  user_type: UserType;
}

interface LegacyAuthSession {
  userId: string;
  userType: 'seller' | 'aggregator';
  accessToken: string;
}

export interface AuthState {
  token: string | null;
  user: SessionUser | null;
  isNewUser: boolean;

  phoneNumber: string;
  isLoading: boolean;
  session: LegacyAuthSession | null;

  userId: string | null;
  userType: UserType;
  accountType: 'individual' | 'business' | null;
  name: string;
  locality: string;
  city: string;
  createdAt: string | null;
  meLoaded: boolean;

  setSession: (data: { token: string; user: SessionUser; isNewUser: boolean }) => void;
  clearSession: () => void;

  setPhoneNumber: (phone: string) => void;
  setIsLoading: (loading: boolean) => void;
  setLegacySession: (session: LegacyAuthSession | null) => void;

  requestOtp: (phone: string, mode: 'login' | 'signup') => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  setUserId: (id: string | null) => void;
  setUserType: (type: UserType) => void;
  setAccountType: (type: 'individual' | 'business' | null) => void;
  setName: (name: string) => void;
  setLocality: (locality: string) => void;
  setCity: (city: string) => void;

  reset: () => void;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

const initialState = {
  token: null,
  user: null,
  isNewUser: false,

  phoneNumber: '',
  isLoading: false,
  session: null,

  userId: null,
  userType: null,
  accountType: null,
  name: '',
  locality: '',
  city: '',
  createdAt: null,
  meLoaded: false,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  setSession: ({ token, user, isNewUser }) => {
    set({
      token,
      user,
      isNewUser,
      userId: user.id,
      userType: user.user_type,
    });
  },

  clearSession: () => {
    set({
      token: null,
      user: null,
      isNewUser: false,
      userId: null,
      userType: null,
      meLoaded: false,
    });
  },

  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setLegacySession: (session) => set({ session }),

  requestOtp: async (phone, mode) => {
    set({ isLoading: true });
    try {
      await api.post('/api/auth/request-otp', { phone: `+91${phone}`, mode });
      set({ isLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err?.response?.data?.error || err?.response?.data?.message || 'Failed to request OTP' };
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/auth/verify-otp', { phone: `+91${phone}`, otp });
      set({ isLoading: false });
      return { success: true, data: res.data };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err?.response?.data?.error || err?.response?.data?.message || 'Verification failed' };
    }
  },

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
      } catch {
      }
    }
    set(initialState);
  },

  fetchMe: async () => {
    if (get().meLoaded) return;
    try {
      const res = await api.get('/api/users/me');
      const u = res.data;

      const accountType = u.seller_profile_type || u.profile_type || (u.user_type === 'aggregator' ? 'business' : 'individual');
      const locality = u.user_type === 'seller' ? u.seller_locality : u.aggregator_locality;
      const city = u.user_type === 'seller' ? u.seller_city_code : u.aggregator_city_code;

      set({
        userId: u.id ?? null,
        userType: u.user_type ?? null,
        user: u.id ? { id: u.id, user_type: u.user_type ?? null } : null,
        accountType: accountType as any,
        name: u.name ?? '',
        locality: locality ?? '',
        city: city ?? '',
        createdAt: u.created_at ?? null,
        meLoaded: true,
      });
    } catch {
    }
  },
}));
