import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { api } from '../lib/api';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  setCurrentLanguage,
  type SupportedLanguage,
} from '../lib/i18n';

interface LanguageState {
  language: SupportedLanguage;
  initialized: boolean;
  syncing: boolean;
  initializeLanguage: () => Promise<void>;
  setLanguage: (language: SupportedLanguage, options?: { syncRemote?: boolean }) => Promise<void>;
  hydrateFromProfile: (language: string | null | undefined) => Promise<void>;
}

let initializePromise: Promise<void> | null = null;

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: DEFAULT_LANGUAGE,
  initialized: false,
  syncing: false,

  initializeLanguage: async () => {
    if (get().initialized) return;
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const language = normalizeLanguage(saved);
        setCurrentLanguage(language);
        set({ language, initialized: true });
      } catch {
        setCurrentLanguage(DEFAULT_LANGUAGE);
        set({ language: DEFAULT_LANGUAGE, initialized: true });
      } finally {
        initializePromise = null;
      }
    })();

    return initializePromise;
  },

  setLanguage: async (language, options) => {
    const nextLanguage = normalizeLanguage(language);
    const currentLanguage = get().language;
    const shouldSyncRemote = options?.syncRemote !== false;

    if (currentLanguage !== nextLanguage) {
      setCurrentLanguage(nextLanguage);
      set({ language: nextLanguage });
    }

    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Non-fatal: language still updates in-memory for current session.
    }

    if (!shouldSyncRemote) return;

    set({ syncing: true });
    try {
      await api.patch('/api/users/language', { preferred_language: nextLanguage });
    } catch {
      // Non-fatal: local persistence still ensures UI consistency.
    } finally {
      set({ syncing: false });
    }
  },

  hydrateFromProfile: async (language) => {
    const nextLanguage = normalizeLanguage(language);
    if (nextLanguage === get().language) return;

    setCurrentLanguage(nextLanguage);
    set({ language: nextLanguage });

    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Non-fatal: hydration still updates the runtime language.
    }
  },
}));
