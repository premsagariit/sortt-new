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
import { api } from '../lib/api';

let hasShownSplashAnimation = false;

export default function IndexScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

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

    let cancelled = false;

    const resolveRoute = async () => {
      if (!onboardingComplete) {
        router.replace('/(auth)/onboarding' as any);
        return;
      }

      if (!isSignedIn) {
        router.replace('/(auth)/phone' as any);
        return;
      }

      try {
        const meRes = await api.get('/api/users/me');
        if (cancelled) return;
        const me = meRes.data as any;

        if (!me?.user_type) {
          router.replace('/(auth)/user-type' as any);
          return;
        }

        if (me.user_type === 'seller') {
          const hasName = !!me.name && me.name.trim().length > 0;
          const hasProfileType = !!me.seller_profile_type;
          const hasLocality = !!me.seller_locality && me.seller_locality.trim().length > 0;
          const hasCity = !!me.seller_city_code;
          const needsBusinessSetup = me.seller_profile_type === 'business' && !(me.seller_gstin && me.seller_gstin.trim().length === 15);

          if (!hasProfileType) {
            router.replace('/(auth)/seller/account-type' as any);
            return;
          }
          if (!hasName || !hasLocality || !hasCity) {
            router.replace('/(auth)/seller/seller-setup' as any);
            return;
          }
          if (needsBusinessSetup) {
            router.replace('/(auth)/seller/business-setup' as any);
            return;
          }
          router.replace('/(seller)/home' as any);
          return;
        }

        const hasBusinessName = !!me.aggregator_business_name && me.aggregator_business_name.trim().length > 0;
        const hasCity = !!me.aggregator_city_code;
        const hasArea = !!me.aggregator_locality && me.aggregator_locality.trim().length > 0;
        const hasRates = Number(me.aggregator_material_count ?? 0) > 0;
        const hasKycPhoto = !!me.aggregator_has_kyc_media;

        if (!hasBusinessName || !hasCity) {
          router.replace('/(auth)/aggregator/profile-setup' as any);
          return;
        }
        if (!hasArea) {
          router.replace('/(auth)/aggregator/area-setup' as any);
          return;
        }
        if (!hasRates) {
          router.replace('/(auth)/aggregator/materials-setup' as any);
          return;
        }
        if (!hasKycPhoto) {
          router.replace('/(auth)/aggregator/kyc' as any);
          return;
        }

        router.replace('/(aggregator)/home' as any);
      } catch {
        if (!cancelled) {
          router.replace('/(auth)/user-type' as any);
        }
      }
    };

    void resolveRoute();

    return () => {
      cancelled = true;
    };
  }, [splashDone, isLoaded, onboardingChecked, onboardingComplete, isSignedIn, router]);

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