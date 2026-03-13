/**
 * app/index.tsx
 * ──────────────────────────────────────────────────────────────────
 * Root entry point — shows SplashAnimation, then routes based on
 * Clerk session state once both conditions are true:
 *   1. Splash animation has completed
 *   2. Clerk has finished loading its persisted session (isLoaded=true)
 *
 * Navigation rule: always router.replace() — splash must never be
 * in the back-stack.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
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
  const name = useAuthStore((s) => s.name);

  // Track whether the splash animation has finished
  const [splashDone, setSplashDone] = useState(false);

  // Route once BOTH splash is done AND Clerk has loaded.
  useEffect(() => {
    if (!splashDone || !isLoaded) return;

    if (isSignedIn) {
      // If name is set, user is fully onboarded — go to home
      if (name && name.trim() !== '') {
        if (userType === 'aggregator') {
          router.replace('/(aggregator)/home' as any);
        } else if (userType === 'seller') {
          router.replace('/(seller)/home' as any);
        } else {
          // Fallback
          router.replace('/(auth)/user-type' as any);
        }
      } else {
        // Signed in but no name — go to setup flow based on type
        if (userType === 'aggregator') {
          router.replace('/(auth)/aggregator/profile-setup' as any);
        } else if (userType === 'seller') {
          router.replace('/(auth)/seller/account-type' as any);
        } else {
          router.replace('/(auth)/user-type' as any);
        }
      }
    } else {
      // Not signed in — go to phone entry
      router.replace('/(auth)/phone' as any);
    }
  }, [splashDone, isLoaded, isSignedIn, userType, name, router]);

  return (
    <View style={styles.container}>
      <SplashAnimation onComplete={() => setSplashDone(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
});