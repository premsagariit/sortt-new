import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';
import { api } from '../lib/api';
import { normalizeLanguage, type SupportedLanguage } from '../lib/i18n';
import { useLanguageStore } from './languageStore';

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
  hasHydrated: boolean;

  phoneNumber: string;
  isLoading: boolean;
  session: LegacyAuthSession | null;

  userId: string | null;
  userType: UserType;
  accountType: 'individual' | 'business' | null;
  name: string;
  email: string;
  locality: string;
  city: string;
  preferredLanguage: SupportedLanguage;
  createdAt: string | null;
  meLoaded: boolean;
  profilePhoto: string | null;

  setSession: (data: { token: string; user: SessionUser; isNewUser: boolean }) => void;
  clearSession: () => void;
  setHasHydrated: (hydrated: boolean) => void;

  setPhoneNumber: (phone: string) => void;
  setIsLoading: (loading: boolean) => void;
  setLegacySession: (session: LegacyAuthSession | null) => void;

  requestOtp: (phone: string, mode: 'login' | 'signup') => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  setUserId: (id: string | null) => void;
  setUserType: (type: UserType) => void;
  setAccountType: (type: 'individual' | 'business' | null) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setLocality: (locality: string) => void;
  setCity: (city: string) => void;
  setPreferredLanguage: (language: SupportedLanguage) => void;
  setProfilePhoto: (url: string | null) => void;

  reset: () => void;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

const initialState = {
  token: null,
  user: null,
  isNewUser: false,
  hasHydrated: false,

  phoneNumber: '',
  isLoading: false,
  session: null,

  userId: null,
  userType: null,
  accountType: null,
  name: '',
  email: '',
  locality: '',
  city: '',
  preferredLanguage: 'en' as SupportedLanguage,
  createdAt: null,
  meLoaded: false,
  profilePhoto: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
          accountType: null,
          name: '',
          email: '',
          locality: '',
          city: '',
          createdAt: null,
          meLoaded: false,
          profilePhoto: null,
        });
      },

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

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
      setEmail: (email) => set({ email }),
      setLocality: (locality) => set({ locality }),
      setCity: (city) => set({ city }),
      setPreferredLanguage: (preferredLanguage) => set({ preferredLanguage }),
      setProfilePhoto: (url) => set({ profilePhoto: url }),

      reset: () => set({ ...initialState, hasHydrated: true }),

      signOut: async () => {
        // No Clerk session to invalidate — simply clear local state.
        set({ ...initialState, hasHydrated: true });
      },

      fetchMe: async () => {
        if (get().meLoaded) return;
        try {
          const res = await api.get('/api/users/me');
          const u = res.data;

      const accountType = u.seller_profile_type || u.profile_type || (u.user_type === 'aggregator' ? 'business' : 'individual');
      const locality = u.user_type === 'seller' ? u.seller_locality : u.aggregator_locality;
      const city = u.user_type === 'seller' ? u.seller_city_code : u.aggregator_city_code;
      const preferredLanguage = normalizeLanguage(u.preferred_language);

          set({
            userId: u.id ?? null,
            userType: u.user_type ?? null,
            user: u.id ? { id: u.id, user_type: u.user_type ?? null } : null,
            accountType: accountType as any,
            name: u.name ?? '',
            email: u.email ?? '',
            locality: locality ?? '',
            city: city ?? '',
            preferredLanguage,
            createdAt: u.created_at ?? null,
            profilePhoto: u.profile_photo_url ?? null,
            meLoaded: true,
          });

          void useLanguageStore.getState().hydrateFromProfile(u.preferred_language);
        } catch {
        }
      },
    }),
    {
      name: 'sortt-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isNewUser: state.isNewUser,
        userId: state.userId,
        userType: state.userType,
        accountType: state.accountType,
        name: state.name,
        email: state.email,
        locality: state.locality,
        city: state.city,
        preferredLanguage: state.preferredLanguage,
        createdAt: state.createdAt,
        phoneNumber: state.phoneNumber,
        profilePhoto: state.profilePhoto,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          state?.setHasHydrated(true);
          return;
        }

        state?.setIsLoading(false);
        state?.setUserId(state.user?.id ?? state.userId ?? null);
        state?.setUserType(state.user?.user_type ?? state.userType ?? null);
        state?.setHasHydrated(true);
      },
    }
  )
);
