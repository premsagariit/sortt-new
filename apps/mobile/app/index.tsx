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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../constants/tokens';
import SplashAnimation from '../components/SplashAnimation';
import { useAuthStore } from '../store/authStore';

let hasShownSplashAnimation = false;

export default function IndexScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const userType = useAuthStore((s) => s.userType);
  const name = useAuthStore((s) => s.name);

  // Track whether the splash animation has finished
  const [splashDone, setSplashDone] = useState(hasShownSplashAnimation);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const handleSplashComplete = () => {
    hasShownSplashAnimation = true;
    setSplashDone(true);
  };

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('onboarding_complete')
      .then((value) => {
        if (!mounted) return;
        setOnboardingComplete(value === 'true');
        setOnboardingChecked(true);
      })
      .catch(() => {
        if (!mounted) return;
        setOnboardingComplete(false);
        setOnboardingChecked(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Route once splash, Clerk, and onboarding gate are resolved.
  useEffect(() => {
    if (!splashDone || !isLoaded || !onboardingChecked) return;

    if (!onboardingComplete) {
      router.replace('/(auth)/onboarding' as any);
      return;
    }

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
  }, [splashDone, isLoaded, onboardingChecked, onboardingComplete, isSignedIn, userType, name, router]);

  return (
    <View style={styles.container}>
      {!splashDone && <SplashAnimation onComplete={handleSplashComplete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
});