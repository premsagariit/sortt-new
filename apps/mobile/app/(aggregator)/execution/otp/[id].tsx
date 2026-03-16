/**
 * app/(aggregator)/execution/otp/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Pickup OTP Confirmation Screen.
 *
 * Moved from (shared) to (aggregator) at user request.
 * This screen is used by the aggregator to verify the pickup with 
 * the seller's OTP.
 *
 * State flow:
 * 1. Shows Gewicht breakdown (Actual weights)
 * 2. OTP input field
 * 3. verifyOtpApi call
 * 4. Success state -> Redirect to receipt
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, ShieldCheck, Info } from 'phosphor-react-native';

import { colors, colorExtended, spacing, radius } from '../../../../constants/tokens';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { NavBar } from '../../../../components/ui/NavBar';
import { PrimaryButton } from '../../../../components/ui/Button';
import { useOrderStore } from '../../../../store/orderStore';
import { useAggregatorStore } from '../../../../store/aggregatorStore';

// ── Types ──────────────────────────────────────────────────────────
type WeightEntry = {
  material: string;
  materialKey: string;
  weightKg: number;
  ratePerKg: number;
};

// ── Mock data for fallback ─────────────────────────────────────────
const MOCK_WEIGHTS: Record<string, WeightEntry[]> = {
  'ORD-2841': [
    { material: 'Paper', materialKey: 'paper', weightKg: 12.5, ratePerKg: 10 },
    { material: 'Metal', materialKey: 'metal', weightKg: 6.0, ratePerKg: 28 },
    { material: 'Plastic', materialKey: 'plastic', weightKg: 3.0, ratePerKg: 12 },
  ],
};

const MATERIAL_COLORS: Record<string, string> = {
  paper: colors.material.paper.fg,
  metal: colors.material.metal.fg,
  plastic: colors.material.plastic.fg,
  ewaste: colors.material.ewaste.fg,
  fabric: colors.material.fabric.fg,
  glass: colors.material.glass.fg,
};

export default function AggregatorOtpScreen() {
  const { id, amount } = useLocalSearchParams<{ id: string; amount: string }>();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { orders } = useOrderStore();
  const { verifyOtpApi } = useAggregatorStore();

  const order = orders.find(o => o.orderId === id);
  const weightData = id ? MOCK_WEIGHTS[id] : [];
  
  // Use the amount passed from weighing screen, or calculate from mock
  const totalAmount = amount ? parseFloat(amount) : weightData.reduce((s, i) => s + i.weightKg * i.ratePerKg, 0);

  const handleVerify = async () => {
    if (otp.length < 4) return;
    
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      // Real API call via aggregator store
      await verifyOtpApi(id!, otp);
      
      // Success -> Go to receipt
      // We use router.replace so they can't go "back" to the OTP screen
      router.replace({
        pathname: '/(aggregator)/execution/receipt/[id]' as any,
        params: { id, amount: totalAmount.toString() }
      });
    } catch (err: any) {
      console.error('OTP Verification failed:', err);
      setErrorMsg(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar
        title="Payment Confirmation"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Transaction Guard Info ────────────────────── */}
          <View style={styles.guardBanner}>
            <ShieldCheck size={20} color={colors.teal} weight="fill" />
            <Text variant="caption" color={colors.slate} style={{ flex: 1 }}>
              Enter the OTP provided by the seller to authorize payment and complete pickup.
            </Text>
          </View>

          {/* ── Weight Breakdown (The Table) ────────────────── */}
          <Text variant="subheading" style={styles.sectionTitle}>
            Pickup Breakdown
          </Text>

          <View style={styles.summaryTable}>
            {weightData.map((item) => (
              <View key={item.materialKey} style={styles.summaryRow}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: MATERIAL_COLORS[item.materialKey] || colors.muted },
                  ]}
                />
                <Text variant="body" color={colors.navy} style={styles.rowLabel}>
                  {item.material}
                </Text>
                <Numeric size={14} color={colors.slate} style={styles.rowKg}>
                  {item.weightKg}kg
                </Numeric>
                <Numeric size={14} color={colors.navy} style={styles.rowVal}>
                  ₹{(item.weightKg * item.ratePerKg).toFixed(0)}
                </Numeric>
              </View>
            ))}

            {/* Total Row */}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text variant="label" color={colors.navy} style={{ flex: 1 }}>
                Total Payable
              </Text>
              <Numeric size={20} color={colors.amber} style={styles.totalValue}>
                ₹{totalAmount.toFixed(0)}
              </Numeric>
            </View>
          </View>

          {/* ── OTP Entry Area ─────────────────────────────── */}
          <View style={styles.otpSection}>
            <Text variant="label" color={colors.navy} style={styles.otpLabel}>
              Seller OTP
            </Text>
            <View style={styles.otpInputContainer}>
              <TextInput
                style={[
                  styles.otpInput,
                  errorMsg ? styles.otpInputError : null
                ]}
                value={otp}
                onChangeText={(v) => {
                  setErrorMsg(null);
                  setOtp(v.replace(/[^0-9]/g, '').slice(0, 6));
                }}
                placeholder="× × × ×"
                placeholderTextColor={colors.border}
                keyboardType="number-pad"
                maxLength={6}
              />
              {isVerifying && (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.teal} />
                </View>
              )}
            </View>
            
            {errorMsg && (
              <Text variant="caption" color={colors.red} style={styles.errorText}>
                {errorMsg}
              </Text>
            )}

            <View style={styles.complianceHint}>
              <Info size={14} color={colors.muted} />
              <Text variant="caption" color={colors.muted}>
                C1 COMPLIANCE: Do not pay before verifying OTP.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* ── Sticky Footer ────────────────────────────────── */}
        <View style={styles.footer}>
          <PrimaryButton
            label={isVerifying ? "Verifying..." : "Confirm & Pay Seller →"}
            onPress={handleVerify}
            disabled={otp.length < 4 || isVerifying}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },

  // Guard Banner
  guardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colorExtended.tealLight,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colorExtended.tealLight,
  },

  // Table
  sectionTitle: {
    fontFamily: 'DMSans-Bold',
    color: colors.navy,
  },
  summaryTable: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  totalRow: {
    backgroundColor: colors.bg,
    borderBottomWidth: 0,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'DMSans-Medium',
  },
  rowKg: {
    fontFamily: 'DMMono-Regular',
    marginRight: spacing.md,
  },
  rowVal: {
    fontFamily: 'DMMono-Medium',
    minWidth: 60,
    textAlign: 'right',
  },
  totalValue: {
    fontFamily: 'DMMono-Bold',
  },

  // OTP
  otpSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  otpLabel: {
    letterSpacing: 0.5,
  },
  otpInputContainer: {
    position: 'relative',
  },
  otpInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    height: 64,
    fontSize: 28,
    fontFamily: 'DMMono-Bold',
    textAlign: 'center',
    color: colors.navy,
    letterSpacing: 8,
  },
  otpInputError: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  },
  loaderWrap: {
    position: 'absolute',
    right: 20,
    top: 22,
  },
  errorText: {
    textAlign: 'center',
  },
  complianceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },

  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
