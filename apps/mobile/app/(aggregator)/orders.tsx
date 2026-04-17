import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { MaterialChip } from '../../components/ui/MaterialChip';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { Clock, Lock, Package } from 'phosphor-react-native';
import { BaseCard, OrderStatus, MaterialCode } from '../../components/ui/Card';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { CancelOrderModal } from '../../components/domain/CancelOrderModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { openExternalDirections } from '../../utils/mapNavigation';
import { useI18n } from '../../hooks/useI18n';

type TabType = 'new' | 'active' | 'completed' | 'cancelled';

const normalizeDisputeStatus = (value: unknown): 'open' | 'resolved' | 'dismissed' | null => {
  if (typeof value !== 'string') return null;
  const status = value.trim().toLowerCase();
  if (status === 'closed') return 'resolved';
  if (status === 'open' || status === 'resolved' || status === 'dismissed') return status;
  return null;
};

const isOpenDisputeOrder = (order: any) =>
  order?.status === 'disputed' && normalizeDisputeStatus(order?.dispute_status ?? order?.disputeStatus) === 'open';

const isResolvedDisputeOrder = (order: any) =>
  order?.status === 'disputed' && ['resolved', 'dismissed'].includes(normalizeDisputeStatus(order?.dispute_status ?? order?.disputeStatus) || '');

export default function AggregatorOrdersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { newOrders, aggOrders, dismissFeedOrderApi, acceptOrderApi, fetchAggregatorOrders, error, isLoading } = useAggregatorStore();
  const materials = useAggregatorStore((s) => s.materials);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        setCurrentLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const getMaterialKey = (m: string | null) => m ? m.toLowerCase().replace('-', '') : null;
  const matKey = getMaterialKey(selectedMaterial);

  // ── New tab orders (from aggregator store) — latest created first ─
  const filteredNewOrders = useMemo(() =>
    [...newOrders]
      .filter(o => !matKey || o.materials.includes(matKey as any))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [newOrders, matKey]
  );

  // ── Active, completed, cancelled (from order store aggOrders) ────
  const activeOrders = useMemo(() =>
    (aggOrders || [])
      .filter((o: any) =>
        (
          ['accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(o.status) ||
          isOpenDisputeOrder(o)
        ) &&
        (!matKey || o.materials?.includes(matKey as any) || o.material_codes?.includes(matKey as any))
      )
      .map((o) => mapStoreOrder(o, materials))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [aggOrders, materials, matKey]
  );

  const completedOrders = useMemo(() =>
    (aggOrders || [])
      .filter((o: any) => o.status === 'completed' || isResolvedDisputeOrder(o))
      .map((o) => mapStoreOrder(o, materials))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [aggOrders, materials]
  );

  const cancelledOrders = useMemo(() =>
    (aggOrders || [])
      .filter((o: any) => o.status === 'cancelled')
      .map((o) => mapStoreOrder(o, materials))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [aggOrders, materials]
  );

  function mapStoreOrder(o: any, mats: typeof materials) {
    const rawPrice = Number(o.orderAmount ?? o.display_amount ?? o.displayAmount ?? o.confirmed_total ?? o.confirmed_value ?? o.confirmedAmount ?? o.estimated_total ?? o.estimated_value ?? o.estimatedAmount ?? 0);
    const weights: Record<string, number> = o.estimated_weights ?? o.estimatedWeights ?? {};
    const price = rawPrice > 0 ? rawPrice : mats.reduce((sum, mat) => sum + (Number(weights[mat.id] ?? 0) * mat.ratePerKg), 0);
    const pickupLat = typeof o.pickupLat === 'number' ? o.pickupLat : (typeof o.pickup_lat === 'number' ? o.pickup_lat : null);
    const pickupLng = typeof o.pickupLng === 'number' ? o.pickupLng : (typeof o.pickup_lng === 'number' ? o.pickup_lng : null);

    const distanceText = (() => {
      if (currentLocation && typeof pickupLat === 'number' && typeof pickupLng === 'number') {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const earthRadiusKm = 6371;
        const deltaLat = toRad(pickupLat - currentLocation.latitude);
        const deltaLng = toRad(pickupLng - currentLocation.longitude);
        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(toRad(currentLocation.latitude)) * Math.cos(toRad(pickupLat)) *
          Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return `${(earthRadiusKm * c).toFixed(1)} km`;
      }

      if (typeof o.distance_km === 'number') {
        return `${o.distance_km.toFixed(1)} km`;
      }

      return '—';
    })();

    return {
      id: o.orderId || o.id,
      orderNumber: o.orderNumber ?? o.order_display_id ?? `#${String(o.orderId || o.id || '').slice(0, 8).toUpperCase()}`,
      distance: distanceText,
      pickupLat,
      pickupLng,
      price,
      locality: o.pickupLocality ?? o.pickup_locality,
      window: o.preferredPickupWindow?.type ?? o.preferred_pickup_window?.type ?? (o.createdAt || o.created_at ? new Date(o.createdAt ?? o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : t('Flexible')),
      materials: (o.materials || o.material_codes || []) as MaterialCode[],
      sellerType: o.sellerType ?? o.seller_name ?? 'Seller',
      rating: Number.isFinite(Number(o.rating)) && Number(o.rating) > 0 ? Number(o.rating) : 0,
      status: o.status as OrderStatus,
      disputeStatus: normalizeDisputeStatus(o.dispute_status ?? o.disputeStatus),
      createdAt: String(o.createdAt ?? o.created_at ?? ''),
      updatedAt: String(o.updatedAt ?? o.updated_at ?? ''),
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
                  {t(tab.label)}
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
                {t(m)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ── New order card ─────────────────────────────────────────────
  const renderNewOrderCard = (order: typeof newOrders[0]) => {
    const displayPrice = order.estimatedPrice > 0
      ? order.estimatedPrice
      : materials.reduce((sum, mat) => sum + (Number(order.estimatedWeights?.[mat.id] ?? 0) * mat.ratePerKg), 0);
    return (
    <BaseCard key={order.id} style={styles.card}>
      <Pressable onPress={() => router.push({ pathname: '/(aggregator)/order/[id]', params: { id: order.id } } as any)}>
        <View style={[styles.cardTopBar, { backgroundColor: colors.red }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <View style={styles.rowLeft}>
              <Text variant="subheading" color={colors.navy} style={styles.orderNumberText}>{order.orderNumber}</Text>
              <Lock size={12} color={colors.amber} weight="fill" />
              <Text variant="caption" color={colors.muted} style={{ marginLeft: 2 }}>{order.distanceKm ? order.distanceKm.toFixed(1) : '—'} km</Text>
            </View>
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
              onPress={async () => {
                try {
                  await dismissFeedOrderApi(order.id);
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'Failed to reject order');
                }
              }}
            />
          </View>
        </View>
      </Pressable>
    </BaseCard>
  );
  };

  // ── Active/Completed/Cancelled order card ──────────────────────
  const renderOrderCard = (order: ReturnType<typeof mapStoreOrder>) => {
    const isExecutionActive = ['accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(order.status);
    const isDisputed = order.status === 'disputed';

    const handleCardPress = () => {
      if (isExecutionActive) {
        router.push({ pathname: '/(aggregator)/active-order-detail', params: { id: order.id } } as any);
        return;
      }

      if (isDisputed || order.status === 'completed') {
        router.push({ pathname: '/(aggregator)/execution/receipt/[id]', params: { id: order.id } } as any);
        return;
      }

      if (order.status === 'cancelled') {
        router.push({ pathname: '/(aggregator)/order-history-detail', params: { id: order.id, status: order.status } });
      } else {
        routeToExecutionStage(order);
      }
    };

    const openNativeNavigationFromCard = async () => {
      if (
        currentLocation &&
        typeof order.pickupLat === 'number' &&
        typeof order.pickupLng === 'number'
      ) {
        await openExternalDirections({
          origin: currentLocation,
          destination: {
            latitude: order.pickupLat,
            longitude: order.pickupLng,
          },
          errorTitle: 'Unable to open navigation',
          errorBody: 'No compatible maps app was found on this device.',
        });
        return;
      }

      // Fallback to route screen if precise coordinates are not available here.
      routeToExecutionStage(order);
    };
    return (
      <BaseCard key={order.id} style={styles.card}>
        <Pressable onPress={handleCardPress}>
          <View style={[styles.cardTopBar, {
            backgroundColor:
              order.status === 'completed' ? colors.teal :
                  order.status === 'disputed' ? colors.red :
                order.status === 'cancelled' ? colors.muted : colors.navy
          }]} />
          <View style={styles.cardContent}>
            <View style={styles.cardRow}>
              <View style={styles.rowLeft}>
                <Text variant="subheading" color={colors.navy} style={styles.orderNumberText}>{order.orderNumber}</Text>
                <Text variant="caption" color={colors.muted}>{order.distance}</Text>
              </View>
              {order.status === 'completed' && (
                <Numeric size={20} color={colors.amber} style={styles.priceText}>₹{order.price}</Numeric>
              )}
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
                  {order.status === 'en_route' ? t('On the Way') :
                    order.status === 'arrived' ? t('Arrived') :
                      order.status === 'disputed' ? t('Disputed') :
                      order.status === 'completed' ? t('Completed') :
                        order.status === 'cancelled' ? t('Cancelled') : t('Accepted')}
                </Text>
              </View>
            </View>
            {order.disputeStatus ? (
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.disputeStatusChip,
                    order.disputeStatus === 'open'
                      ? styles.disputeStatusChipOpen
                      : order.disputeStatus === 'resolved'
                        ? styles.disputeStatusChipResolved
                        : styles.disputeStatusChipDismissed,
                  ]}
                >
                  <Text
                    variant="caption"
                    style={[
                      styles.disputeStatusText,
                      order.disputeStatus === 'open'
                        ? styles.disputeStatusTextOpen
                        : order.disputeStatus === 'resolved'
                          ? styles.disputeStatusTextResolved
                          : styles.disputeStatusTextDismissed,
                    ] as any}
                  >
                    {order.disputeStatus === 'open'
                      ? t('Dispute Open')
                      : order.disputeStatus === 'resolved'
                        ? t('Dispute Resolved')
                        : t('Dispute Dismissed')}
                  </Text>
                </View>
              </View>
            ) : null}

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

            {isExecutionActive && (
              <View style={styles.actionRow}>
                <PrimaryButton
                  label={
                    order.status === 'weighing_in_progress'
                      ? t('Continue OTP')
                      : order.status === 'arrived'
                        ? t('Start Weighing')
                        : order.status === 'en_route'
                          ? t('Mark Arrived')
                          : t('Navigate')
                  }
                  style={styles.actionBtn}
                  onPress={() => {
                    if (order.status === 'accepted') {
                      void openNativeNavigationFromCard();
                      return;
                    }
                    routeToExecutionStage(order);
                  }}
                />
                <SecondaryButton
                  label={t('Cancel')}
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

  const activeTabItemCount =
    activeTab === 'new'
      ? filteredNewOrders.length
      : activeTab === 'active'
        ? activeOrders.length
        : activeTab === 'completed'
          ? completedOrders.length
          : cancelledOrders.length;

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyStateWrap}>
      <EmptyState
        icon={<Package size={48} color={colors.muted} weight="thin" />}
        heading={message}
        body={t('Try again later or adjust filters.')}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title={t('Order Feed')}/>

      <>
        {renderTabs()}
        {renderFilters()}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            !isLoading && !error && activeTabItemCount === 0 && styles.scrollContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        >
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
                <Text variant="caption" style={styles.retryText}>{t('Retry')}</Text>
              )}
            </Pressable>
          </View>
        )}
        {isLoading && !error && newOrders.length === 0 && (aggOrders || []).length === 0 ? (
          <SkeletonLoader variant="card" height={240} />
        ) : activeTab === 'new' ? (
          filteredNewOrders.length > 0
            ? filteredNewOrders.map(renderNewOrderCard)
            : renderEmptyState(t('No new order requests'))
        ) : activeTab === 'active' ? (
          activeOrders.length > 0
            ? activeOrders.map(renderOrderCard)
            : renderEmptyState(t('No active orders'))
        ) : activeTab === 'completed' ? (
          completedOrders.length > 0
            ? completedOrders.map(renderOrderCard)
            : renderEmptyState(t('No completed orders yet'))
        ) : (
          cancelledOrders.length > 0
            ? cancelledOrders.map(renderOrderCard)
            : renderEmptyState(t('No cancelled orders'))
        )}
        </ScrollView>
      </>

      {/* ── Cancellation Reason Bottom Sheet ─────────────────────── */}
      {cancelOrderId && (
        <CancelOrderModal
          orderId={cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onConfirm={() => {
            // CancelOrderModal already called DELETE /api/orders/:id successfully.
            // Just update UI state: dismiss modal, switch to Cancelled tab, refresh orders.
            setCancelOrderId(null);
            setActiveTab('cancelled');
            // Trigger background re-fetch so aggOrders updates with cancelled status
            void fetchAggregatorOrders(true);
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
  scrollContentEmpty: { flexGrow: 1 },
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
  orderNumberText: { fontFamily: 'DMSans-Bold', fontSize: 17, marginRight: spacing.xs },
  priceText: { fontFamily: 'DMMono-Medium', fontSize: 18 },
  localityText: { fontFamily: 'DMSans-Bold', fontSize: 15, flex: 1 },
  highValueBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.tealLight },
  highValueText: { fontFamily: 'DMSans-SemiBold', fontSize: 9 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  disputeStatusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  disputeStatusChipOpen: {
    backgroundColor: `${colors.red}12`,
    borderColor: `${colors.red}40`,
  },
  disputeStatusChipResolved: {
    backgroundColor: `${colors.teal}12`,
    borderColor: `${colors.teal}40`,
  },
  disputeStatusChipDismissed: {
    backgroundColor: `${colors.muted}1A`,
    borderColor: `${colors.muted}4D`,
  },
  disputeStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disputeStatusTextOpen: {
    color: colors.red,
  },
  disputeStatusTextResolved: {
    color: colors.teal,
  },
  disputeStatusTextDismissed: {
    color: colors.muted,
  },
  materialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  actionRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  acceptBtn: { flex: 1, height: 40, backgroundColor: colors.teal },
  actionBtn: { flex: 1, height: 40, backgroundColor: colors.navy },
  chatBtn: { flex: 1, height: 40 },
  carouselContainer: { height: 46 },
  emptyStateWrap: { flex: 1, justifyContent: 'center' },
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
