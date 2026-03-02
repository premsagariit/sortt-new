/**
 * app/(seller)/earnings.tsx
 * ──────────────────────────────────────────────────────────────────
 * Earnings Summary screen.
 * Displays summary stats and transaction history.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius } from '../../constants/tokens';
import { safeBack } from '../../utils/navigation';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { MaterialChip } from '../../components/ui/MaterialChip';

// Mock transaction data
const TRANSACTIONS = [
  {
    id: 'TXN-92841',
    date: '1 Mar 2026',
    amount: 1450,
    materials: ['metal', 'plastic', 'paper'],
    aggregator: 'Ramesh Scrap Dealers',
  },
  {
    id: 'TXN-91723',
    date: '24 Feb 2026',
    amount: 820,
    materials: ['plastic', 'ewaste'],
    aggregator: 'Green India Recyclers',
  },
  {
    id: 'TXN-90412',
    date: '18 Feb 2026',
    amount: 2150,
    materials: ['metal', 'fabric'],
    aggregator: 'Hyderabad Metals',
  },
  {
    id: 'TXN-89210',
    date: '12 Feb 2026',
    amount: 640,
    materials: ['glass', 'paper'],
    aggregator: 'Eco Solutions',
  },
];

export default function EarningsSummary() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar 
        title="Earnings Summary" 
        variant="light" 
        onBack={() => safeBack()} 
      />

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.statBox}>
            <Text variant="caption" color={colors.muted}>Total Earned</Text>
            <Numeric size={20} color={colors.navy}>₹5,060</Numeric>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text variant="caption" color={colors.muted}>Pickups</Text>
            <Numeric size={20} color={colors.navy}>12</Numeric>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text variant="caption" color={colors.muted}>Avg. per Order</Text>
            <Numeric size={20} color={colors.navy}>₹421</Numeric>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historyHeader}>
          <Text variant="subheading">Transaction History</Text>
        </View>

        {TRANSACTIONS.map((txn) => (
          <View key={txn.id} style={styles.txnCard}>
            <View style={styles.txnTealBar} />
            <View style={styles.txnContent}>
              <View style={styles.txnTop}>
                <View>
                  <Numeric size={14} color={colors.navy}>#{txn.id}</Numeric>
                  <Text variant="caption" color={colors.muted}>{txn.date}</Text>
                </View>
                <Numeric size={20} color={colors.teal}>₹{txn.amount}</Numeric>
              </View>

              <View style={styles.aggregatorRow}>
                <Text variant="label" color={colors.slate}>Paid by {txn.aggregator}</Text>
              </View>

              <View style={styles.materialsRow}>
                {txn.materials.map((m: any) => (
                  <MaterialChip key={m} material={m} variant="chip" />
                ))}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.listFooter}>
          <Text variant="caption" color={colors.muted}>Viewing last 30 days of history</Text>
        </View>
      </ScrollView>
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
  content: {
    padding: spacing.md,
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  historyHeader: {
    marginBottom: spacing.md,
  },
  txnCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  txnTealBar: {
    width: 4,
    backgroundColor: colors.teal,
  },
  txnContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  txnTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  aggregatorRow: {
    marginTop: -4,
  },
  materialsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
