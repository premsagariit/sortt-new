import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { colors, spacing, radius } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { BaseCard } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/Button';
import { Globe, Lock, MapPin, Clock, Hash, NavigationArrow } from 'phosphor-react-native';
import { getOrderDisplayAmount, useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { ContactCard } from '../../../components/order/ContactCard';
import { safeBack } from '../../../utils/navigation';
import { Alert } from 'react-native';
import { api } from '../../../lib/api';

export default function AggregatorOrderByIdScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { orders, fetchOrder, refreshAggregatorOrder } = useOrderStore();
  const storeOrder = orders.find((o) => o.orderId === id);

  const newOrders = useAggregatorStore((s) => s.newOrders);
  const materialsCfg = useAggregatorStore((s) => s.materials);
  const acceptOrderApi = useAggregatorStore((s) => s.acceptOrderApi);
  const dismissNewOrder = useAggregatorStore((s) => s.dismissNewOrder);

  const aggUserId = useAuthStore((s: any) => s.userId);
  const chatUnread = useChatStore((state) => {
    if (!aggUserId || !id) return 0;
    return (state.messages[id] ?? []).filter(m => m.senderId !== aggUserId && !m.read).length;
  });

  const [rates, setRates] = useState<any[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const feedOrder = newOrders.find((o) => o.id === id);

  useEffect(() => {
    if (id) {
      fetchOrder(id, true);
      api.get('/api/aggregators/me/rates').then((res) => {
        setRates(Array.isArray(res.data) ? res.data : (res.data?.rates || []));
      }).catch(() => {
        api.get('/api/rates').then((res) => setRates(res.data.rates || [])).catch(() => {});
      });
    }
  }, [id, fetchOrder]);

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

  const internalOrderId = storeOrder?.orderId ?? id ?? '';
  const displayOrderNumber = storeOrder?.orderNumber ?? feedOrder?.orderNumber ?? `#${String(internalOrderId).slice(0, 8).toUpperCase()}`;

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rates) {
      map.set(String(r.material_code).toLowerCase().replace(/[-_]/g, ''), Number(r.rate_per_kg || 0));
    }
    return map;
  }, [rates]);

  const yourRateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materialsCfg) {
      map.set(String(m.id).toLowerCase().replace(/[-_]/g, ''), Number(m.ratePerKg || 0));
    }
    return map;
  }, [materialsCfg]);

  const items = useMemo(() => {
    const itemRows = Array.isArray(storeOrder?.orderItems)
      ? storeOrder.orderItems.map((item) => {
          const normalized = String(item.materialCode || '').toLowerCase().replace(/[-_]/g, '');
          const ownRate = Number(
            (typeof item.ratePerKg === 'number' ? item.ratePerKg : null)
            ?? rateMap.get(normalized)
            ?? yourRateMap.get(normalized)
            ?? 0
          );
          const estWeight = typeof item.estimatedWeightKg === 'number' ? item.estimatedWeightKg : 0;
          return {
            materialCode: item.materialCode,
            material: item.materialLabel || item.materialCode,
            weight: estWeight,
            yourRate: ownRate > 0 ? ownRate : null,
            lineTotal: ownRate > 0 && estWeight > 0 ? ownRate * estWeight : 0,
          };
        })
      : [];

    if (itemRows.length > 0) return itemRows;

    const weights = storeOrder?.estimatedWeights || {};
    const rows = Object.entries(weights).map(([materialCode, weight]) => {
      const normalized = materialCode.toLowerCase().replace(/[-_]/g, '');
      const ownRate = Number(rateMap.get(normalized) ?? yourRateMap.get(normalized) ?? 0);
      return {
        materialCode,
        material: materialCode.charAt(0).toUpperCase() + materialCode.slice(1),
        weight: Number(weight) || 0,
        yourRate: ownRate > 0 ? ownRate : null,
        lineTotal: ownRate > 0 ? (Number(weight) || 0) * ownRate : 0,
      };
    });

    if (rows.length > 0) return rows;

    return (feedOrder?.materials || []).map((materialCode) => {
      const normalized = materialCode.toLowerCase().replace(/[-_]/g, '');
      const ownRate = Number(rateMap.get(normalized) ?? yourRateMap.get(normalized) ?? 0);
      return {
        materialCode,
        material: materialCode.charAt(0).toUpperCase() + materialCode.slice(1),
        weight: 0,
        yourRate: ownRate > 0 ? ownRate : null,
        lineTotal: 0,
      };
    });
  }, [storeOrder?.orderItems, storeOrder?.estimatedWeights, feedOrder?.materials, rateMap, yourRateMap]);

  const totalEst = useMemo(() => {
    const computed = items.reduce((sum, item) => {
      if (typeof item.weight === 'number' && typeof item.yourRate === 'number') {
        return sum + (item.weight * item.yourRate);
      }
      return sum;
    }, 0);
    if (computed > 0) return computed;
    if (typeof storeOrder?.estimatedTotal === 'number' && storeOrder.estimatedTotal > 0) return storeOrder.estimatedTotal;
    if (storeOrder) {
      const canonical = getOrderDisplayAmount(storeOrder as any);
      if (canonical > 0) return canonical;
    }
    if (storeOrder?.estimatedAmount && storeOrder.estimatedAmount > 0) return storeOrder.estimatedAmount;
    if (feedOrder?.estimatedPrice && feedOrder.estimatedPrice > 0) return feedOrder.estimatedPrice;
    return 0;
  }, [items, storeOrder, storeOrder?.estimatedAmount, feedOrder?.estimatedPrice]);

  const orderDistance = useMemo(() => {
    const pickupLat = storeOrder?.pickupLat;
    const pickupLng = storeOrder?.pickupLng;

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

    if (typeof feedOrder?.distanceKm === 'number' && feedOrder.distanceKm > 0) {
      return `${feedOrder.distanceKm.toFixed(1)} km`;
    }

    if (typeof storeOrder?.liveDistanceKm === 'number' && storeOrder.liveDistanceKm > 0) {
      return `${storeOrder.liveDistanceKm.toFixed(1)} km`;
    }

    return '—';
  }, [currentLocation, storeOrder?.pickupLat, storeOrder?.pickupLng, storeOrder?.liveDistanceKm, feedOrder?.distanceKm]);
  const orderLocality = storeOrder?.pickupLocality ?? feedOrder?.locality ?? '—';
  const orderWindow = storeOrder?.window
    ?? feedOrder?.window
    ?? (storeOrder?.createdAt
      ? new Date(storeOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Flexible');

  if (!storeOrder && !feedOrder) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <NavBar title="Order Details" variant="light" onBack={() => safeBack('/(aggregator)/orders')} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.navy} />
          <Text variant="caption" color={colors.muted} style={{ marginTop: 8 }}>Loading order details…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <NavBar
        title="Order Details"
        variant="light"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Hash size={16} color={colors.muted} />
            <Text variant="label" color={colors.navy} style={styles.summaryText}>
              {displayOrderNumber}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <NavigationArrow size={16} color={colors.muted} weight="fill" />
            <Text variant="label" color={colors.navy} style={styles.summaryText}>
              {orderDistance} away
            </Text>
          </View>
          {totalEst > 0 && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text variant="label" style={[styles.summaryText, { color: colors.amber }]}>
                  ~₹{totalEst.toLocaleString('en-IN')}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.content}>
          {/* BLOCK: Show seller contact card post-acceptance */}
          {storeOrder && !['created', 'cancelled'].includes(storeOrder.status) && (
            <View style={{ marginBottom: spacing.md }}>
              <ContactCard
                name={storeOrder.sellerName || 'Seller'}
                phone={storeOrder.sellerPhone || null}
                role="Seller"
                userType="seller"
                onChat={storeOrder.sellerId ? () => router.push(`/(shared)/chat/${storeOrder.orderId}` as any) : undefined}
                unreadCount={chatUnread}
              />
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text variant="label" color={colors.muted} style={styles.sectionTitle}>
              MATERIALS LIST
            </Text>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text variant="caption" style={[styles.col, styles.colMaterial]}>MATERIAL</Text>
              <Text variant="caption" style={[styles.col, styles.colWeight]}>~WT</Text>
              <Text variant="caption" style={[styles.col, styles.colRate]}>YOUR RATE</Text>
            </View>
            {items.map((item, idx) => (
              <View key={`${item.material}-${idx}`} style={[styles.tableRow, idx === items.length - 1 && { borderBottomWidth: 0 }]}>
                <Text variant="label" color={colors.navy} style={[styles.col, styles.colMaterial]}>{item.material}</Text>
                <Numeric size={13} style={[styles.col, styles.colWeight, { color: item.weight > 0 ? colors.slate : colors.muted }]}>
                  {item.weight > 0 ? `${item.weight} kg` : '—'}
                </Numeric>
                <Numeric size={13} style={[styles.col, styles.colRate, { color: item.yourRate ? colors.teal : colors.muted }]}>
                  {item.yourRate ? `₹${item.yourRate}/kg` : '—'}
                </Numeric>
              </View>
            ))}
            {totalEst > 0 && (
              <View style={styles.tableTotalRow}>
                <Text variant="label" style={styles.tableTotalLabel}>Est. Value</Text>
                <Numeric size={15} style={styles.tableTotalValue}>
                  ₹{totalEst.toLocaleString('en-IN')}
                </Numeric>
              </View>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text variant="label" color={colors.muted} style={styles.sectionTitle}>
              PICKUP LOCATION
            </Text>
          </View>

          <BaseCard style={styles.locationCard}>
            <View style={styles.locationContent}>
              <View style={styles.locationInfo}>
                <View style={styles.localityHeader}>
                  <MapPin size={18} color={colors.red} weight="fill" />
                  <Text variant="subheading" color={colors.navy} style={styles.localityText}>
                    {orderLocality}
                  </Text>
                </View>
                <View style={styles.windowInfo}>
                  <Clock size={14} color={colors.muted} />
                  <Text variant="caption" color={colors.muted} style={{ marginLeft: 4 }}>
                    {orderWindow}
                  </Text>
                </View>
              </View>

              <View style={styles.lockBadge}>
                <Lock size={12} color={colors.amber} weight="fill" />
                <Text variant="caption" color={colors.amber} style={styles.lockLabel}>PRE-ACCEPTANCE</Text>
              </View>
            </View>

            <View style={styles.mapPlaceholder}>
              <View style={styles.mapOverlay}>
                <View style={styles.mapCenter}>
                  <View style={styles.pulseContainer}>
                    <View style={styles.pulseBase} />
                    <Globe size={40} color={colors.navy} weight="duotone" />
                  </View>
                  <Text variant="caption" color={colors.slate} style={styles.mapCaption}>
                    Location preview locked
                  </Text>
                </View>
                <View style={styles.unlockBanner}>
                  <Lock size={16} color={colors.amber} weight="fill" />
                  <Text variant="caption" color={colors.amber} style={styles.unlockText}>
                    Full address revealed upon order acceptance
                  </Text>
                </View>
              </View>
            </View>
          </BaseCard>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          label="Reject"
          style={styles.rejectBtn}
          textStyle={styles.btnText}
          onPress={() => {
            dismissNewOrder(internalOrderId);
            safeBack('/(aggregator)/orders');
          }}
        />
        <PrimaryButton
          label={isBusy ? 'Accepting...' : 'Accept'}
          style={styles.acceptBtn}
          textStyle={styles.btnText}
          onPress={async () => {
            if (!internalOrderId || isBusy) return;
            setIsBusy(true);
            try {
              await acceptOrderApi(internalOrderId);
              await refreshAggregatorOrder(internalOrderId);
              router.replace({ pathname: '/(aggregator)/active-order-detail', params: { id: internalOrderId } } as any);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to accept order');
            } finally {
              setIsBusy(false);
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
  },
  summaryDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    padding: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    letterSpacing: 1.2,
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
  },
  unlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    borderRadius: radius.card,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  unlockText: { fontFamily: 'DMSans-Medium', flex: 1 },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  col: {
    flex: 1,
  },
  colMaterial: {
    flex: 3,
  },
  colWeight: {
    flex: 2,
    textAlign: 'right',
  },
  colRate: {
    flex: 2,
    textAlign: 'right',
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface2,
  },
  tableTotalLabel: {
    color: colors.slate,
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
  },
  tableTotalValue: {
    color: colors.amber,
    fontFamily: 'DMMono-Medium',
    fontSize: 15,
  },
  locationCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  locationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationInfo: {
    flex: 1,
  },
  localityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localityText: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  windowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 24,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  lockLabel: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCenter: {
    alignItems: 'center',
    gap: 12,
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseBase: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.navy,
    opacity: 0.05,
  },
  mapCaption: {
    fontFamily: 'DMSans-Medium',
    opacity: 0.8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 28,
  },
  rejectBtn: {
    flex: 1,
    height: 48,
    backgroundColor: colors.red,
  },
  acceptBtn: {
    flex: 1,
    height: 48,
    backgroundColor: colors.teal,
  },
  btnText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
});