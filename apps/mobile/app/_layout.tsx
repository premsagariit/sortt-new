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
 * Splash sequence reference: sortt_logo_splash_v2.html
 *   Phase 1 (0–900ms):  truck parts assemble from screen edges
 *   Phase 2 (1220ms+): scrap items fall into cargo bed
 *   Phase 3 (2000ms):  truck drives left with spinning wheels
 *   Phase 4 (2300ms):  app name wordmark rises in
 *   Total: ~4800ms → splash is hidden AFTER fonts load (not mid-animation)
 *
 * Splash screen configuration lives in app.json:
 *   { "expo": { "splash": { "backgroundColor": "#1C2E4A" } } }
 * ──────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
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
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache, clerkPublishableKey } from '../lib/clerk';
import { api, setApiTokenGetter } from '../lib/api';
import { setGlobalClerkSignOut } from '../store/authStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { NetworkErrorScreen } from '../components/ui/NetworkErrorScreen';
import { AuthNetworkErrorScreen } from '../components/ui/AuthNetworkErrorScreen';
import { useAuthStore } from '../store/authStore';

function ApiClientConfigurator({ children }: { children: React.ReactNode }) {
  const { getToken, signOut } = useAuth();
  
  useEffect(() => {
    setApiTokenGetter(getToken);
    setGlobalClerkSignOut(signOut);
  }, [getToken, signOut]);

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
  const { isSignedIn } = useAuth();
  const rootGroup = segments[0];
  const isAuthPage = rootGroup === '(auth)' || (segments.length === 0 && !isSignedIn);

  if (isOnline) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  if (isAuthPage) {
    return <AuthNetworkErrorScreen onRetry={onRetry} isRetrying={isRetrying} />;
  }

  return <NetworkErrorScreen onRetry={onRetry} isRetrying={isRetrying} role={role} />;
}

// ── Prevent the splash screen from auto-hiding before fonts are ready.
// This must be called before the component tree renders.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const pathname = usePathname();
  const segments = useSegments();
  const rootGroup = segments[0];
  const storedUserType = useAuthStore((s) => s.userType);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastRole, setLastRole] = useState<'seller' | 'aggregator'>('seller');
  const prevOnlineRef = useRef(isOnline);
  const offlineAuthPathRef = useRef<string | null>(null);

  // ── Load DM Sans (all weights used across the design system)
  const [sansLoaded, sansError] = useFonts({
    'DMSans-Regular':  DMSans_400Regular,
    'DMSans-Medium':   DMSans_500Medium,
    // DMSans 600 SemiBold not available in this package version.
    // DMSans-SemiBold and DMSans-Bold both map to 700Bold.
    // Typography.tsx uses DMSans-SemiBold for subheadings/buttons.
    'DMSans-SemiBold': DMSans_700Bold,
    'DMSans-Bold':     DMSans_700Bold,
  });

  // ── Load DM Mono (used ONLY for numeric data — amounts, weights, OTPs,
  //    order IDs, timestamps)
  // DM Mono only ships Regular (400) and Medium (500) — no Bold weight.
  // DMMono-Bold maps to 500Medium (heaviest available) so screens
  // referencing fontFamily: 'DMMono-Bold' render correctly.
  const [monoLoaded, monoError] = useFontsMono({
    'DMMono-Regular': DMMono_400Regular,
    'DMMono-Medium':  DMMono_500Medium,
    'DMMono-Bold':    DMMono_500Medium,
  });

  const fontsReady = (sansLoaded || !!sansError) && (monoLoaded || !!monoError);

  useEffect(() => {
    if (fontsReady) {
      // Hide the splash screen once both font families are available.
      // If a font fails to load (sansError / monoError), we still proceed
      // rather than blocking forever — the UI will fall back to system fonts
      // for that weight only.
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
      const targetPath =
        previousAuthPath === '/(auth)/phone' || previousAuthPath === '/(auth)/otp'
          ? '/(auth)/phone'
          : previousAuthPath;

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
      // Keep takeover active while offline or backend unreachable.
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying]);

  // Hold the tree until fonts are ready to prevent a flash of unstyled text.
  if (!fontsReady) {
    return null;
  }

  const resolvedRole: 'seller' | 'aggregator' =
    storedUserType === 'aggregator' || storedUserType === 'seller'
      ? storedUserType
      : lastRole;

  // ── Expo Router root stack.
  // Using Stack instead of Slot to preserve memory/state between root segments.
  return (
    <ClerkProvider publishableKey={clerkPublishableKey!} tokenCache={tokenCache}>
      <ApiClientConfigurator>
        <OfflineAwareNavigator
          isOnline={isOnline}
          isRetrying={isRetrying}
          onRetry={retryConnectivity}
          role={resolvedRole}
          segments={segments}
        />
      </ApiClientConfigurator>
    </ClerkProvider>
  );
}
