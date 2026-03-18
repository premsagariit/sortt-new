import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useSignIn } from '@clerk/clerk-expo';
import {
  Phone,
  UserPlus,
  LockKey,
  ArrowLeft,
} from 'phosphor-react-native';

import { APP_NAME } from '../../constants/app';
import { colors, colorExtended, radius, spacing } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { Input } from '../../components/ui/Input';
import { PrimaryButton } from '../../components/ui/Button';
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

const OTP_SECONDS = 300; // 5 minutes

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
  const [otpExpired, setOtpExpired] = useState(false);

  // OTP input boxes refs
  const otpInputRefs = useRef<TextInput[]>([]);

  // Timer refs
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendUnlockRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
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
    setOtpExpired(false);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimers();
          setOtpExpired(true);
          return 0;
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
    setOtpExpired(false);
    clearTimers();
  };

  const normalizedPhone = phone.replace(/\D/g, '').slice(0, 10);
  const canSendOtp = normalizedPhone.length === 10;
  const canVerifyOtp = otp.trim().length === 6 && !otpExpired;

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    
    // Distribute digits across boxes on paste
    if (digits.length > 1) {
      const otpArray = digits.slice(0, 6).split('');
      setOtp(otpArray.join(''));
      otpArray.forEach((digit, i) => {
        if (otpInputRefs.current[i]) {
          otpInputRefs.current[i].setNativeProps({ text: digit });
        }
      });
      if (otpArray.length === 6 && otpInputRefs.current[5]) {
        otpInputRefs.current[5]?.focus();
      }
      return;
    }

    // Single digit: auto-focus next box
    const newOtp = otp.slice(0, index) + digits + otp.slice(index + 1);
    setOtp(newOtp);

    if (digits && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

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
        // Clerk session setup failed, but we can still navigate
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
    setOtpExpired(false);
  }

  async function handleResendOtp() {
    if (!canResend || isLoading) return;
    setOtp('');
    otpInputRefs.current.forEach(ref => {
      if (ref) ref.setNativeProps({ text: '' });
    });
    setError(null);
    await handleSendOtp();
  }

  const lastFourDigits = normalizedPhone.slice(-5).padStart(5, 'X');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HERO SECTION */}
        <View style={styles.hero}>
          {/* Decorative background circles */}
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />

          {step === 'otp' && (
            <Pressable
              style={styles.backButton}
              onPress={() => {
                clearTimers();
                safeBack('/(auth)/phone');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={22} color="white" weight="regular" />
            </Pressable>
          )}

          {/* Icon circle */}
          <View style={styles.iconCircle}>
            {step === 'phone' && mode === 'login' && (
              <Phone size={22} color="white" weight="regular" />
            )}
            {step === 'phone' && mode === 'signup' && (
              <UserPlus size={22} color="white" weight="regular" />
            )}
            {step === 'otp' && (
              <LockKey size={22} color="white" weight="regular" />
            )}
          </View>

          {/* Headline */}
          <Text style={styles.heroHeadline}>
            {step === 'phone' && mode === 'login' ? 'Welcome back' : ''}
            {step === 'phone' && mode === 'signup' ? 'Create account' : ''}
            {step === 'otp' ? 'Enter OTP' : ''}
          </Text>

          {/* Subtitle */}
          <Text style={styles.heroSubtitle}>
            {step === 'phone' && mode === 'login' && 'Enter your mobile number to log in via WhatsApp OTP'}
            {step === 'phone' && mode === 'signup' && 'Join as a seller or scrap aggregator in your city'}
            {step === 'otp' && (
              <>
                {'Sent to +91 '}
                <Numeric style={styles.otpPhoneNumber}>{lastFourDigits}</Numeric>
                {' via WhatsApp'}
              </>
            )}
          </Text>
        </View>

        {/* TAB SWITCHER (phone states only) */}
        {step === 'phone' && (
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => handleModeChange('login')}
              style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Log In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleModeChange('signup')}
              style={[styles.tabButton, mode === 'signup' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                Sign Up
              </Text>
            </Pressable>
          </View>
        )}

        {/* BODY CONTENT */}
        <View style={styles.body}>
          {step === 'phone' ? (
            <>
              {/* Phone input section */}
              <View style={styles.phoneInputSection}>
                <Text style={styles.phoneInputLabel}>Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryBox}>
                    <Text style={styles.countryText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={normalizedPhone}
                    onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>

              {/* Info strip */}
              <View style={styles.infoStrip}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  An OTP will be sent to your WhatsApp. Standard rates apply.
                </Text>
              </View>

              {/* CTA button */}
              <PrimaryButton
                label="Send OTP via WhatsApp"
                onPress={handleSendOtp}
                loading={isLoading}
                disabled={!canSendOtp}
                style={styles.ctaButton}
              />

              {/* Error message */}
              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* Terms line */}
              <View style={styles.termsLine}>
                <Text style={styles.termsText}>By continuing, you agree to our </Text>
                <Pressable onPress={() => router.push('/(shared)/terms-of-service')}>
                  <Text style={styles.termsLink}>Terms of Service</Text>
                </Pressable>
                <Text style={styles.termsText}> & </Text>
                <Pressable onPress={() => router.push('/(shared)/privacy-policy')}>
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* OTP input boxes */}
              <View style={styles.otpBoxesContainer}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => {
                      if (ref) otpInputRefs.current[i] = ref;
                    }}
                    style={[
                      styles.otpBox,
                      otp[i] && styles.otpBoxFilled,
                    ]}
                    value={otp[i] || ''}
                    onChangeText={(value) => handleOtpChange(i, value)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace') {
                        handleOtpKeyPress(i, nativeEvent.key);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    placeholderTextColor={colors.muted}
                  />
                ))}
              </View>

              {/* Timer and change number row */}
              <View style={styles.timerRow}>
                <Pressable onPress={handleChangeNumber}>
                  <View style={styles.changeNumberLink}>
                    <Text style={styles.changeNumberText}>← Change number</Text>
                  </View>
                </Pressable>
                <View style={styles.expireColumn}>
                  <Text style={styles.expireLabel}>Expires in</Text>
                  <Numeric style={styles.expireTime}>
                    {formatTime(countdown)}
                  </Numeric>
                </View>
              </View>

              {/* OTP expired message */}
              {otpExpired && (
                <Text style={styles.expiredText}>
                  OTP expired. Please request a new one.
                </Text>
              )}

              {/* Resend timer */}
              {!canResend ? (
                <Text style={styles.resendWaitText}>
                  Resend in <Numeric style={styles.resendTimer}>00:30</Numeric>
                </Text>
              ) : (
                <Pressable onPress={handleResendOtp} disabled={isLoading}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </Pressable>
              )}

              {/* Verify CTA */}
              <PrimaryButton
                label="Verify OTP"
                onPress={handleVerifyOtp}
                loading={isLoading}
                disabled={!canVerifyOtp}
                style={styles.ctaButton}
              />

              {/* Error message */}
              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* Bottom note */}
              <Text style={styles.bottomNote}>
                Your number is only used for authentication and is never shared.
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  container: {
    flex: 1,
  },

  // HERO SECTION
  hero: {
    backgroundColor: colors.navy,
    minHeight: 180,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(26, 107, 99, 0.18)',
  },
  heroCircle2: {
    position: 'absolute',
    right: 20,
    top: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(26, 107, 99, 0.12)',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    padding: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.whiteAlpha70,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  otpPhoneNumber: {
    fontFamily: 'DMMono',
    fontSize: 12,
  },

  // TAB SWITCHER
  tabContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.card,
    padding: 3,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.teal,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.whiteAlpha70,
  },
  tabTextActive: {
    color: 'white',
  },

  // BODY SECTION
  body: {
    backgroundColor: colors.bg,
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  // Phone input
  phoneInputSection: {
    marginBottom: spacing.lg,
  },
  phoneInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryBox: {
    width: 70,
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontFamily: 'DMMono',
    color: colors.navy,
  },

  // Info strip
  infoStrip: {
    backgroundColor: colorExtended.tealLight,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
    marginRight: spacing.sm,
  },
  infoText: {
    fontSize: 11,
    color: colors.teal,
    flex: 1,
  },

  // CTA button
  ctaButton: {
    marginBottom: spacing.lg,
  },

  // Error message
  errorText: {
    fontSize: 12,
    color: colors.red,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // Terms line
  termsLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  termsText: {
    fontSize: 11,
    color: colors.muted,
  },
  termsLink: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: '600',
  },

  // OTP INPUT SECTION
  otpBoxesContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'DMMono',
    color: colors.navy,
    backgroundColor: colors.surface,
  },
  otpBoxFilled: {
    borderColor: colors.teal,
    borderWidth: 1.5,
    backgroundColor: colorExtended.tealLight,
    color: colors.teal,
  },

  // Timer row
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  changeNumberLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeNumberText: {
    fontSize: 12,
    color: colors.slate,
  },
  expireColumn: {
    alignItems: 'flex-end',
  },
  expireLabel: {
    fontSize: 11,
    color: colors.slate,
  },
  expireTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },

  // OTP expired message
  expiredText: {
    fontSize: 12,
    color: colors.red,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // Resend
  resendWaitText: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  resendTimer: {
    fontSize: 12,
    fontFamily: 'DMMono',
    color: colors.muted,
  },
  resendLink: {
    fontSize: 12,
    color: colors.teal,
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  // Bottom note
  bottomNote: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
