import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { OrderCard, OrderStatus, MaterialCode } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ClipboardText, CaretRight } from 'phosphor-react-native';

const MOCK_SELLER_ORDERS = [
  { orderId: 'ORD-2841', status: 'en_route' as OrderStatus, materials: ['paper','metal'] as MaterialCode[],
    amount: 380, aggregator: 'Suresh Metals & More', date: 'Today, 11:02 AM' },
  { orderId: 'ORD-2809', status: 'completed' as OrderStatus, materials: ['plastic'] as MaterialCode[],
    amount: 210, aggregator: 'Raju Scrap Works',     date: '25 Feb 2026' },
  { orderId: 'ORD-2790', status: 'completed' as OrderStatus, materials: ['ewaste'] as MaterialCode[],
    amount: 990, aggregator: 'Suresh Metals & More', date: '22 Feb 2026' },
  { orderId: 'ORD-2751', status: 'cancelled' as OrderStatus, materials: ['fabric','paper'] as MaterialCode[],
    amount: 0,   aggregator: '—',                    date: '18 Feb 2026' },
  { orderId: 'ORD-2730', status: 'completed' as OrderStatus, materials: ['metal','glass'] as MaterialCode[],
    amount: 640, aggregator: 'Raju Scrap Works',     date: '14 Feb 2026' },
];

const FILTERS = ['All', 'Active', 'Completed', 'Cancelled'] as const;
type FilterType = typeof FILTERS[number];

export default function SellerOrdersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('Active');
  const { tab } = useLocalSearchParams();

  useEffect(() => {
    if (tab && FILTERS.includes(tab as FilterType)) {
      setActiveFilter(tab as FilterType);
    }
  }, [tab]);

  // Derive filtered list
  const displayOrders = MOCK_SELLER_ORDERS.filter(order => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Active') return ['created', 'accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(order.status);
    if (activeFilter === 'Completed') return order.status === 'completed';
    if (activeFilter === 'Cancelled') return order.status === 'cancelled';
    return true;
  });

  // Check if any order is active for the banner
  const hasActiveOrder = MOCK_SELLER_ORDERS.some(o => o.status === 'en_route' || o.status === 'accepted');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <NavBar 
        variant="light"
        title="My Orders"
      />

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

      {/* Active Banner */}
      {hasActiveOrder && (
        <Pressable 
          style={styles.activeBanner}
          onPress={() => {
            const firstActive = MOCK_SELLER_ORDERS.find(o => ['en_route', 'accepted', 'arrived', 'weighing_in_progress'].includes(o.status));
            if (firstActive) {
              router.push(`/(shared)/order/${firstActive.orderId}` as any);
            }
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Track active order"
        >
          <View>
            <Text variant="label" style={{ color: colors.amber, fontWeight: '700' } as any}>
              1 active pickup in progress
            </Text>
            <Text variant="caption" color={colors.muted} style={{ marginTop: 2 } as any}>
              Tap to track
            </Text>
          </View>
          <CaretRight size={16} color={colors.muted} />
        </Pressable>
      )}

      {/* Order List */}
      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={[
          styles.listContent,
          displayOrders.length === 0 && styles.listEmpty
        ]}
      >
        {displayOrders.length > 0 ? (
          displayOrders.map(order => (
            <Pressable
              key={order.orderId}
              onPress={() => router.push(`/(shared)/order/${order.orderId}` as any)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Order ${order.orderId}, status ${order.status}`}
            >
              <OrderCard
                orderId={order.orderId}
                status={order.status}
                materials={order.materials}
                amountRupees={order.amount}
                aggregator={order.aggregator}
                date={order.date}
              />
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon={<ClipboardText size={48} color={colors.border} weight="thin" />}
            heading="No orders yet"
            body="Your pickup history will appear here."
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
    height: 56, // Fixed height for the filter strip
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    height:            48,  // Fix 6: removed height:32 — was confusingly coexisting with minHeight:48
    paddingHorizontal: 16,
    borderRadius:      16,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
    justifyContent:    'center',
    alignItems:        'center',
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
    backgroundColor: colorExtended.amberLight, // Fix 6: was '#FEF9EC' (hardcoded hex — MEMORY.md §2 violation)
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
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