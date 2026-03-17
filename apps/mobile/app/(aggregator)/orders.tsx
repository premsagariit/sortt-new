import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { MaterialChip } from '../../components/ui/MaterialChip';
import { Avatar } from '../../components/ui/Avatar';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { Clock, Check, X, Lock, Package } from 'phosphor-react-native';
import { BaseCard, OrderStatus, MaterialCode } from '../../components/ui/Card';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { CancelOrderModal } from '../../components/domain/CancelOrderModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

type TabType = 'new' | 'active' | 'completed' | 'cancelled';

export default function AggregatorOrdersScreen() {
  const router = useRouter();
  const { newOrders, aggOrders, dismissNewOrder, acceptOrderApi, cancelOrder, fetchAggregatorOrders, error, isLoading } = useAggregatorStore();
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchAggregatorOrders();
    // Poll aggOrders silently every 30s — mirrors seller orders screen pattern
    // fetchAggregatorOrders(true) never sets isLoading=true so no spinner flash
    const poll = setInterval(() => fetchAggregatorOrders(true), 30_000);
    return () => clearInterval(poll);
  }, [fetchAggregatorOrders]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchAggregatorOrders(true);
    }, [fetchAggregatorOrders])
  );

  const getMaterialKey = (m: string | null) => m ? m.toLowerCase().replace('-', '') : null;
  const matKey = getMaterialKey(selectedMaterial);

  // ── New tab orders (from aggregator store) ─────────────────────
  const filteredNewOrders = newOrders.filter(
    o => !matKey || o.materials.includes(matKey as any)
  );

  // ── Active, completed, cancelled (from order store aggOrders) ────
  const activeOrders = (aggOrders || []).filter((o: any) =>
    ['accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(o.status) &&
    (!matKey || o.materials?.includes(matKey as any) || o.material_codes?.includes(matKey as any))
  ).map(mapStoreOrder);

  const completedOrders = (aggOrders || []).filter((o: any) => o.status === 'completed').map(mapStoreOrder);
  const cancelledOrders = (aggOrders || []).filter((o: any) => o.status === 'cancelled').map(mapStoreOrder);

  function mapStoreOrder(o: any) {
    return {
      id: o.orderId || o.id,
      orderNumber: o.orderNumber ?? o.order_display_id ?? `#${String(o.orderId || o.id || '').slice(0, 8).toUpperCase()}`,
      distance: '—',
      price: Number(o.orderAmount ?? o.display_amount ?? o.displayAmount ?? o.confirmed_total ?? o.confirmed_value ?? o.confirmedAmount ?? o.estimated_total ?? o.estimated_value ?? o.estimatedAmount ?? 0),
      locality: o.pickupLocality ?? o.pickup_locality,
      window: o.preferredPickupWindow?.type ?? o.preferred_pickup_window?.type ?? (o.createdAt || o.created_at ? new Date(o.createdAt ?? o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'),
      materials: (o.materials || o.material_codes || []) as MaterialCode[],
      sellerType: o.sellerType ?? o.seller_name ?? 'Seller',
      rating: o.rating ?? 4.5,
      status: o.status as OrderStatus,
    };
  }

  // ── Tab labels ─────────────────────────────────────────────────
  const TABS: { key: TabType; label: string }[] = [
    { key: 'new', label: 'New' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  // Material filters (New + Active tabs only)
  const materialFilters = ['All', 'Metal', 'Plastic', 'Paper', 'E-Waste', 'Glass'];

  const routeToExecutionStage = (order: ReturnType<typeof mapStoreOrder>) => {
    if (!order?.id) return;

    if (order.status === 'weighing_in_progress') {
      router.push({
        pathname: '/(aggregator)/execution/otp/[id]',
        params: { id: order.id },
      } as any);
      return;
    }

    if (order.status === 'arrived') {
      router.push(`/(aggregator)/execution/weighing/${order.id}` as any);
      return;
    }

    router.push({
      pathname: '/(aggregator)/execution/navigate',
      params: { id: order.id },
    } as any);
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => setActiveTab(tab.key)}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
        >
          <Text
            variant="label"
            numberOfLines={1}
            style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderFilters = () => {
    if (activeTab !== 'new' && activeTab !== 'active') return null;
    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {materialFilters.map((m) => (
            <Pressable
              key={m}
              onPress={() => setSelectedMaterial(m === 'All' ? null : m)}
              style={[
                styles.filterChip,
                (selectedMaterial === m || (m === 'All' && !selectedMaterial)) && styles.filterChipActive
              ]}
            >
              <Text
                variant="caption"
                style={[
                  styles.filterText,
                  (selectedMaterial === m || (m === 'All' && !selectedMaterial)) && styles.filterTextActive
                ]}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ── New order card ─────────────────────────────────────────────
  const renderNewOrderCard = (order: typeof newOrders[0]) => (
    <BaseCard key={order.id} style={styles.card}>
      <Pressable onPress={() => router.push({ pathname: '/(aggregator)/order/[id]', params: { id: order.id } } as any)}>
        <View style={[styles.cardTopBar, { backgroundColor: colors.red }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <View style={styles.rowLeft}>
              <Numeric size={13} color={colors.muted} style={styles.monoText}>{order.orderNumber}</Numeric>
              <View style={styles.dotSeparator} />
              <Lock size={12} color={colors.amber} weight="fill" />
              <Text variant="caption" color={colors.muted} style={{ marginLeft: 2 }}>{order.distanceKm ? order.distanceKm.toFixed(1) : '—'} km</Text>
            </View>
            <Numeric size={20} color={colors.amber} style={styles.priceText}>~₹{order.estimatedPrice}</Numeric>
          </View>

          <View style={styles.cardRow}>
            <Text variant="subheading" color={colors.navy} style={styles.localityText}>{order.locality}</Text>
            {order.isHighValue && (
              <View style={styles.highValueBadge}>
                <Text variant="caption" color={colors.teal} style={styles.highValueText}>High value</Text>
              </View>
            )}
          </View>

          <View style={[styles.cardRow, { marginTop: 0 }]}>
            <View style={styles.rowLeft}>
              <Clock size={14} color={colors.muted} />
              <Text variant="caption" color={colors.muted} style={{ marginLeft: 4 }}>{order.window}</Text>
            </View>
          </View>

          <View style={styles.materialsRow}>
            {order.materials.map((m) => (
              <MaterialChip key={m} material={m} variant="chip" />
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.sellerRow}>
            <View style={styles.sellerLeft}>
              <Avatar name={order.sellerType} userType="seller" size="sm" />
              <View>
                <Text variant="label" color={colors.navy}>{order.sellerType}</Text>
                <Text variant="caption" color={colors.muted}>Rated {order.rating}</Text>
              </View>
            </View>
            <View style={styles.newBadge}>
              <Text variant="caption" color={colors.teal} style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            <PrimaryButton
              label="Accept"
              style={styles.acceptBtn}
              textStyle={{ fontSize: 13 }}
              onPress={async () => {
                try {
                  await acceptOrderApi(order.id);
                  setActiveTab('active');
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Failed to accept order');
                }
              }}
            />
            <SecondaryButton
              label="Reject"
              style={[styles.chatBtn, { borderColor: colors.red }]}
              textStyle={{ color: colors.red }}
              onPress={() => dismissNewOrder(order.id)}
            />
          </View>
        </View>
      </Pressable>
    </BaseCard>
  );

  // ── Active/Completed/Cancelled order card ──────────────────────
  const renderOrderCard = (order: ReturnType<typeof mapStoreOrder>) => {
    const isActive = ['accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(order.status);
    const isHistorical = order.status === 'completed' || order.status === 'cancelled';

    const handleCardPress = () => {
      if (isHistorical) {
        router.push({ pathname: '/(aggregator)/order-history-detail', params: { id: order.id, status: order.status } });
      } else {
        routeToExecutionStage(order);
      }
    };
    return (
      <BaseCard key={order.id} style={styles.card}>
        <Pressable onPress={handleCardPress}>
          <View style={[styles.cardTopBar, {
            backgroundColor:
              order.status === 'completed' ? colors.teal :
                order.status === 'cancelled' ? colors.muted : colors.navy
          }]} />
          <View style={styles.cardContent}>
            <View style={styles.cardRow}>
              <View style={styles.rowLeft}>
                <Numeric size={13} color={colors.muted} style={styles.monoText}>{order.orderNumber}</Numeric>
                <View style={styles.dotSeparator} />
                <Text variant="caption" color={colors.muted}>{order.distance}</Text>
              </View>
              <Numeric size={20} color={colors.amber} style={styles.priceText}>₹{order.price}</Numeric>
            </View>

            <View style={styles.cardRow}>
              <Text variant="subheading" color={colors.navy} style={styles.localityText}>{order.locality}</Text>
              <View style={[styles.statusBadge, {
                backgroundColor: order.status === 'en_route' ? colors.amberLight :
                  order.status === 'completed' ? colors.tealLight : colors.border
              }]}>
                <Text variant="caption" style={{
                  color: order.status === 'en_route' ? colors.amber :
                    order.status === 'completed' ? colors.teal : colors.muted,
                  fontWeight: '700',
                  fontSize: 10,
                }}>
                  {order.status === 'en_route' ? 'On the Way' :
                    order.status === 'arrived' ? 'Arrived' :
                      order.status === 'completed' ? 'Done' :
                        order.status === 'cancelled' ? 'Cancelled' : 'Accepted'}
                </Text>
              </View>
            </View>

            <View style={[styles.cardRow, { marginTop: 0 }]}>
              <View style={styles.rowLeft}>
                <Clock size={14} color={colors.muted} />
                <Text variant="caption" color={colors.muted} style={{ marginLeft: 4 }}>{order.window}</Text>
              </View>
            </View>

            <View style={styles.materialsRow}>
              {order.materials.map((m: MaterialCode) => (
                <MaterialChip key={m} material={m} variant="chip" />
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.sellerRow}>
              <View style={styles.sellerLeft}>
                <Avatar name={order.sellerType} userType="seller" size="sm" />
                <View>
                  <Text variant="label" color={colors.navy}>{order.sellerType}</Text>
                  <Text variant="caption" color={colors.muted}>Rated {order.rating}</Text>
                </View>
              </View>
            </View>

            {isActive && (
              <View style={styles.actionRow}>
                <PrimaryButton
                  label={
                    order.status === 'weighing_in_progress'
                      ? 'Continue OTP'
                      : order.status === 'arrived'
                        ? 'Start Weighing'
                        : order.status === 'en_route'
                          ? 'Mark Arrived'
                          : 'Navigate'
                  }
                  style={styles.actionBtn}
                  onPress={() => routeToExecutionStage(order)}
                />
                <SecondaryButton
                  label="Cancel"
                  style={[styles.chatBtn, { borderColor: colors.red }]}
                  textStyle={{ color: colors.red }}
                  onPress={() => setCancelOrderId(order.id)}
                />
              </View>
            )}
          </View>
        </Pressable>
      </BaseCard>
    );
  };

  const renderEmptyState = (message: string) => (
    <EmptyState
      icon={<Package size={48} color={colors.muted} weight="thin" />}
      heading={message}
      body="Try again later or adjust filters."
    />
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Order Feed"/>

      <>
        {renderTabs()}
        {renderFilters()}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={[styles.errorContainer, isLoading && { opacity: 0.7 }]}>
            <Text variant="body" style={styles.errorText}>
              {error}
            </Text>
            <Pressable 
              onPress={isLoading ? undefined : () => fetchAggregatorOrders()} 
              disabled={isLoading}
              style={styles.retryButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text variant="caption" style={styles.retryText}>Retry</Text>
              )}
            </Pressable>
          </View>
        )}
        {isLoading && !error && newOrders.length === 0 && (aggOrders || []).length === 0 ? (
          <SkeletonLoader variant="card" height={240} />
        ) : activeTab === 'new' ? (
          filteredNewOrders.length > 0
            ? filteredNewOrders.map(renderNewOrderCard)
            : renderEmptyState('No new order requests')
        ) : activeTab === 'active' ? (
          activeOrders.length > 0
            ? activeOrders.map(renderOrderCard)
            : renderEmptyState('No active orders')
        ) : activeTab === 'completed' ? (
          completedOrders.length > 0
            ? completedOrders.map(renderOrderCard)
            : renderEmptyState('No completed orders yet')
        ) : (
          cancelledOrders.length > 0
            ? cancelledOrders.map(renderOrderCard)
            : renderEmptyState('No cancelled orders')
        )}
        </ScrollView>
      </>

      {/* ── Cancellation Reason Bottom Sheet ─────────────────────── */}
      {cancelOrderId && (
        <CancelOrderModal
          orderId={cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onConfirm={(reason: string) => {
            cancelOrder(cancelOrderId);
            setCancelOrderId(null);
            setActiveTab('cancelled');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: 4,
  },
  tabActive: { backgroundColor: colors.navy },
  tabText: { color: colors.muted, fontSize: 12 },
  tabTextActive: { color: '#FFFFFF', fontFamily: 'DMSans-SemiBold', fontSize: 12 },
  filterScroll: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 10 },
  filterChip: {
    height: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterText: { color: colors.slate, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF', fontFamily: 'DMSans-Bold' },
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: { padding: 0, overflow: 'hidden' },
  cardTopBar: { height: 2, backgroundColor: colors.border },
  cardContent: { padding: spacing.md },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  monoText: { fontFamily: 'DMMono-Regular', fontSize: 12 },
  priceText: { fontFamily: 'DMMono-Medium', fontSize: 18 },
  dotSeparator: { width: 2, height: 2, borderRadius: 1, backgroundColor: colors.border, marginHorizontal: 6 },
  localityText: { fontFamily: 'DMSans-Bold', fontSize: 15, flex: 1 },
  highValueBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.tealLight },
  highValueText: { fontFamily: 'DMSans-SemiBold', fontSize: 9 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  materialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  sellerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sellerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  newBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 9 },
  actionRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  acceptBtn: { flex: 2, height: 40, backgroundColor: colors.teal },
  actionBtn: { flex: 1, height: 40, backgroundColor: colors.navy },
  chatBtn: { flex: 1, height: 40 },
  carouselContainer: { height: 46 },
  emptyContent: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  errorContainer: { 
    padding: 16, 
    backgroundColor: colorExtended.redLight, 
    borderRadius: 8, 
    borderColor: colors.red, 
    borderWidth: 1, 
    marginBottom: 16 
  },
  errorText: { 
    color: colors.red, 
    textAlign: 'center' 
  },
  retryButton: { 
    marginTop: 8, 
    alignSelf: 'center', 
    backgroundColor: colors.red, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center'
  },
  retryText: { 
    color: colors.surface, 
    fontWeight: 'bold' 
  },
});
