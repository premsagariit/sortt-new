/**
 * app/(auth)/otp.tsx
 * ──────────────────────────────────────────────────────────────────
 * OTP Verification Screen — Day 2 §2.3
 *
 * Collects a 6-digit verification code. This is simulated UI.
 *
 * Rules & Patterns:
 *   - PIN Input: Single hidden TextInput driving 6 visual boxes (hard rule).
 *   - Typography: No raw <Text>, always use <Text> or <Numeric> (hard rule).
 *   - Numeric: Used for phone digits, OTP boxes, and countdown (hard rule).
 *   - State: Auth stack is replaced on success (router.replace).
 *   - Simulate failure: OTP starting with '0' triggers incorrect state.
 *   - Resend: Disabled for 30s after mount or resend.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, radius, spacing, colorExtended } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useSignIn, useAuth } from '@clerk/clerk-expo';
import { registerForPushNotificationsAsync } from '../../lib/push';
import { api } from '../../lib/api';

const OTP_LENGTH = 6;
const RESEND_TIMER_INITIAL = 30;
const SIMULATION_DELAY = 1500;

export default function OTPScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { signIn, setActive } = useSignIn();
  const { signOut } = useAuth();

  // ── State ──────────────────────────────────────────────────────
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_TIMER_INITIAL);

  // ── Zustand ────────────────────────────────────────────────────
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  // ── Logic ──────────────────────────────────────────────────────

  // Resend Countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  // Handle Verification
  const handleVerify = useCallback(async (codeToMatch?: string) => {
    const code = codeToMatch ?? otp;
    if (code.length < OTP_LENGTH || isVerifying) return;

    setError(null);
    setIsVerifying(true);
    Keyboard.dismiss();

    try {
      // Get userType from store before calling verifyOtp
      const userType = useAuthStore.getState().userType;
      const result = await verifyOtp(phoneNumber, code, userType || undefined);
      if (!result.success || !result.token) {
        throw new Error(result.error || 'Invalid OTP');
      }

      if (!signIn || !setActive) throw new Error('Clerk not initialized');

      await signOut().catch(() => { }); // clear any stale session — silent no-op if none exists
      const signInAttempt = await signIn.create({
        strategy: 'ticket',
        ticket: result.token,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });

        // Register Push Token
        try {
          // Fire and forget because push token shouldn't block navigation
          registerForPushNotificationsAsync().then((tokens: any) => {
            if (tokens?.expoToken || tokens?.rawToken) {
              api.post('/api/users/device-token', {
                deviceToken: tokens.expoToken || tokens.rawToken,
                provider: 'expo',
              }).catch((e: any) => console.error('Failed to register push token in backend:', e));
            }
          });
        } catch (e) {
          console.error('Push token registration error:', e);
        }

        const storeState = useAuthStore.getState();
        const type = storeState.userType;
        const name = storeState.name;

        // If name is set, user is fully onboarded — go to home
        if (name && name.trim() !== '') {
          if (type === 'aggregator') {
            router.replace('/(aggregator)/home' as any);
          } else {
            router.replace('/(seller)/home' as any);
          }
        } else {
          // New user or incomplete profile — route to setup based on type selected at user-type screen
          if (type === 'aggregator') {
            router.replace('/(auth)/aggregator/profile-setup' as any);
          } else if (type === 'seller') {
            router.replace('/(auth)/seller/account-type' as any);
          } else {
            // Fallback if type is missing (should not happen in normal flow)
            router.replace('/(auth)/user-type' as any);
          }
        }
      } else {
        throw new Error('SignIn incomplete');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err.message || 'Incorrect code. Please try again.');
      setOtp('');
      setTimeout(() => inputRef.current?.focus(), 100);
      setIsVerifying(false);
    }
  }, [otp, isVerifying, router, phoneNumber, signIn, setActive, verifyOtp]);

  // Auto-submit when length reaches 6
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      handleVerify(otp);
    }
  }, [otp, handleVerify]);

  const handleResend = useCallback(() => {
    if (countdown > 0) return;

    // Reset flow
    setOtp('');
    setError(null);
    setCountdown(RESEND_TIMER_INITIAL);
    inputRef.current?.focus();

    // Simulated "OTP sent" feedback could go here, but omitted as per §2.3 scope
  }, [countdown]);

  const handleChangeText = (val: string) => {
    // Only digits allowed
    const clean = val.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(clean);
  };

  // ── Render Helpers ─────────────────────────────────────────────

  const last4 = phoneNumber ? phoneNumber.slice(-4) : null;
  const isResendDisabled = countdown > 0;

  // Render the 6 individual boxes
  const renderOTPBoxes = () => {
    return (
      <Pressable
        style={styles.otpGrid}
        onPress={() => inputRef.current?.focus()}
        accessibilityLabel="Verification code input"
        accessibilityRole="adjustable"
      >
        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
          const char = otp[i] || '';
          const isFocused = i === Math.min(otp.length, OTP_LENGTH - 1);

          return (
            <View
              key={i}
              style={[
                styles.otpBox,
                isFocused && styles.otpBoxFocused,
                !!error && styles.otpBoxError
              ]}
            >
              <Numeric size={24} color={colors.navy}>
                {char}
              </Numeric>
            </View>
          );
        })}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* NavBar: Back button, Title text */}
      <NavBar
        title="Verify OTP"
        onBack={() => router.replace('/(auth)/phone')}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, { alignItems: 'center' }]}>
            <Text variant="heading" style={styles.headline}>
              Enter the 6-digit code
            </Text>

            <View style={[styles.subcopyRow, { marginTop: 8 }]}>
              {last4 ? (
                <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
                  Sent to your WhatsApp at{'\n'}
                  <Numeric size={14} style={{ fontWeight: '600', color: colors.navy }}>+91 ••••• {last4}</Numeric>
                </Text>
              ) : (
                <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
                  Sent to your WhatsApp number
                </Text>
              )}
            </View>
          </View>

          {/* Hidden Input for actual functionality */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleChangeText}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            editable={!isVerifying}
          />

          {/* Visual Grid */}
          <View style={styles.gridContainer}>
            {renderOTPBoxes()}

            {error && (
              <Text variant="caption" color={colors.red} style={styles.errorText}>
                {error}
              </Text>
            )}
          </View>

          {isResendDisabled && (
            <View style={styles.resendContainer}>
              <Text variant="caption" color={colors.muted}>
                Resend in <Numeric size={14} style={{ fontWeight: '600', color: colors.navy }}>00:{countdown.toString().padStart(2, '0')}</Numeric>
              </Text>
            </View>
          )}

          <View style={styles.bottomArea}>
            <PrimaryButton
              label="Verify & Continue"
              onPress={() => handleVerify()}
              disabled={otp.length < OTP_LENGTH}
              loading={isVerifying}
            />
            <Pressable
              onPress={handleResend}
              disabled={isResendDisabled}
              style={{ height: 36, justifyContent: 'center', alignItems: 'center', marginTop: 10 }}
            >
              <Text variant="caption" color={isResendDisabled ? colors.border : colors.muted}>
                Didn't receive it? Resend
              </Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  headline: {
    marginBottom: spacing.xs,
  },
  subcopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenInput: {
    // Hidden but present
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  gridContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.sm,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFocused: {
    borderColor: colors.navy,
  },
  otpBoxError: {
    borderColor: colors.red,
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: 'center',
    width: '100%',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bottomArea: {
    marginTop: 'auto',
  },
});
