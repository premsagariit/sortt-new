import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { BaseCard } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/Button';
import { Globe, Lock, MapPin, Clock, Hash, NavigationArrow } from 'phosphor-react-native';
import { getOrderDisplayAmount, useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { ContactCard } from '../../../components/order/ContactCard';
import { safeBack } from '../../../utils/navigation';
import { Alert } from 'react-native';
import { api } from '../../../lib/api';

export default function AggregatorOrderByIdScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { orders, fetchOrder } = useOrderStore();
  const storeOrder = orders.find((o) => o.orderId === id);

  const newOrders = useAggregatorStore((s) => s.newOrders);
  const materialsCfg = useAggregatorStore((s) => s.materials);
  const acceptOrderApi = useAggregatorStore((s) => s.acceptOrderApi);
  const dismissNewOrder = useAggregatorStore((s) => s.dismissNewOrder);
  const fetchAggregatorOrders = useAggregatorStore((s) => s.fetchAggregatorOrders);

  const [rates, setRates] = useState<any[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const feedOrder = newOrders.find((o) => o.id === id);

  useEffect(() => {
    if (id) {
      fetchOrder(id, true);
      api.get('/api/rates').then((res) => setRates(res.data.rates || [])).catch(() => {});
    }
  }, [id, fetchOrder]);

  const internalOrderId = storeOrder?.orderId ?? id ?? '';
  const displayOrderNumber = storeOrder?.orderNumber ?? feedOrder?.orderNumber ?? `#${String(internalOrderId).slice(0, 8).toUpperCase()}`;

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rates) {
      map.set(String(r.material_code), Number(r.rate_per_kg || 0));
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
    const weights = storeOrder?.estimatedWeights || {};
    const rows = Object.entries(weights).map(([materialCode, weight]) => {
      const normalized = materialCode.toLowerCase().replace(/[-_]/g, '');
      const sellerRate = Number(rateMap.get(materialCode) || 0);
      const yourRate = Number(yourRateMap.get(normalized) || sellerRate);
      return {
        material: materialCode.charAt(0).toUpperCase() + materialCode.slice(1),
        weight: Number(weight) || 0,
        rate: sellerRate,
        yourRate,
      };
    });

    if (rows.length > 0) return rows;

    return (feedOrder?.materials || []).map((materialCode) => {
      const normalized = materialCode.toLowerCase().replace(/[-_]/g, '');
      const sellerRate = Number(rateMap.get(materialCode) || 0);
      const yourRate = Number(yourRateMap.get(normalized) || sellerRate);
      return {
        material: materialCode.charAt(0).toUpperCase() + materialCode.slice(1),
        weight: 0,
        rate: sellerRate,
        yourRate,
      };
    });
  }, [storeOrder?.estimatedWeights, feedOrder?.materials, rateMap, yourRateMap]);

  const totalEst = useMemo(() => {
    if (storeOrder) {
      const canonical = getOrderDisplayAmount(storeOrder as any);
      if (canonical > 0) return canonical;
    }
    const computed = items.reduce((sum, item) => sum + (item.weight * item.rate), 0);
    if (computed > 0) return computed;
    if (storeOrder?.estimatedAmount && storeOrder.estimatedAmount > 0) return storeOrder.estimatedAmount;
    if (feedOrder?.estimatedPrice && feedOrder.estimatedPrice > 0) return feedOrder.estimatedPrice;
    return 0;
  }, [items, storeOrder, storeOrder?.estimatedAmount, feedOrder?.estimatedPrice]);

  const orderDistance = typeof feedOrder?.distanceKm === 'number' ? `${feedOrder.distanceKm.toFixed(1)} km` : '—';
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
              <Text variant="caption" style={[styles.col, styles.colWeight]}>WEIGHT</Text>
              <Text variant="caption" style={[styles.col, styles.colRate]}>SELLER RATE</Text>
              <Text variant="caption" style={[styles.col, styles.colYourRate]}>AT YOUR RATE</Text>
            </View>
            {items.map((item, idx) => (
              <View key={`${item.material}-${idx}`} style={[styles.tableRow, idx === items.length - 1 && { borderBottomWidth: 0 }]}>
                <Text variant="label" color={colors.navy} style={[styles.col, styles.colMaterial]}>{item.material}</Text>
                <Numeric size={14} style={[styles.col, styles.colWeight, { color: colors.teal }]}>{item.weight} kg</Numeric>
                <Numeric size={14} color={colors.muted} style={[styles.col, styles.colRate]}>₹{item.rate}/kg</Numeric>
                <Numeric size={14} color={colors.amber} style={[styles.col, styles.colYourRate]}>₹{item.yourRate}/kg</Numeric>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text variant="label" color={colors.navy} style={{ fontFamily: 'DMSans-Bold' }}>Total Estimated</Text>
              <Numeric size={24} color={colors.navy}>₹{totalEst}</Numeric>
            </View>
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
              fetchAggregatorOrders(true);
              router.replace('/(aggregator)/orders');
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
    flex: 2,
  },
  colWeight: {
    flex: 1.5,
    textAlign: 'center',
  },
  colRate: {
    flex: 1.5,
    textAlign: 'center',
  },
  colYourRate: {
    flex: 2,
    textAlign: 'right',
    fontFamily: 'DMSans-Bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 0,
    paddingBottom: 24,
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