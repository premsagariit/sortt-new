/**
 * app/index.tsx
 * ──────────────────────────────────────────────────────────────────
 * Root entry point — shows SplashAnimation on first render.
 *
 * When the animation's onComplete fires (after ~4.8s fade-out),
 * this screen navigates to the auth group using router.replace()
 * so that the splash entry is removed from the back-stack.
 * Pressing back on the phone screen will exit the app, not return
 * to the splash.
 *
 * SplashAnimation contract:
 *   onComplete: () => void   — called after the 600ms fade-out ends
 *
 * Navigation rule (from §2.1):
 *   router.replace('/(auth)/onboarding')  — NOT router.push()
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '../constants/tokens';
import SplashAnimation from '../components/SplashAnimation';

export default function IndexScreen() {
  const router = useRouter();

  /**
   * onComplete is memoised so the SplashAnimation component always
   * receives the same function reference — prevents accidental
   * re-triggering if the parent re-renders while the animation runs.
   */
  const handleSplashComplete = useCallback(() => {
    // replace() removes the splash from the navigation stack.
    // The user cannot navigate back to it with the hardware back button.
    router.replace('/(auth)/onboarding');
  }, [router]);

  return (
    <View style={styles.container}>
      <SplashAnimation onComplete={handleSplashComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.navy, // matches app.json splash backgroundColor
  },
});
