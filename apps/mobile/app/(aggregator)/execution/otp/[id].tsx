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

import React, { useState, useEffect, useRef } from 'react';
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
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ShieldCheck, Info, Scales } from 'phosphor-react-native';

import { colors, colorExtended, spacing, radius } from '../../../../constants/tokens';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { NavBar } from '../../../../components/ui/NavBar';
import { PrimaryButton } from '../../../../components/ui/Button';
import { useOrderStore } from '../../../../store/orderStore';
import { useAggregatorStore } from '../../../../store/aggregatorStore';
import { EmptyState } from '../../../../components/ui/EmptyState';

// ── Types ──────────────────────────────────────────────────────────
type WeightEntry = {
  material: string;
  materialKey: string;
  weightKg: number;
  ratePerKg: number;
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { orders, fetchOrder } = useOrderStore();
  const { verifyOtpApi, executionDraftByOrderId } = useAggregatorStore();
  const otpInputRef = useRef<TextInput>(null);
  const OTP_LENGTH = 6;

  const order = orders.find(o => o.orderId === id);
  const draft = id ? executionDraftByOrderId[id] : undefined;

  useEffect(() => {
    if (id && !order) {
      void fetchOrder(id, true);
    }
  }, [id, order, fetchOrder]);

  const weightData: WeightEntry[] = draft
    ? draft.lineItems.map((item) => ({
        material: item.label,
        materialKey: item.materialCode,
        weightKg: item.weightKg,
        ratePerKg: item.ratePerKg,
      }))
    : Array.isArray(order?.lineItems) && order!.lineItems!.length > 0
      ? order!.lineItems!.map((item) => ({
          material: item.materialCode.charAt(0).toUpperCase() + item.materialCode.slice(1),
          materialKey: item.materialCode,
          weightKg: Number(item.weightKg ?? 0),
          ratePerKg: Number(item.ratePerKg ?? 0),
        }))
      : Object.entries(order?.estimatedWeights ?? {}).map(([materialCode, weight]) => ({
          material: materialCode.charAt(0).toUpperCase() + materialCode.slice(1),
          materialKey: materialCode,
          weightKg: Number(weight ?? 0),
          ratePerKg: 0,
        }));

  const totalAmount = draft
    ? draft.totalAmount
    : Number(order?.displayAmount ?? order?.confirmedAmount ?? order?.estimatedAmount ?? 0);

  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) return;
    
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      // Real API call via aggregator store
      await verifyOtpApi(id!, otp);

      // Success -> animated completion screen, then receipt
      router.replace({
        pathname: '/(shared)/order-complete',
        params: {
          orderId: id,
          amount: String(totalAmount),
          fallback: id ? `/(aggregator)/execution/receipt/${id}` : '/(aggregator)/orders',
        },
      });
    } catch (err: any) {
      console.error('OTP Verification failed:', err);
      const nextError = err?.message || 'Invalid OTP. Please try again.';
      setErrorMsg(nextError);
      if (/invalid|incorrect|otp/i.test(String(nextError))) {
        setOtp('');
      }
      requestAnimationFrame(() => {
        otpInputRef.current?.focus();
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar
        title="Payment Confirmation"
        onBack={() => router.replace('/(aggregator)/orders')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
          {/* ── Transaction Guard Info ────────────────────── */}
          <View style={styles.guardBanner}>
            <ShieldCheck size={20} color={colors.teal} weight="fill" />
            <Text variant="caption" color={colors.slate} style={{ flex: 1 }}>
              Enter the 6-digit OTP provided by the seller to authorize payment and complete pickup.
            </Text>
          </View>

          {/* ── Weight Breakdown (The Table) ────────────────── */}
          <Text variant="subheading" style={styles.sectionTitle}>
            Pickup Breakdown
          </Text>

          {weightData.length === 0 ? (
            <EmptyState
              icon={<Scales size={48} color={colors.muted} weight="thin" />}
              heading="Pickup details unavailable"
              body="Weighing data is not available for this order yet."
            />
          ) : (
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
          )}

          {/* ── OTP Entry Area ─────────────────────────────── */}
          <View style={styles.otpSection}>
            <Text variant="label" color={colors.navy} style={styles.otpLabel}>
              Seller OTP
            </Text>
            <View style={styles.otpInputContainer}>
              {isVerifying ? (
                <View style={styles.verifyingWrap}>
                  <ActivityIndicator size="large" color={colors.teal} />
                  <Text variant="caption" color={colors.slate} style={styles.verifyingText}>
                    Verifying OTP...
                  </Text>
                </View>
              ) : (
                <>
                  <Pressable
                    style={styles.digitRow}
                    onPress={() => otpInputRef.current?.focus()}
                  >
                    {Array.from({ length: OTP_LENGTH }).map((_, idx) => {
                      const digit = otp[idx] || '';
                      const isFocused = otp.length === idx;
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.digitBox,
                            digit ? styles.digitBoxActive : null,
                            isFocused ? styles.digitBoxFocused : null,
                            errorMsg ? styles.digitBoxError : null
                          ]}
                        >
                          <Text variant="heading" color={digit ? colors.navy : colors.border}>
                            {digit || ''}
                          </Text>
                        </View>
                      );
                    })}
                  </Pressable>

                  <TextInput
                    ref={otpInputRef}
                    style={styles.hiddenInput}
                    value={otp}
                    onChangeText={(v) => {
                      setErrorMsg(null);
                      setOtp(v.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH));
                    }}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                  />
                </>
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
            disabled={otp.length < OTP_LENGTH || isVerifying}
          />
        </View>
    </KeyboardAvoidingView>
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
    height: 72,
    justifyContent: 'center',
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  digitBox: {
    flex: 1,
    height: 72,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: colors.slate,
  },
  digitBoxFocused: {
    borderColor: colors.teal,
    borderWidth: 2,
    backgroundColor: colorExtended.tealLight,
  },
  digitBoxError: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  verifyingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  verifyingText: {
    textAlign: 'center',
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
