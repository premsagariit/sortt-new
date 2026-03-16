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

import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore } from '../../store/orderStore';

export default function EarningsSummary() {
  const router = useRouter();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);

  // Sync data on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchMe();
      fetchOrders(true);
    }, [fetchMe, fetchOrders])
  );

  // Derived data
  const completedOrders = orders
    .filter(o => o.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalEarned = completedOrders.reduce((acc, o) => acc + (o.confirmedAmount || o.estimatedAmount || 0), 0);
  const pickupsCount = completedOrders.length;
  const avgPerOrder = pickupsCount > 0 ? Math.round(totalEarned / pickupsCount) : 0;

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
            <Numeric size={20} color={colors.navy}>₹{totalEarned.toLocaleString('en-IN')}</Numeric>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text variant="caption" color={colors.muted}>Pickups</Text>
            <Numeric size={20} color={colors.navy}>{pickupsCount}</Numeric>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text variant="caption" color={colors.muted}>Avg. per Order</Text>
            <Numeric size={20} color={colors.navy}>₹{avgPerOrder.toLocaleString('en-IN')}</Numeric>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historyHeader}>
          <Text variant="subheading">Transaction History</Text>
        </View>

        {completedOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="body" color={colors.muted} style={styles.emptyText as any}>
              No completed transactions found yet.
            </Text>
          </View>
        ) : (
          completedOrders.map((txn) => {
            const dateStr = new Date(txn.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
            const amount = txn.confirmedAmount || txn.estimatedAmount || 0;

            return (
              <View key={txn.orderId} style={styles.txnCard}>
                <View style={styles.txnTealBar} />
                <View style={styles.txnContent}>
                  <View style={styles.txnTop}>
                    <View>
                      <Numeric size={14} color={colors.navy}>{txn.orderNumber}</Numeric>
                      <Text variant="caption" color={colors.muted}>{dateStr}</Text>
                    </View>
                    <Numeric size={20} color={colors.teal}>₹{amount.toLocaleString('en-IN')}</Numeric>
                  </View>

                  <View style={styles.aggregatorRow}>
                    <Text variant="label" color={colors.slate}>
                      Paid by {txn.aggregatorName || 'Authorized Aggregator'}
                    </Text>
                  </View>

                  <View style={styles.materialsRow}>
                    {txn.materials.map((m: any) => (
                      <MaterialChip key={m} material={m} variant="chip" />
                    ))}
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.listFooter}>
          <Text variant="caption" color={colors.muted}>
            {completedOrders.length > 0 ? 'Viewing your complete transaction history' : ''}
          </Text>
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
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
