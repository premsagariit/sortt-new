/**
 * app/_layout.tsx
 * ──────────────────────────────────────────────────────────────────
 * Expo Router root entry point (app shell).
 * This file is NOT a UI component — it is the root layout that:
 *   1. Prevents the native splash screen from auto-hiding
 *   2. Loads DM Sans and DM Mono fonts via expo-google-fonts
 *   3. Hides the splash screen once fonts are ready
 *   4. Renders <Slot /> — the Expo Router root slot for all child routes
 *
 * Auth strategy (Clerk-free):
 *   - JWT stored in Zustand `token` field (persisted via SecureStore in
 *     the OTP verify handler in apps/mobile/app/(auth)/phone.tsx).
 *   - ApiClientConfigurator reads token from authStore and injects it
 *     into every axios request via setApiTokenGetter.
 * ──────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  useFonts as useFontsMono,
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import { setRealtimeTokenGetter } from '@sortt/realtime';
import { api, setApiLanguageGetter, setApiTokenGetter, setApiUnauthorizedHandler } from '../lib/api';
import { useAuthStore, type AuthState } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { NetworkErrorScreen } from '../components/ui/NetworkErrorScreen';
import { AuthNetworkErrorScreen } from '../components/ui/AuthNetworkErrorScreen';
import { NotificationWatcher } from '../components/ui/NotificationWatcher';
import { PushTokenRegistrar } from '../components/ui/PushTokenRegistrar';
import { disconnectRealtime } from '../lib/realtime';

/**
 * ApiClientConfigurator — wires the JWT token from Zustand authStore
 * into the axios request interceptor so every API call is authenticated.
 * No Clerk dependency required.
 */
function ApiClientConfigurator({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s: AuthState) => s.token);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Provide a token getter that reads directly from Zustand state
    setApiTokenGetter(async () => useAuthStore.getState().token);
    setRealtimeTokenGetter(async () => useAuthStore.getState().token);
    setApiUnauthorizedHandler(() => useAuthStore.getState().signOut());
    setApiLanguageGetter(() => useLanguageStore.getState().language);
    setIsReady(true);

    return () => {
      setApiUnauthorizedHandler(null);
      setRealtimeTokenGetter(null);
      setApiLanguageGetter(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⚠️ CRITICAL: Do not render children until interceptors are configured.
  // This prevents a race where API calls fire without a Bearer token.
  if (!isReady) return null;

  // Suppress unused-variable lint warning — token is read above but
  // subscribing here ensures re-renders when the token changes.
  void token;

  return <>{children}</>;
}

function OfflineAwareNavigator({
  isOnline,
  isRetrying,
  onRetry,
  role,
  segments,
}: {
  isOnline: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  role: 'seller' | 'aggregator';
  segments: string[];
}) {
  const token = useAuthStore((s: AuthState) => s.token);
  const rootGroup = segments[0];
  const isAuthPage = rootGroup === '(auth)' || (segments.length === 0 && !token);

  if (isOnline) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  if (isAuthPage) {
    return <AuthNetworkErrorScreen onRetry={onRetry} isRetrying={isRetrying} />;
  }

  return <NetworkErrorScreen onRetry={onRetry} isRetrying={isRetrying} role={role} />;
}

// ── Prevent the splash screen from auto-hiding before fonts are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const pathname = usePathname();
  const segments = useSegments();
  const rootGroup = segments[0];
  const languageInitialized = useLanguageStore((s) => s.initialized);
  const initializeLanguage = useLanguageStore((s) => s.initializeLanguage);
  const storedUserType = useAuthStore((s: AuthState) => s.userType);
  const hasHydrated = useAuthStore((s: AuthState) => s.hasHydrated);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastRole, setLastRole] = useState<'seller' | 'aggregator'>('seller');
  const prevOnlineRef = useRef(isOnline);
  const offlineAuthPathRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Load DM Sans (all weights used across the design system)
  const [sansLoaded, sansError] = useFonts({
    'DMSans-Regular':  DMSans_400Regular,
    'DMSans-Medium':   DMSans_500Medium,
    'DMSans-SemiBold': DMSans_700Bold,
    'DMSans-Bold':     DMSans_700Bold,
  });

  // ── Load DM Mono (used ONLY for numeric data)
  const [monoLoaded, monoError] = useFontsMono({
    'DMMono-Regular': DMMono_400Regular,
    'DMMono-Medium':  DMMono_500Medium,
    'DMMono-Bold':    DMMono_500Medium,
  });

  const fontsReady = (sansLoaded || !!sansError) && (monoLoaded || !!monoError);

  useEffect(() => {
    void initializeLanguage();
  }, [initializeLanguage]);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  useEffect(() => {
    if (rootGroup === '(aggregator)') {
      setLastRole('aggregator');
    } else if (rootGroup === '(seller)') {
      setLastRole('seller');
    }
  }, [rootGroup]);

  useEffect(() => {
    const isAuthPath = pathname?.startsWith('/(auth)');

    if (!isOnline && isAuthPath) {
      offlineAuthPathRef.current = pathname;
      return;
    }

    const cameBackOnline = prevOnlineRef.current === false && isOnline === true;
    if (cameBackOnline && offlineAuthPathRef.current) {
      const previousAuthPath = offlineAuthPathRef.current;
      const targetPath = previousAuthPath === '/(auth)/phone' ? '/(auth)/phone' : previousAuthPath;

      offlineAuthPathRef.current = null;
      if (pathname !== targetPath) {
        router.replace(targetPath as any);
      }
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline, pathname, router]);

  const retryConnectivity = useCallback(async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    try {
      await api.get('/api/rates');
    } catch {
      // Keep takeover active while offline.
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying]);

  // WARN 3 + BLOCK: AppState listener for realtime cleanup on background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = state;

      const leavingForeground = previousState === 'active' && (state === 'background' || state === 'inactive');
      if (leavingForeground) {
        try {
          disconnectRealtime();
          console.log('[AppState] Disconnected Ably client on app background');
        } catch (err) {
          console.warn('[AppState] Failed to cleanup realtime channels:', err);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Block render until fonts, language store, AND Zustand persist rehydration are ready.
  // Without the hasHydrated guard, async rehydration can overwrite a token that was
  // written mid-session (e.g., right after OTP verify), causing protected API calls on
  // the next screen to fire with a null token.
  if (!fontsReady || !languageInitialized || !hasHydrated) {
    return null;
  }

  const resolvedRole: 'seller' | 'aggregator' =
    storedUserType === 'aggregator' || storedUserType === 'seller'
      ? storedUserType
      : lastRole;

  return (
    <ApiClientConfigurator>
      <NotificationWatcher />
      <PushTokenRegistrar />
      <OfflineAwareNavigator
        isOnline={isOnline}
        isRetrying={isRetrying}
        onRetry={retryConnectivity}
        role={resolvedRole}
        segments={segments}
      />
    </ApiClientConfigurator>
  );
}
