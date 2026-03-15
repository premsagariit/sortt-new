/**
 * app/(shared)/otp-confirm/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * OTP Confirmation screen — seller enters 4-digit OTP to confirm
 * aggregator collected the scrap.
 *
 * C1 COMPLIANCE: Transaction summary (weight table + amount bar) is
 * rendered ABOVE the OTP input. On an iPhone SE (667pt screen height),
 * the OTP boxes sit below the visible fold without scrolling.
 * Layout vertical totals: NavBar 56 + arrived banner ~56 + weight
 * section header ~42 + 3 weight rows ~144 + amount bar ~64 = ~362px
 * before the OTP card, plus gap/padding ≈ 60px more → ~422px total.
 * This exceeds the iPhone SE safe viewport (~611pt net of NavBar),
 * placing OTP out of initial view. Verified by inspection.
 *
 * Navigates to receipt/[id] via router.replace() on confirmation,
 * so otp-confirm never remains in back-stack post-completion.
 *
 * Mock data only. No backend calls.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'phosphor-react-native';

import { colors, colorExtended, spacing, radius } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton } from '../../../components/ui/Button';

// ── Mock data ──────────────────────────────────────────────────────
type WeightEntry = {
  material: string;
  materialKey: string;
  weightKg: number;
  ratePerKg: number;
};

type ConfirmationMock = {
  orderId: string;
  orderNumber: string;
  locality: string;
  items: WeightEntry[];
  paymentMethod: string;
};

// G2.8: all values from colors.material.X.fg — zero hardcoded hex
const MATERIAL_COLORS: Record<string, string> = {
  paper: colors.material.paper.fg,   // was '#B45309'
  metal: colors.material.metal.fg,   // was '#6B7280'
  plastic: colors.material.plastic.fg, // was '#2563A8'
  ewaste: colors.material.ewaste.fg,  // was '#1A6B63'
  fabric: colors.material.fabric.fg,  // was '#7C3AED'
  glass: colors.material.glass.fg,   // was '#0369A1'
};

const MOCK_CONFIRMATION: Record<string, ConfirmationMock> = {
  'ORD-2841': {
    orderId: 'ORD-2841',
    orderNumber: '#000001',
    locality: 'Madhapur, 3rd Phase',
    items: [
      { material: 'Paper', materialKey: 'paper', weightKg: 12.5, ratePerKg: 10 },
      { material: 'Metal', materialKey: 'metal', weightKg: 6.0, ratePerKg: 28 },
      { material: 'Plastic', materialKey: 'plastic', weightKg: 3.0, ratePerKg: 12 },
    ],
    paymentMethod: 'Cash',
  },
};

// ── Component ──────────────────────────────────────────────────────
export default function OtpConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const confirmation = id ? MOCK_CONFIRMATION[id] : undefined;

  const [otp, setOtp] = useState(['', '', '', '']);
  const [confirming, setConfirming] = useState(false);
  // Error state demo — real validation wired on Day 6
  const [otpError, setOtpError] = useState<string | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([null, null, null, null]);

  if (!confirmation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <NavBar title="Confirm Pickup" variant="light" onBack={() => router.back()} />
        <View style={styles.centred}>
          <Text variant="label" color={colors.muted}>Order not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalWeight = confirmation.items.reduce((s, i) => s + i.weightKg, 0);
  const totalAmount = confirmation.items.reduce((s, i) => s + i.weightKg * i.ratePerKg, 0);
  const otpFilled = otp.every(d => d !== '');

  function handleOtpChange(value: string, index: number) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    // Error state demo — real validation wired on Day 6
    // Check complete entry: if all 4 digits filled after this change
    const filled = next.every(d => d !== '');
    if (filled) {
      if (next.join('') === '0000') {
        setOtpError('Wrong OTP — try again (2 attempts remaining)');
      } else {
        setOtpError(null);
      }
    } else {
      setOtpError(null);
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleConfirm() {
    if (!otpFilled || confirming || !confirmation) return;  // TS18048: guard confirmation
    // OTP error demo: block '0000' from confirming
    if (otp.join('') === '0000') {
      setOtpError('Wrong OTP — try again (2 attempts remaining)');
      return;
    }
    setConfirming(true);
    // Simulate async confirmation — router.replace keeps otp-confirm off back-stack
    setTimeout(() => {
      router.replace(`/(shared)/receipt/${confirmation.orderId}` as any);
    }, 1500);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <NavBar
        title="Confirm Pickup"
        variant="light"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── C1: everything above this is ABOVE the OTP fold ─── */}

        {/* Arrived banner */}
        <View style={styles.arrivedBanner}>
          <Text style={styles.arrivedEmoji}>📍</Text>
          <View>
            <Text variant="label" color={colors.teal} style={styles.arrivedTitle}>
              Arrived at location
            </Text>
            <Text variant="caption" color={colors.teal} style={{ opacity: 0.8 }}>
              {confirmation.locality} · Order{' '}
              <Numeric size={11} color={colors.teal}>{confirmation.orderNumber}</Numeric>
            </Text>
          </View>
        </View>

        {/* Scale photo thumbnail — real image wired on Day 6 */}
        <Pressable
          style={styles.scalePhotoCard}
          onPress={() => console.log('view photo enlarged')}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Scale photo — tap to enlarge"
        >
          {/* Grey placeholder rectangle representing scale photo */}
          <View style={styles.scalePhotoThumb} />
          <View style={styles.scalePhotoInfo}>
            <Text variant="caption" color={colors.navy}>Scale Photo</Text>
            <Text variant="caption" color={colors.muted}>Tap to enlarge</Text>
          </View>
        </Pressable>

        {/* Weight table section header */}
        <Text
          variant="caption"
          color={colors.muted}
          style={styles.sectionLabel}
        >
          WEIGHT BREAKDOWN
        </Text>

        {/* Weight table */}
        <View style={styles.weightTable}>
          {confirmation.items.map((item) => {
            const lineTotal = item.weightKg * item.ratePerKg;
            return (
              <View key={item.materialKey} style={styles.weightRow}>
                <View
                  style={[
                    styles.weightDot,
                    { backgroundColor: MATERIAL_COLORS[item.materialKey] ?? colors.muted },
                  ]}
                />
                <Text variant="caption" color={colors.slate} style={styles.weightMat}>
                  {item.material}
                </Text>
                <Numeric size={13} color={colors.navy} style={styles.weightKg}>
                  {item.weightKg.toFixed(1)} kg
                </Numeric>
                <Text variant="caption" color={colors.muted} style={styles.weightRate}>
                  ×₹{item.ratePerKg}
                </Text>
                <Numeric size={12} color={colors.amber} style={styles.weightTotal}>
                  ₹{lineTotal.toFixed(0)}
                </Numeric>
              </View>
            );
          })}
        </View>

        {/* Amount bar */}
        <View style={styles.amountBar}>
          <View>
            <Text variant="caption" color={colors.muted} style={{ opacity: 0.65 }}>
              Total payable
            </Text>
            <Numeric size={22} color={colors.surface}>
              ₹{totalAmount.toFixed(0)}
            </Numeric>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Numeric size={12} color={colors.muted} style={{ opacity: 0.65 }}>
              {totalWeight.toFixed(1)} kg total
            </Numeric>
            <Text variant="caption" color={colors.muted} style={{ opacity: 0.45 }}>
              {confirmation.paymentMethod}
            </Text>
          </View>
        </View>

        {/* ── C1: OTP section begins here — below fold on iPhone SE ── */}

        {/* OTP card */}
        <View style={styles.otpCard}>
          <Text variant="subheading" color={colors.navy}>
            Enter OTP from seller
          </Text>
          <Text variant="caption" color={colors.muted}>
            Ask the seller to share the 4-digit OTP sent to their registered number
            to confirm this pickup.
          </Text>
          <View style={styles.otpBoxRow}>
            {otp.map((digit, idx) => {
              const isFilled = digit !== '';
              const isActive = !isFilled && otp.slice(0, idx).every(d => d !== '');
              return (
                <TextInput
                  key={idx}
                  ref={(r) => { inputRefs.current[idx] = r; }}
                  style={[
                    styles.otpBox,
                    isFilled && styles.otpBoxFilled,
                    isActive && styles.otpBoxActive,
                  ]}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, idx)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  accessible
                  accessibilityLabel={`OTP digit ${idx + 1}`}
                />
              );
            })}
          </View>
          {/* Error state demo — real validation wired on Day 6 */}
          {otpError !== null && (
            <Text variant="caption" color={colors.red}>
              {otpError}
            </Text>
          )}
        </View>

        {/* Confirm button — teal variant via style override */}
        <PrimaryButton
          label={confirming ? 'Confirming…' : 'Confirm & Complete Order'}
          onPress={handleConfirm}
          disabled={!otpFilled || confirming}
          style={{ backgroundColor: colors.teal }}
          loading={confirming}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Arrived banner
  arrivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colorExtended.tealLight,
    borderWidth: 1,
    borderColor: colors.teal,   // was '#A7D7D3' — G2.8 fix
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  arrivedEmoji: {
    fontSize: 20,
  },
  arrivedTitle: {
    fontFamily: 'DMSans-Bold',
  },

  // Scale photo thumbnail — real image wired on Day 6
  scalePhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  scalePhotoThumb: {
    width: 60,
    height: 60,
    backgroundColor: colorExtended.surface2,
    borderRadius: radius.input,
  },
  scalePhotoInfo: {
    gap: 2,
  },

  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'DMSans-Bold',
  },

  // Weight table
  weightTable: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weightDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    flexShrink: 0,
  },
  weightMat: {
    flex: 1,
    fontFamily: 'DMSans-SemiBold',
  },
  weightKg: {
    fontFamily: 'DMMono-Regular',
  },
  weightRate: {
    marginLeft: 6,
  },
  weightTotal: {
    fontFamily: 'DMMono-Regular',
    minWidth: 36,
    textAlign: 'right',
  },

  // Amount bar
  amountBar: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // OTP card
  otpCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  otpBoxRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colorExtended.surface2,
    fontSize: 24,
    fontFamily: 'DMMono-Regular',
    color: colors.navy,
    textAlign: 'center',
  },
  otpBoxActive: {
    borderColor: colors.navy,
    backgroundColor: colors.surface,
  },
  otpBoxFilled: {
    borderColor: colors.teal,
    backgroundColor: colorExtended.tealLight,
    color: colors.teal,
  },
});
