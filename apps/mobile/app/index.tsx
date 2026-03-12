/**
 * app/index.tsx
 * ──────────────────────────────────────────────────────────────────
 * Root entry point — shows SplashAnimation, then routes based on
 * Clerk session state:
 *
 *   Authenticated  → route to correct home screen by user_type
 *   Not authed     → route to onboarding (first launch) or phone screen
 *
 * Navigation rule: always router.replace() — splash must never be
 * in the back-stack.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import { colors } from '../constants/tokens';
import SplashAnimation from '../components/SplashAnimation';
import { useAuthStore } from '../store/authStore';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const userType = useAuthStore((s) => s.userType);

  const handleSplashComplete = useCallback(() => {
    // Wait for Clerk to finish loading its persisted session.
    // isLoaded=false means Clerk is still reading from secure storage —
    // routing before it's ready causes a flash to onboarding on every reload.
    if (!isLoaded) {
      // Clerk not ready yet — re-check in 200ms
      // (rare: splash is ~4.8s, Clerk loads in <500ms)
      setTimeout(handleSplashComplete, 200);
      return;
    }

    if (isSignedIn) {
      // Returning authenticated user — skip onboarding entirely
      if (userType === 'aggregator') {
        router.replace('/(aggregator)/home' as any);
      } else if (userType === 'seller') {
        router.replace('/(seller)/home' as any);
      } else {
        // Signed in with Clerk but no user_type set yet
        // (incomplete onboarding — resume at user-type screen)
        router.replace('/(auth)/user-type' as any);
      }
    } else {
      // Not signed in — show phone entry directly
      // (onboarding only shown once; returning unauthenticated users
      //  go straight to phone screen)
      router.replace('/(auth)/phone' as any);
    }
  }, [router, isLoaded, isSignedIn, userType]);

  return (
    <View style={styles.container}>
      <SplashAnimation onComplete={handleSplashComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
});