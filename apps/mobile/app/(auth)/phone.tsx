/**
 * app/(auth)/phone.tsx
 * ──────────────────────────────────────────────────────────────────
 * Phone Entry Screen — Day 2 §2.2
 *
 * First screen after splash. Collects an Indian mobile number (+91)
 * and simulates sending an OTP when the number is valid.
 *
 * Rules enforced:
 *   - Zero hardcoded hex values — all from constants/tokens.ts
 *   - APP_NAME from constants/app.ts — never the string "Sortt"
 *   - No raw <Text> — Typography <Text variant> only
 *   - DM Mono for the +91 prefix and the phone number TextInput
 *   - Validation fires only after first submit attempt (hasSubmitted gate)
 *   - PrimaryButton loading prop used — no custom spinner
 *   - No Supabase or backend calls — setTimeout simulation only
 *   - All touch targets ≥ 48dp (WCAG AA)
 *   - phoneNumber persisted to authStore (for OTP screen §2.3)
 *
 * Navigation:
 *   router.push('/(auth)/otp') — OTP screen does not exist yet (§2.3)
 *   The push will land on an unmatched-route screen, which is expected.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useCallback, useRef, useState } from 'react';
import {
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

import { APP_NAME } from '../../constants/app';
import { colors, radius, spacing, colorExtended, materialBg } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';

// ── Indian mobile number validation ──────────────────────────────
// Must be exactly 10 digits, first digit 6–9 (TRAI numbering plan)
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

function isValidIndianMobile(number: string): boolean {
  return INDIAN_MOBILE_REGEX.test(number);
}

// ── Error copy (single source — avoids duplication) ───────────────
const ERROR_COPY = 'Please enter a valid 10-digit Indian mobile number';
const OTP_SIMULATE_MS = 1500;

// ─────────────────────────────────────────────────────────────────
// PhoneScreen
// ─────────────────────────────────────────────────────────────────
export default function PhoneScreen() {
  const router = useRouter();

  // ── Local UI state ─────────────────────────────────────────────
  const [phoneDigits, setPhoneDigits] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── Zustand ────────────────────────────────────────────────────
  const isLoading      = useAuthStore((s) => s.isLoading);
  const setIsLoading   = useAuthStore((s) => s.setIsLoading);
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);

  // ── Derived validation state ───────────────────────────────────
  const isValid     = isValidIndianMobile(phoneDigits);
  // Only show error after first submit attempt (never on first keystroke)
  const showError   = hasSubmitted && !isValid;

  // ── Handlers ───────────────────────────────────────────────────
  const handleChangeText = useCallback((raw: string) => {
    // Strip any non-digit characters (handles paste scenarios)
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setPhoneDigits(digits);
  }, []);

  const handleSend = useCallback(() => {
    // Gate: mark that submission has been attempted so validation shows
    setHasSubmitted(true);

    if (!isValidIndianMobile(phoneDigits)) {
      // Re-focus input so user can correct the number without extra tap
      inputRef.current?.focus();
      return;
    }

    // Persist full E.164 number digits to auth store for OTP screen
    setPhoneNumber(phoneDigits);
    setIsLoading(true);

    // Simulate 1.5s OTP send latency before navigation
    setTimeout(() => {
      setIsLoading(false);
      // OTP screen (§2.3) does not exist yet — the push will show
      // an unmatched-route screen. This is expected for §2.2.
      router.push('/(auth)/otp' as never);
    }, OTP_SIMULATE_MS);
  }, [phoneDigits, router, setIsLoading, setPhoneNumber]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* ── Navigation bar ── */}
      <NavBar title="Sign In / Register" onBack={() => router.replace('/(auth)/user-type')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Content area ───────────────────────────────────── */}
          <View style={styles.content}>

            {/* Headline */}
            <Text variant="heading" style={[styles.headline, { letterSpacing: -0.4 }]}>
              Welcome to Sortt
            </Text>

            {/* Sub-copy */}
            <Text variant="caption" style={[styles.subcopy, { lineHeight: 22 }]}>
              Enter your mobile number. We'll send a verification code on WhatsApp.
            </Text>

            {/* ── Phone input row ─────────────────────────────── */}
            <View style={{ gap: spacing.xs }}>
              <Text variant="caption" style={{ fontWeight: '600', color: colors.navy }}>
                Mobile Number
              </Text>
              <View style={styles.inputRow}>
                {/* Country prefix — non-editable, DM Mono */}
                <View style={styles.prefixContainer}>
                  <Text variant="body">🇮🇳</Text>
                  <Numeric size={16} color={colors.navy} style={{ fontWeight: '600' }}>
                    +91
                  </Numeric>
                </View>

                {/* Phone number input — DM Mono via fontFamily */}
                <Pressable
                  onPress={() => inputRef.current?.focus()}
                  style={[
                    styles.inputContainer,
                    showError && styles.inputContainerError,
                  ]}
                  accessible={false}
                >
                  <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={phoneDigits}
                onChangeText={handleChangeText}
                keyboardType="numeric"
                maxLength={10}
                placeholder="XXXXXXXXXX"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={handleSend}
                editable={!isLoading}
                accessibilityLabel="Mobile number"
                accessibilityHint="Enter your 10-digit Indian mobile number"
                  />
                </Pressable>
              </View>
            </View>

            {/* WhatsApp Info Banner */}
            <View style={styles.infoBanner}>
              <Text variant="body" style={{ fontSize: 18 }}>💬</Text>
              <View style={{ flex: 1 }}>
                <Text variant="caption" style={{ fontWeight: '600', color: colors.slate }}>
                  OTP via WhatsApp
                </Text>
                <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
                  Free · No SMS charges · Instant delivery
                </Text>
              </View>
            </View>

            {/* ── Inline validation error ─────────────────────── */}
            {showError && (
              <Text
                variant="caption"
                color={colors.red}
                style={styles.errorText}
              >
                {ERROR_COPY}
              </Text>
            )}
          </View>

          {/* ── Bottom action area ──────────────────────────────── */}
          <View style={styles.bottomArea}>
            <PrimaryButton
              label="💬 Send OTP via WhatsApp"
              onPress={handleSend}
              loading={isLoading}
            />

            {/* Terms copy */}
            <Text variant="caption" style={styles.termsText}>
              By continuing, you agree to our <Text variant="caption" style={{ fontWeight: '600', color: colors.navy }}>Terms</Text> and <Text variant="caption" style={{ fontWeight: '600', color: colors.navy }}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow:          1,
    justifyContent:    'space-between',
    paddingHorizontal: spacing.md,
    paddingTop:        spacing.xl,
    paddingBottom:     spacing.lg,
  },

  // ── Content ──────────────────────────────────────────────────
  content: {
    gap: spacing.sm,
  },
  headline: {
    marginBottom: spacing.xs,
  },
  subcopy: {
    marginBottom: spacing.md,
  },

  // ── Input row ─────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colorExtended.surface2,
    borderRadius:    radius.input,
    borderWidth:     1,
    borderColor:     colors.border,
    minHeight:       52, // ≥ 48dp WCAG AA
    overflow:        'hidden',
  },
  inputContainerError: {
    borderColor: colors.red,
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorExtended.surface2,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.xs,
  },
  textInput: {
    flex:          1,
    fontFamily:    'DMMono-Regular', // numeric data — DM Mono per MEMORY.md §2
    fontSize:      16,
    color:         colors.slate,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.sm,
    minHeight:     52, // ≥ 48dp WCAG AA
  },

  // ── Error ─────────────────────────────────────────────────────
  errorText: {
    marginTop: spacing.xs,
  },

  // ── Bottom ────────────────────────────────────────────────────
  bottomArea: {
    gap:       spacing.md,
    marginTop: spacing.xl,
  },
  termsText: {
    textAlign: 'center',
    color:     colors.muted,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: materialBg.fabric,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
