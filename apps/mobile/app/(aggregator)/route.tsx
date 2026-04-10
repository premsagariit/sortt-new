/**
 * app/(aggregator)/route.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Route Planner — matches design Image 2
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import {
  Check,
  Globe,
  NavigationArrow,
  Package,
  Wrench,
  FileText,
  Dress,
} from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { BaseCard } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { Text, Numeric } from '../../components/ui/Typography';
import { getOrderDisplayAmount, useOrderStore } from '../../store/orderStore';
import { getMapRenderAvailability } from '../../utils/mapAvailable';
import { getMapLibreModule } from '../../lib/maplibre';
import { type AuthenticatedMapStyle, getAuthenticatedMapStyle, OLA_TILE_STYLE_URL } from '../../lib/olaMaps';

type OrderStatus =
  | 'created'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'weighing_in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

type MaterialType = 'metal' | 'paper' | 'fabric';

const MATERIAL_CODE_TO_TYPE: Record<string, MaterialType> = {
  metal: 'metal',
  metals: 'metal',
  iron: 'metal',
  steel: 'metal',
  aluminum: 'metal',
  aluminium: 'metal',
  paper: 'paper',
  papers: 'paper',
  cardboard: 'paper',
  carton: 'paper',
  fabric: 'fabric',
  fabrics: 'fabric',
  cloth: 'fabric',
  textile: 'fabric',
  textiles: 'fabric',
};

const CONFIRMED_WEIGHT_STATUSES: OrderStatus[] = ['weighing_in_progress', 'completed'];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toMaterialType(value: unknown): MaterialType {
  const normalized = String(value ?? '').trim().toLowerCase();
  return MATERIAL_CODE_TO_TYPE[normalized] ?? 'metal';
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  const normalized = String(value ?? 'created').toLowerCase() as OrderStatus;
  const allowed: OrderStatus[] = ['created', 'accepted', 'en_route', 'arrived', 'weighing_in_progress', 'completed', 'cancelled', 'disputed'];
  return allowed.includes(normalized) ? normalized : 'created';
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  locality: string;
  distance: string;
  weightBasis: 'estimated' | 'confirmed';
  materials: { type: 'metal' | 'paper' | 'fabric'; weight: number }[];
  price: number;
  lat: number;
  lng: number;
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'route-order-1',
    orderNumber: '#000005',
    status: 'accepted',
    locality: 'Banjara Hills',
    distance: '0.8 km',
    weightBasis: 'estimated',
    materials: [
      { type: 'metal', weight: 18 },
      { type: 'paper', weight: 15 },
    ],
    price: 896,
    lat: 30,
    lng: 40,
  },
  {
    id: 'route-order-2',
    orderNumber: '#000006',
    status: 'en_route',
    locality: 'Jubilee Hills',
    distance: '1.4 km',
    weightBasis: 'estimated',
    materials: [{ type: 'metal', weight: 10 }],
    price: 280,
    lat: 50,
    lng: 60,
  },
  {
    id: 'route-order-3',
    orderNumber: '#000007',
    status: 'weighing_in_progress',
    locality: 'Somajiguda',
    distance: '2.1 km',
    weightBasis: 'confirmed',
    materials: [
      { type: 'paper', weight: 8 },
      { type: 'fabric', weight: 4 },
    ],
    price: 144,
    lat: 70,
    lng: 75,
  },
];

export default function RoutePlannerScreen() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const orders = useOrderStore((state: any) => state.orders);
  const [authenticatedMapStyle, setAuthenticatedMapStyle] = React.useState<AuthenticatedMapStyle | null>(null);
  const mapAvailability = React.useMemo(() => getMapRenderAvailability(), []);
  const mapLibre = React.useMemo(() => (mapAvailability.canRenderMap ? getMapLibreModule() : null), [mapAvailability.canRenderMap]);
  const canRenderMap = Boolean(mapAvailability.canRenderMap && mapLibre && authenticatedMapStyle);

  React.useEffect(() => {
    let isMounted = true;

    if (!mapAvailability.canRenderMap || !mapLibre || !OLA_TILE_STYLE_URL) {
      setAuthenticatedMapStyle(null);
      return () => {
        isMounted = false;
      };
    }

    void getAuthenticatedMapStyle(OLA_TILE_STYLE_URL)
      .then((style) => {
        if (isMounted) setAuthenticatedMapStyle(style);
      })
      .catch((error) => {
        console.warn('[aggregator-route] failed to resolve map style', error);
        if (isMounted) setAuthenticatedMapStyle(null);
      });

    return () => {
      isMounted = false;
    };
  }, [mapAvailability.canRenderMap, mapLibre, OLA_TILE_STYLE_URL]);

  const toRouteMaterials = React.useCallback((item: any, status: OrderStatus): { materials: Order['materials']; weightBasis: Order['weightBasis'] } => {
    const weightBasis: Order['weightBasis'] = CONFIRMED_WEIGHT_STATUSES.includes(status) ? 'confirmed' : 'estimated';
    const orderItems = Array.isArray(item?.orderItems)
      ? item.orderItems
      : (Array.isArray(item?.order_items) ? item.order_items : []);
    const lineItems = Array.isArray(item?.lineItems)
      ? item.lineItems
      : (Array.isArray(item?.line_items) ? item.line_items : []);

    const fromOrderItems = orderItems
      .map((orderItem: any) => {
        const estimated = toFiniteNumber(orderItem?.estimatedWeightKg ?? orderItem?.estimated_weight_kg);
        const confirmed = toFiniteNumber(orderItem?.confirmedWeightKg ?? orderItem?.confirmed_weight_kg);
        const picked = weightBasis === 'confirmed' ? (confirmed ?? estimated ?? 0) : (estimated ?? confirmed ?? 0);
        const rounded = Number.isFinite(picked) ? Number(picked.toFixed(2)) : 0;
        return {
          type: toMaterialType(orderItem?.materialCode ?? orderItem?.material_code),
          weight: rounded,
        };
      })
      .filter((material: { type: MaterialType; weight: number }) => material.weight > 0);
    if (fromOrderItems.length > 0) return { materials: fromOrderItems, weightBasis };

    const fromLineItems = lineItems
      .map((lineItem: any) => {
        const weight = toFiniteNumber(lineItem?.weightKg ?? lineItem?.weight_kg ?? lineItem?.confirmedWeightKg ?? lineItem?.estimatedWeightKg) ?? 0;
        return {
          type: toMaterialType(lineItem?.materialCode ?? lineItem?.material_code),
          weight: Number(weight.toFixed(2)),
        };
      })
      .filter((material: { type: MaterialType; weight: number }) => material.weight > 0);
    if (fromLineItems.length > 0) return { materials: fromLineItems, weightBasis };

    const estimatedWeights = item?.estimatedWeights ?? item?.estimated_weights;
    if (estimatedWeights && typeof estimatedWeights === 'object') {
      const fromEstimatedWeights = Object.entries(estimatedWeights)
        .map(([code, weight]) => ({
          type: toMaterialType(code),
          weight: Number((toFiniteNumber(weight) ?? 0).toFixed(2)),
        }))
        .filter((material: { type: MaterialType; weight: number }) => material.weight > 0);
      if (fromEstimatedWeights.length > 0) return { materials: fromEstimatedWeights, weightBasis: 'estimated' };
    }

    const fallbackWeight = toFiniteNumber(item?.confirmedWeightKg ?? item?.confirmed_weight_kg ?? item?.estimatedWeightKg ?? item?.estimated_weight_kg) ?? 0;
    return {
      materials: [{ type: 'metal', weight: Number(fallbackWeight.toFixed(2)) }],
      weightBasis,
    };
  }, []);

  const storeOrders: Order[] = React.useMemo(() => {
    const withCoordinates = Array.isArray(orders)
      ? orders.filter((item: any) => Number.isFinite(item?.pickupLat) && Number.isFinite(item?.pickupLng))
      : [];

    if (withCoordinates.length === 0) return MOCK_ORDERS;

    return withCoordinates.slice(0, 12).map((item: any, index: number) => {
      const status = normalizeOrderStatus(item?.status);
      const materialPayload = toRouteMaterials(item, status);

      return {
        id: String(item.orderId ?? item.id ?? `route-order-${index + 1}`),
        orderNumber: String(item.orderNumber ?? item.order_display_id ?? `#${String(item.orderId ?? '').slice(0, 6).toUpperCase()}`),
        status,
        locality: String(item.pickupLocality ?? item.locality ?? 'Unknown area'),
        distance: typeof item.liveDistanceKm === 'number' ? `${item.liveDistanceKm.toFixed(1)} km` : '—',
        weightBasis: materialPayload.weightBasis,
        materials: materialPayload.materials,
        price: Number(getOrderDisplayAmount(item)) || 0,
        lat: Number(item.pickupLat),
        lng: Number(item.pickupLng),
      };
    });
  }, [orders, toRouteMaterials]);

  const [selectedIds, setSelectedIds] = useState<string[]>(storeOrders.map(o => o.id));

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const clearAll = () => setSelectedIds([]);

  React.useEffect(() => {
    setSelectedIds(storeOrders.map((item) => item.id));
  }, [storeOrders]);

  React.useEffect(() => {
    if (storeOrders.length === 0) {
      setFocusedOrderId(null);
      return;
    }

    if (focusedOrderId && storeOrders.some((order) => order.id === focusedOrderId)) return;
    setFocusedOrderId(storeOrders[0].id);
  }, [focusedOrderId, storeOrders]);

  React.useEffect(() => {
    if (selectedIds.length === 0) {
      setFocusedOrderId(null);
      return;
    }

    if (focusedOrderId && selectedIds.includes(focusedOrderId)) return;
    setFocusedOrderId(selectedIds[0]);
  }, [focusedOrderId, selectedIds]);

  const totalValue = storeOrders
    .filter(o => selectedIds.includes(o.id))
    .reduce((sum, o) => sum + o.price, 0);
  const focusedOrder = React.useMemo(
    () => storeOrders.find((order) => order.id === focusedOrderId) ?? null,
    [focusedOrderId, storeOrders],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar
        title="Route Planner"
        variant="light"
        rightAction={
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Text variant="caption" style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
                Map
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text variant="caption" style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
                List
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.main}>
        {/* Map Visualization Area */}
        <View style={styles.mapArea}>
          {canRenderMap && mapLibre ? (
            <mapLibre.MapView style={styles.map} mapStyle={authenticatedMapStyle ?? undefined}>
              <mapLibre.Camera centerCoordinate={[78.4867, 17.385]} zoomLevel={11} />
              {storeOrders
                .filter((order) => selectedIds.includes(order.id))
                .map((order) => (
                  <mapLibre.PointAnnotation
                    key={order.id}
                    id={`route-order-pin-${order.id}`}
                    coordinate={[order.lng, order.lat]}
                    onSelected={() => setFocusedOrderId(order.id)}
                  >
                    <View style={[styles.routePointPin, focusedOrderId === order.id && styles.routePointPinActive]} />
                  </mapLibre.PointAnnotation>
                ))}
            </mapLibre.MapView>
          ) : (
            <View style={styles.mapGraphic}>
            {/* Markers */}
            {storeOrders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.marker,
                  {
                    left: `${Math.max(5, Math.min(90, ((order.lng - 78.2) / 0.6) * 100))}%`,
                    top: `${Math.max(5, Math.min(90, ((order.lat - 17.2) / 0.4) * 100))}%`,
                  },
                  !selectedIds.includes(order.id) && { opacity: 0.4 },
                ]}
                onPress={() => setFocusedOrderId(order.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.markerPin, styles.markerOrder, focusedOrderId === order.id && styles.markerPinActive]}>
                  <Package size={14} color="#fff" weight="bold" />
                </View>
                <View style={styles.markerLabelBg}>
                  <Text style={styles.markerLabel}>{order.orderNumber}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* User Marker */}
            <View style={[styles.marker, { left: '45%', top: '65%' }]}>
              <View style={[styles.markerPin, styles.markerUser]}>
                <NavigationArrow size={14} color="#fff" weight="fill" />
              </View>
              <View style={styles.markerLabelBg}>
                <Text style={styles.markerLabel}>You</Text>
              </View>
            </View>

            {/* Placeholder Background Text */}
            <View style={styles.mapOverlay}>
              <Globe size={40} color={colors.muted} style={{ opacity: 0.1 }} />
              <Text style={styles.mapOverlayText}>Route Preview</Text>
              <Text style={styles.mapOverlayText}>{mapAvailability.heading || 'Map preview unavailable'}</Text>
              <Text style={styles.mapOverlayText}>{mapAvailability.body || 'Use a development build to view map pins.'}</Text>
            </View>
          </View>
          )}

          {/* Map Info Overlays */}
          <View style={styles.overlayTopLeft}>
            <View style={styles.badge}>
              <Text variant="caption" style={styles.badgeText}>{selectedIds.length} selected</Text>
            </View>
          </View>

          <View style={styles.overlayTopRight}>
            <View style={[styles.badge, styles.badgePrice]}>
              <Numeric size={12} color={colors.amber}>~₹{totalValue.toLocaleString()} total</Numeric>
            </View>
          </View>

          {focusedOrder ? (
            <BaseCard style={styles.focusedOrderCard}>
              <View style={styles.focusedOrderHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={styles.focusedOrderTitle}>{focusedOrder.orderNumber}</Text>
                  <Text variant="caption" color={colors.muted}>{focusedOrder.locality} · {focusedOrder.distance}</Text>
                </View>
                <StatusChip status={focusedOrder.status} />
              </View>

              <View style={styles.materialRow}>
                {focusedOrder.materials.map((material, index) => (
                  <View key={`${focusedOrder.id}-${material.type}-${index}`} style={styles.miniChip}>
                    {material.type === 'metal' ? <Wrench size={10} color={colors.slate} /> :
                      material.type === 'paper' ? <FileText size={10} color={colors.slate} /> :
                        <Dress size={10} color={colors.slate} />}
                    <Text variant="caption" style={styles.miniChipText}>{material.weight} kg</Text>
                  </View>
                ))}
              </View>

              <View style={styles.focusedOrderFooter}>
                <Text variant="caption" color={colors.muted}>
                  {focusedOrder.weightBasis === 'confirmed' ? 'Showing confirmed pickup weight' : 'Showing estimated listing weight'}
                </Text>
                <Numeric color={colors.amber} style={styles.orderPrice}>~₹{focusedOrder.price}</Numeric>
              </View>
            </BaseCard>
          ) : null}
        </View>

        {/* List Section */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text variant="subheading" style={styles.listTitle}>Select orders for this trip</Text>
            <TouchableOpacity onPress={clearAll}>
              <Text variant="caption" style={styles.clearLink}>Clear all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.orderList}
            contentContainerStyle={styles.orderListContent}
            showsVerticalScrollIndicator={false}
          >
            {storeOrders.map(order => {
              const isSelected = selectedIds.includes(order.id);
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderRow, isSelected && styles.orderRowSelected]}
                  onPress={() => toggleSelection(order.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Check size={12} color="#fff" weight="bold" />}
                  </View>

                  <View style={styles.orderInfo}>
                    <Text variant="label" style={styles.orderLocality}>
                      {order.locality} · {order.distance}
                    </Text>
                    <View style={styles.materialRow}>
                      {order.materials.map((m, idx) => (
                        <View key={idx} style={styles.miniChip}>
                          {m.type === 'metal' ? <Wrench size={10} color={colors.slate} /> :
                            m.type === 'paper' ? <FileText size={10} color={colors.slate} /> :
                              <Dress size={10} color={colors.slate} />}
                          <Text variant="caption" style={styles.miniChipText}>
                            {m.weight} kg
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <Numeric color={colors.amber} style={styles.orderPrice}>~₹{order.price}</Numeric>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28,46,74,0.08)',
    borderRadius: 20,
    padding: 2,
    marginRight: spacing.sm,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 18,
  },
  toggleBtnActive: {
    backgroundColor: colors.navy,
  },
  toggleText: {
    fontWeight: '600',
    color: colors.slate,
  },
  toggleTextActive: {
    color: '#fff',
  },
  main: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
    backgroundColor: colorExtended.surface2,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  routePointPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  routePointPinActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.navy,
  },
  mapGraphic: {
    flex: 1,
    backgroundColor: '#EEF4FC',
    overflow: 'hidden',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlayText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  markerOrder: {
    backgroundColor: colors.red,
  },
  markerPinActive: {
    transform: [{ scale: 1.08 }],
    borderColor: colors.navy,
  },
  markerUser: {
    backgroundColor: colors.teal,
  },
  markerLabelBg: {
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  markerLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.navy,
  },
  overlayTopLeft: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  overlayTopRight: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  badge: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  badgePrice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focusedOrderCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.md,
  },
  focusedOrderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  focusedOrderTitle: {
    color: colors.navy,
    fontWeight: '700',
  },
  focusedOrderFooter: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listSection: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  listTitle: {
    flex: 1,
  },
  clearLink: {
    fontWeight: '600',
    color: colors.red,
  },
  orderList: {
    flex: 1,
  },
  orderListContent: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  orderRowSelected: {
    borderColor: colors.navy,
    backgroundColor: 'rgba(28,46,74,0.03)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  orderInfo: {
    flex: 1,
  },
  orderLocality: {
    fontWeight: '700',
    color: colors.navy,
  },
  materialRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate,
  },
  orderPrice: {
    textAlign: 'right',
  },
});
