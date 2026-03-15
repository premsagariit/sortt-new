/**
 * app/(shared)/receipt/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Transaction Receipt screen.
 *
 * Full-screen layout — NO NavBar. No back button intentionally.
 * The Back to Home button uses router.replace (not push/back) so
 * the otp-confirm screen is NOT in the back-stack after completion.
 *
 * Sections:
 *   1. Teal confirmation header (full-width)
 *   2. Weight table (same data as otp-confirm)
 *   3. GST Invoice button (disabled, Business accounts only)
 *   4. Star rating (local state, tappable)
 *   5. Review text input (appears after ≥1 star selected)
 *   6. Submit Review button (disabled until ≥1 star)
 *   7. Share Receipt tappable text
 *   8. Back to Home PrimaryButton
 *
 * Mock data only. No backend calls.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, FileText, CaretRight } from 'phosphor-react-native';

import { colors, colorExtended, spacing, radius } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { SecondaryButton } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';

// ── Mock data (reuses same shape as otp-confirm) ───────────────────
type WeightEntry = {
  material: string;
  materialKey: string;
  weightKg: number;
  ratePerKg: number;
};

type ReceiptMock = {
  orderId: string;
  orderNumber: string;
  locality: string;
  items: WeightEntry[];
  paymentMethod: string;
  isBusiness: boolean;
};

// G2.8: all values from colors.material.X.fg — zero hardcoded hex
const MATERIAL_COLORS: Record<string, string> = {
  paper: colors.material.paper.fg,
  metal: colors.material.metal.fg,
  plastic: colors.material.plastic.fg,
  ewaste: colors.material.ewaste.fg,
  fabric: colors.material.fabric.fg,
  glass: colors.material.glass.fg,
};

const MOCK_RECEIPT: Record<string, ReceiptMock> = {
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
    isBusiness: false,
  },
  'ORD-2790': {
    orderId: 'ORD-2790',
    orderNumber: '#000002',
    locality: 'Gachibowli, DLF',
    items: [
      { material: 'E-Waste', materialKey: 'ewaste', weightKg: 8.5, ratePerKg: 120 },
    ],
    paymentMethod: 'Cash',
    isBusiness: true,
  },
};

// ── Component ──────────────────────────────────────────────────────
export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = id ? MOCK_RECEIPT[id] : undefined;
  const userType = useAuthStore((s: any) => s.userType);
  const homeRoute = userType === 'aggregator' ? '/(aggregator)/home' : '/(seller)/home';

  if (!receipt) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centred}>
          <Text variant="label" color={colors.muted}>Receipt not found.</Text>
          <Text
            variant="caption"
            color={colors.red}
            style={{ marginTop: spacing.sm }}
            onPress={() => router.replace(homeRoute as any)}
          >
            Back to Home
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalAmount = receipt.items.reduce((s, i) => s + i.weightKg * i.ratePerKg, 0);
  const totalWeight = receipt.items.reduce((s, i) => s + i.weightKg, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Teal confirmation header ──────────────────────── */}
        <View style={styles.successHeader}>
          <CheckCircle size={48} color={colors.surface} weight="fill" />
          <Text variant="heading" color={colors.surface} style={styles.successTitle}>
            Pickup Complete!
          </Text>
          <Numeric size={32} color={colors.surface} style={styles.successAmount}>
            ₹{totalAmount.toFixed(0)} received
          </Numeric>
          <Numeric
            size={12}
            color={colors.surface}
            style={{ opacity: 0.6, marginTop: 4 }}
          >
            {receipt.orderNumber}
          </Numeric>
        </View>

        {/* ── Weight table ───────────────────────────────────── */}
        <Text
          variant="caption"
          color={colors.navy}
          style={styles.sectionLabel}
        >
          TRANSACTION SUMMARY
        </Text>

        <View style={styles.weightTable}>
          {receipt.items.map((item) => {
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
          {/* Total row */}
          <View style={[styles.weightRow, styles.weightTotalRow]}>
            <Text variant="label" color={colors.navy} style={{ flex: 1 }}>
              Total
            </Text>
            <Numeric size={13} color={colors.navy}>
              {totalWeight.toFixed(1)} kg
            </Numeric>
            <Numeric size={14} color={colors.amber} style={{ marginLeft: 'auto' }}>
              ₹{totalAmount.toFixed(0)}
            </Numeric>
          </View>
        </View>

        {/* ── GST Invoice (Business only, currently disabled) ── */}
        <View style={styles.gstSection}>
          <SecondaryButton
            label="Download GST Invoice"
            icon={<FileText size={18} color={colors.navy} />}
            onPress={() => console.log('GST invoice download — business only')}
            disabled
          />
          <Text variant="caption" color={colors.muted} style={styles.gstNote}>
            {receipt.isBusiness
              ? 'GST invoice ready — tap to download.'
              : 'Available for Business accounts only.'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* ── Compact review prompt — taps through to dedicated S28 review screen ── */}
        <Pressable
          onPress={() => router.push(`/(shared)/review/${receipt.orderId}` as any)}
          style={styles.reviewPromptCard}
        >
          <View style={styles.reviewPromptLeft}>
            {/* Teal avatar 40×40, initial "K" */}
            <View style={styles.reviewAvatar}>
              <Text variant="body" style={{ color: colors.surface, fontWeight: '700' } as any}>
                K
              </Text>
            </View>
            <View>
              <Text variant="body" style={{ fontWeight: '600', color: colors.navy } as any}>
                Rate your aggregator
              </Text>
              <Text variant="caption" style={{ color: colors.muted } as any}>
                Kumar Scrap Co. · Tap to review
              </Text>
            </View>
          </View>
          {/* Chevron right › */}
          <CaretRight size={18} color={colors.muted} weight="bold" />
        </Pressable>

        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton
            label="Back to Home"
            onPress={() => router.replace(homeRoute as any)}
          />
          <Pressable
            onPress={() => router.push('/(shared)/dispute' as any)}
            style={styles.reportIssue}
          >
            <Text variant="caption" style={styles.reportIssueText}>
              Report an issue
            </Text>
          </Pressable>
        </View>
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
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  // Success header (teal, full-width, no horizontal padding offset)
  successHeader: {
    backgroundColor: colors.teal,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  successTitle: {
    marginTop: spacing.xs,
    letterSpacing: -0.3,
  },
  successAmount: {
    fontFamily: 'DMMono-Regular',
    marginTop: spacing.xs,
  },

  // Section label
  sectionLabel: {
    marginHorizontal: spacing.md,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'DMSans-Bold',
  },

  // Weight table
  weightTable: {
    marginHorizontal: spacing.md,
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
  weightTotalRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
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

  // GST
  gstSection: {
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
  gstNote: {
    textAlign: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  // Compact Review Prompt
  reviewPromptCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportIssue: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  reportIssueText: {
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
