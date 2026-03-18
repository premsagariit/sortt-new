import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { OrderCard, OrderStatus, MaterialCode } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ClipboardText, CaretRight, WarningCircle, ArrowClockwise } from 'phosphor-react-native';
import { getOrderDisplayAmount, useOrderStore } from '../../store/orderStore';
import { api } from '../../lib/api';

const FILTERS = ['All', 'Active', 'Completed', 'Cancelled'] as const;
type FilterType = typeof FILTERS[number];

const ACTIVE_STATUSES: OrderStatus[] = ['created', 'accepted', 'en_route', 'arrived', 'weighing_in_progress'];

// Simple animated skeleton row
function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={[styles.skeletonBlock, { width: 80, height: 14, marginBottom: 8 }]} />
      <View style={[styles.skeletonBlock, { width: '60%', height: 12 }]} />
    </View>
  );
}

export default function SellerOrdersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('Active');
  const { tab } = useLocalSearchParams();

  const orders = useOrderStore((s) => s.orders);
  const isLoading = useOrderStore((s) => s.isLoading);
  const error = useOrderStore((s) => s.error);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const cancelOrder = useOrderStore((s) => s.cancelOrder);

  const [rates, setRates] = useState<any[]>([]);

  // Deep-link: open to a specific tab via ?tab=Completed etc.
  useEffect(() => {
    if (tab && FILTERS.includes(tab as FilterType)) {
      setActiveFilter(tab as FilterType);
    }
  }, [tab]);

  // Fetch on mount + auto-refresh
  useEffect(() => {
    console.log('[SellerOrders] Component mounted, fetching orders...');
    fetchOrders().then(() => console.log('[SellerOrders] Initial fetch completed'));
    api.get('/api/rates').then(res => setRates(res.data.rates || [])).catch(() => {});

    // Polling every 30s
    const poll = setInterval(() => {
      fetchOrders(true);
      api.get('/api/rates').then(res => setRates(res.data.rates || [])).catch(() => {});
    }, 30_000);

    return () => clearInterval(poll);
  }, [fetchOrders]);

  const handleRetry = useCallback(() => { fetchOrders(); }, [fetchOrders]);

  const handleCancel = useCallback(async (orderId: string) => {
    try {
      await cancelOrder(orderId);
    } catch {
      // error already set in store; UI will surface it
    }
  }, [cancelOrder]);

  const showInitialSkeleton = isLoading && orders.length === 0;

  // Filter + sort client-side from store (stable: only reruns when orders or filter changes)
  const displayOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Active') return ACTIVE_STATUSES.includes(order.status);
      if (activeFilter === 'Completed') return order.status === 'completed';
      if (activeFilter === 'Cancelled') return order.status === 'cancelled';
      return true;
    });
    // Latest first: completed/cancelled use updatedAt (≈ completion/cancellation time);
    // all others use createdAt for a stable, non-repositioning sort
    return [...filtered].sort((a, b) => {
      const useUpdated = activeFilter === 'Completed' || activeFilter === 'Cancelled';
      const tA = useUpdated ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
      const tB = useUpdated ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
      return tB - tA;
    });
  }, [orders, activeFilter]);

  const activeOrders = useMemo(() => orders.filter(o => ACTIVE_STATUSES.includes(o.status)), [orders]);
  const hasActiveOrder = activeOrders.length > 0;
  const firstActive = activeOrders[0];

  const calculateEstimate = useCallback((order: any) => {
    // For weighing_in_progress and completed: show the aggregator's confirmed value
    if (['weighing_in_progress', 'completed'].includes(order?.status)) {
      if (typeof order?.confirmedTotal === 'number' && Number.isFinite(order.confirmedTotal) && order.confirmedTotal > 0) return order.confirmedTotal;
      if (typeof order?.confirmed_amount === 'number' && Number.isFinite(order.confirmed_amount) && order.confirmed_amount > 0) return order.confirmed_amount;
      if (typeof order?.confirmedAmount === 'number' && Number.isFinite(order.confirmedAmount) && order.confirmedAmount > 0) return order.confirmedAmount;
      // Compute from orderItems preserved in the store from a previous detail fetch
      if (Array.isArray(order?.orderItems) && order.orderItems.length > 0) {
        const fromItems = order.orderItems.reduce((sum: number, item: any) => {
          const w = Number(item.confirmedWeightKg ?? item.estimatedWeightKg ?? 0);
          const r = Number(item.ratePerKg ?? 0);
          return sum + w * r;
        }, 0);
        if (fromItems > 0) return fromItems;
      }
    }
    if (typeof order?.estimatedTotal === 'number' && Number.isFinite(order.estimatedTotal) && order.estimatedTotal > 0) return order.estimatedTotal;
    if (typeof order?.estimated_total === 'number' && Number.isFinite(order.estimated_total) && order.estimated_total > 0) return order.estimated_total;
    const fromDisplay = getOrderDisplayAmount(order);
    if (fromDisplay > 0) return fromDisplay;
    // Fallback: compute from live market rates × per-material estimated weights
    const weights: Record<string, number> = order?.estimatedWeights ?? {};
    return rates.reduce((sum, r) => sum + (Number(weights[r.material_code] ?? 0) * Number(r.rate_per_kg ?? 0)), 0);
  }, [rates]);

  // Format date string from ISO
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <NavBar variant="light" title="My Orders" />

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveFilter(filter)}
                accessible
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  variant="caption"
                  style={[styles.chipText, isActive && styles.chipTextActive] as any}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Order Banner */}
      {hasActiveOrder && firstActive && (
        <Pressable
          style={styles.activeBanner}
          onPress={() => router.push(`/(seller)/order/${firstActive.orderId}` as any)}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Track active order"
        >
          <View>
            <Text variant="label" style={{ color: colors.amber, fontWeight: '700' } as any}>
              {activeOrders.length} active order{activeOrders.length > 1 ? 's' : ''} for pickup
            </Text>
            <Text variant="caption" color={colors.muted} style={{ marginTop: 2 } as any}>
              Tap to track
            </Text>
          </View>
          <CaretRight size={16} color={colors.muted} />
        </Pressable>
      )}

      {/* Error Banner with Retry */}
      {(error && typeof error === 'string') && (
        <Pressable
          style={[styles.errorBanner, isLoading && { opacity: 0.7 }]}
          onPress={isLoading ? undefined : handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading orders"
          disabled={isLoading}
        >
          <WarningCircle size={16} color={colors.red} />
          <Text variant="caption" style={styles.errorText as any}>
            {error}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.red} />
          ) : (
            <ArrowClockwise size={16} color={colors.red} />
          )}
        </Pressable>
      )}

      {/* Order List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[
          styles.listContent,
          !showInitialSkeleton && displayOrders.length === 0 && styles.listEmpty,
        ]}
      >
        {showInitialSkeleton ? (
          // Skeleton loading state — 3 rows
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : displayOrders.length > 0 ? (
          displayOrders.map(order => (
            <Pressable
              key={order.orderId}
              onPress={() => router.push(
                order.status === 'completed'
                  ? (`/(seller)/order/receipt/${order.orderId}` as any)
                  : (`/(seller)/order/${order.orderId}` as any)
              )}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Order ${order.orderId}, status ${order.status}`}
            >
              <OrderCard
                orderId={order.orderId}
                orderNumber={order.orderNumber}
                status={order.status}
                materials={order.materials}
                amountRupees={calculateEstimate(order)}
                aggregator={order.aggregatorName || 'Aggregator'}
                date={formatDate(order.createdAt)}
              />
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon={<ClipboardText size={48} color={colors.border} weight="thin" />}
            heading={activeFilter === 'All' ? 'No orders yet' : `No ${activeFilter.toLowerCase()} orders`}
            body={activeFilter === 'All'
              ? 'Your pickup history will appear here.'
              : `You have no ${activeFilter.toLowerCase()} pickups right now.`
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 56,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    color: colors.slate,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.surface,
  },
  activeBanner: {
    borderRadius: 12,
    marginTop: 8,
    marginHorizontal: spacing.md,
    backgroundColor: colorExtended.amberLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.redLight,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
  },
  errorText: {
    flex: 1,
    color: colors.red,
  },
  skeletonRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  skeletonBlock: {
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
});