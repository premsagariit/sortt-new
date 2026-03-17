/**
 * app/(aggregator)/execution/receipt/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Pickup Receipt / Completion screen.
 *
 * Moved from (shared) to (aggregator) at user request.
 * High-fidelity receipt display with weight breakdown and rating.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, FileText, CaretRight, Star, Receipt } from 'phosphor-react-native';

import { colors, colorExtended, spacing, radius } from '../../../../constants/tokens';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../../components/ui/Button';
import { useAuthStore } from '../../../../store/authStore';
import { useOrderStore } from '../../../../store/orderStore';
import { useAggregatorStore } from '../../../../store/aggregatorStore';
import { EmptyState } from '../../../../components/ui/EmptyState';

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

export default function AggregatorReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(0);

  const { orders } = useOrderStore();
  const { executionDraftByOrderId, clearExecutionDraft } = useAggregatorStore();
  const order = orders.find(o => o.orderId === id);
  const draft = id ? executionDraftByOrderId[id] : undefined;

  const weightItems: WeightEntry[] = draft
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

  const totalAmount = draft?.totalAmount ?? Number(order?.displayAmount ?? order?.confirmedAmount ?? order?.estimatedAmount ?? 0);
  const totalWeight = draft?.totalWeight ?? weightItems.reduce((s, i) => s + i.weightKg, 0);

  const handleFinish = () => {
    if (id) {
      clearExecutionDraft(id);
    }
    // Navigate back to orders list, clearing execution stack
    router.dismissAll();
    router.replace('/(aggregator)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Teal confirmation header ──────────────────────── */}
        <View style={styles.successHeader}>
          <View style={styles.iconCircle}>
             <CheckCircle size={48} color={colors.teal} weight="fill" />
          </View>
          <Text variant="heading" color={colors.surface} style={styles.successTitle}>
            Pickup Complete!
          </Text>
          <Numeric size={32} color={colors.surface} style={styles.successAmount}>
            ₹{totalAmount.toFixed(0)} paid
          </Numeric>
          <Numeric
            size={12}
            color={colors.surface}
            style={{ opacity: 0.6, marginTop: 4 }}
          >
            {order?.orderNumber || '#000000'}
          </Numeric>
        </View>

        {/* ── Weight table ───────────────────────────────────── */}
        <View style={styles.summarySection}>
            <Text
              variant="caption"
              color={colors.navy}
              style={styles.sectionLabel}
            >
              TRANSACTION SUMMARY
            </Text>
    
            <View style={styles.weightTable}>
              {weightItems.length === 0 ? (
                <View style={{ padding: spacing.md }}>
                  <EmptyState
                    icon={<Receipt size={48} color={colors.muted} weight="thin" />}
                    heading="Receipt details unavailable"
                    body="No weighed material breakdown was found for this order."
                  />
                </View>
              ) : weightItems.map((item) => {
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
                  Total Paid
                </Text>
                <Numeric size={13} color={colors.navy}>
                  {totalWeight.toFixed(1)} kg
                </Numeric>
                <Numeric size={14} color={colors.amber} style={{ marginLeft: 'auto' }}>
                  ₹{totalAmount.toFixed(0)}
                </Numeric>
              </View>
            </View>
        </View>

        <View style={styles.divider} />

        {/* ── Rating Card (Embedded in receipt for smoother flow) ─ */}
        <View style={styles.ratingCard}>
           <Text variant="subheading" color={colors.navy}>Rate the Seller</Text>
           <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', marginBottom: spacing.md }}>
             How was your experience with {order?.sellerName || 'the seller'}?
           </Text>
           <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setRating(s)}>
                  <Star
                    size={40}
                    color={s <= rating ? colors.amber : colors.border}
                    weight={s <= rating ? 'fill' : 'regular'}
                  />
                </Pressable>
              ))}
           </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Submit & Back to Feed"
            onPress={handleFinish}
            disabled={rating === 0}
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
  },

  successHeader: {
    backgroundColor: colors.teal,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
  },
  successTitle: {
    marginBottom: spacing.xs,
  },
  successAmount: {
    fontFamily: 'DMMono-Bold',
  },

  summarySection: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    letterSpacing: 1,
    fontWeight: '700',
  },

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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weightTotalRow: {
    borderBottomWidth: 0,
    backgroundColor: colors.bg,
  },
  weightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weightMat: {
    flex: 1,
    fontFamily: 'DMSans-Medium',
  },
  weightKg: {
    fontFamily: 'DMMono-Regular',
  },
  weightRate: {
    marginLeft: 6,
  },
  weightTotal: {
    fontFamily: 'DMMono-Medium',
    minWidth: 40,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
    marginHorizontal: spacing.md,
  },

  ratingCard: {
    marginHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  actions: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  reportIssue: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  reportIssueText: {
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
