import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useSignIn } from '@clerk/clerk-expo';

import { APP_NAME } from '../../constants/app';
import { colors, radius, spacing } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { Input } from '../../components/ui/Input';
import { PrimaryButton } from '../../components/ui/Button';
import { NavBar } from '../../components/ui/NavBar';
import { safeBack } from '../../utils/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

type Step = 'phone' | 'otp';
type Mode = 'login' | 'signup';

type MeResponse = {
  user_type: 'seller' | 'aggregator' | null;
  name?: string | null;
  seller_profile_type?: 'individual' | 'business' | null;
  seller_locality?: string | null;
  seller_city_code?: string | null;
  seller_gstin?: string | null;
  aggregator_business_name?: string | null;
  aggregator_locality?: string | null;
  aggregator_city_code?: string | null;
  aggregator_material_count?: number | null;
  aggregator_has_kyc_media?: boolean | null;
};

const OTP_SECONDS = 600;

const formatTime = (seconds: number) => {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const resolveOnboardingRoute = (me: MeResponse): string => {
  if (!me.user_type) return '/(auth)/user-type';

  if (me.user_type === 'seller') {
    const hasName = !!me.name && me.name.trim().length > 0;
    const hasProfileType = !!me.seller_profile_type;
    const hasLocality = !!me.seller_locality && me.seller_locality.trim().length > 0;
    const hasCity = !!me.seller_city_code;
    const needsBusinessSetup = me.seller_profile_type === 'business' && !(me.seller_gstin && me.seller_gstin.trim().length === 15);

    if (!hasProfileType) return '/(auth)/seller/account-type';
    if (!hasName || !hasLocality || !hasCity) return '/(auth)/seller/seller-setup';
    if (needsBusinessSetup) return '/(auth)/seller/business-setup';
    return '/(seller)/home';
  }

  const hasBusinessName = !!me.aggregator_business_name && me.aggregator_business_name.trim().length > 0;
  const hasCity = !!me.aggregator_city_code;
  const hasArea = !!me.aggregator_locality && me.aggregator_locality.trim().length > 0;
  const hasRates = Number(me.aggregator_material_count ?? 0) > 0;
  const hasKycPhoto = !!me.aggregator_has_kyc_media;

  if (!hasBusinessName || !hasCity) return '/(auth)/aggregator/profile-setup';
  if (!hasArea) return '/(auth)/aggregator/area-setup';
  if (!hasRates) return '/(auth)/aggregator/materials-setup';
  if (!hasKycPhoto) return '/(auth)/aggregator/kyc';
  return '/(aggregator)/home';
};

export default function PhoneScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { signIn, setActive } = useSignIn();

  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('phone');
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(OTP_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendUnlockRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (resendUnlockRef.current) {
      clearTimeout(resendUnlockRef.current);
      resendUnlockRef.current = null;
    }
  };

  const startCountdown = () => {
    clearTimers();
    setCountdown(OTP_SECONDS);
    setCanResend(false);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimers();
          setStep('phone');
          setOtp('');
          setError('OTP expired. Please request a new one.');
          return OTP_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    resendUnlockRef.current = setTimeout(() => {
      setCanResend(true);
    }, 30000);
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setStep('phone');
    setPhone('');
    setOtp('');
    setError(null);
    setCountdown(OTP_SECONDS);
    setCanResend(false);
    clearTimers();
  };

  const normalizedPhone = phone.replace(/\D/g, '').slice(0, 10);
  const canSendOtp = normalizedPhone.length === 10;
  const canVerifyOtp = otp.trim().length === 6;

  async function handleSendOtp() {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/auth/request-otp', { phone: '+91' + normalizedPhone, mode });
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No account found with this number. Switch to Sign Up to create one.');
      } else if (err.response?.status === 409) {
        setError('An account already exists with this number. Switch to Log In.');
      } else if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', {
        phone: '+91' + normalizedPhone,
        otp: otp.trim(),
      });

      const { token, user, is_new_user } = res.data;
      setSession({ token: token.jwt, user, isNewUser: is_new_user });

      try {
        if (signIn && setActive && token?.jwt) {
          await signOut().catch(() => {});
          const signInAttempt = await signIn.create({ strategy: 'ticket', ticket: token.jwt });
          if (signInAttempt.status === 'complete') {
            await setActive({ session: signInAttempt.createdSessionId });
          }
        }
      } catch {
      }

      if (is_new_user) {
        router.replace('/(auth)/user-type');
      } else {
        try {
          const meRes = await api.get('/api/users/me');
          const nextRoute = resolveOnboardingRoute(meRes.data as MeResponse);
          router.replace(nextRoute as any);
        } catch {
          if (user.user_type === 'aggregator') {
            router.replace('/(auth)/aggregator/profile-setup');
          } else if (user.user_type === 'seller') {
            router.replace('/(auth)/seller/account-type');
          } else {
            router.replace('/(auth)/user-type');
          }
        }
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        const msg = err.response?.data?.message || err.response?.data?.error || '';
        if (typeof msg === 'string' && msg.toLowerCase().includes('remaining')) {
          setError(`Incorrect OTP. ${msg}`);
        } else {
          setError('Incorrect OTP. Please check and try again.');
        }
      } else if (err.response?.status === 429) {
        setError('Too many attempts. Please wait before trying again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleChangeNumber() {
    clearTimers();
    setStep('phone');
    setOtp('');
    setError(null);
    setCountdown(OTP_SECONDS);
    setCanResend(false);
  }

  async function handleResendOtp() {
    if (!canResend || isLoading) return;
    await handleSendOtp();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <NavBar title="Phone Verification" variant="light" onBack={() => safeBack('/(auth)/onboarding')} />

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text variant="heading" style={styles.title}>Welcome to {APP_NAME}</Text>
          <Text variant="caption" color={colors.muted} style={styles.subtitle}>
            Log in or create your account with WhatsApp OTP.
          </Text>

          {step === 'phone' ? (
            <View style={styles.tabsWrap}>
              <Pressable
                onPress={() => handleModeChange('login')}
                style={[styles.tab, mode === 'login' ? styles.tabActive : styles.tabInactive]}
              >
                <Text variant="label" style={mode === 'login' ? styles.tabActiveText : styles.tabInactiveText}>Log In</Text>
              </Pressable>
              <Pressable
                onPress={() => handleModeChange('signup')}
                style={[styles.tab, mode === 'signup' ? styles.tabActive : styles.tabInactive]}
              >
                <Text variant="label" style={mode === 'signup' ? styles.tabActiveText : styles.tabInactiveText}>Sign Up</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.phoneRow, step === 'otp' && styles.phoneRowDisabled]}>
            <View style={styles.prefixPill}>
              <Numeric size={14} color={colors.navy}>+91</Numeric>
            </View>
            <View style={styles.phoneInputWrap}>
              <Input
                value={normalizedPhone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter mobile number"
                keyboardType="number-pad"
                maxLength={10}
                editable={step === 'phone'}
                mono
              />
            </View>
          </View>

          {step === 'otp' ? (
            <View>
              <Input
                value={otp}
                onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter OTP"
                keyboardType="number-pad"
                maxLength={6}
                mono
              />

              <View style={styles.metaRow}>
                <Pressable onPress={handleChangeNumber}>
                  <Text variant="caption" color={colors.navy}>Change Number</Text>
                </Pressable>
                <Text variant="caption" color={colors.muted}>Expires in {formatTime(countdown)}</Text>
              </View>

              <Pressable disabled={!canResend} onPress={handleResendOtp} style={styles.resendWrap}>
                <Text variant="caption" color={canResend ? colors.teal : colors.muted}>
                  {canResend ? 'Resend OTP' : 'Resend available after 00:30'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {error ? (
            <Text variant="caption" color={colors.red} style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={styles.buttonWrap}>
            {step === 'phone' ? (
              <PrimaryButton
                label="Send OTP"
                onPress={handleSendOtp}
                loading={isLoading}
                disabled={!canSendOtp}
              />
            ) : (
              <PrimaryButton
                label="Verify OTP"
                onPress={handleVerifyOtp}
                loading={isLoading}
                disabled={!canVerifyOtp}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    marginTop: spacing.md,
    color: colors.navy,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    padding: spacing.xs,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.teal,
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabActiveText: {
    color: colors.surface,
  },
  tabInactiveText: {
    color: colors.slate,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  phoneRowDisabled: {
    opacity: 0.6,
  },
  prefixPill: {
    height: 52,
    minWidth: 56,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneInputWrap: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  resendWrap: {
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
  errorText: {
    marginTop: spacing.sm,
  },
  buttonWrap: {
    marginTop: spacing.lg,
  },
});
