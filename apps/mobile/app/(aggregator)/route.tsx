/**
 * app/(aggregator)/route.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Route Planner
 * - Shows only the authenticated aggregator's accepted orders as map pins
 * - All accepted pins always visible; selecting one shows a detail card overlay
 * - Map expands smoothly on tap; order list slides down
 * - Material chips are color-coded per type
 * - Tapping the floating detail card navigates to order detail page
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Globe,
  NavigationArrow,
  Package,
  Wrench,
  FileText,
  Dress,
  Cube,
  Recycle,
  ArrowsOut,
  ArrowsIn,
} from 'phosphor-react-native';

import { colors, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { BaseCard } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { Text, Numeric } from '../../components/ui/Typography';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { getMapRenderAvailability } from '../../utils/mapAvailable';
import { getMapLibreModule } from '../../lib/maplibre';
import {
  type AuthenticatedMapStyle,
  getAuthenticatedMapStyle,
  OLA_TILE_STYLE_URL,
} from '../../lib/olaMaps';

// ── Types ────────────────────────────────────────────────────────────────────

type MaterialType = 'metal' | 'paper' | 'fabric' | 'plastic' | 'ewaste' | 'glass' | 'custom';

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
  plastic: 'plastic',
  plastics: 'plastic',
  ewaste: 'ewaste',
  'e-waste': 'ewaste',
  electronics: 'ewaste',
  glass: 'glass',
};

// Material chip colors from design tokens
const MATERIAL_CHIP_COLORS: Record<MaterialType, { bg: string; fg: string; icon: React.ElementType }> = {
  metal:   { bg: colors.material.metal.bg,   fg: colors.material.metal.fg,   icon: Wrench },
  paper:   { bg: colors.material.paper.bg,   fg: colors.material.paper.fg,   icon: FileText },
  fabric:  { bg: colors.material.fabric.bg,  fg: colors.material.fabric.fg,  icon: Dress },
  plastic: { bg: colors.material.plastic.bg, fg: colors.material.plastic.fg, icon: Recycle },
  ewaste:  { bg: colors.material.ewaste.bg,  fg: colors.material.ewaste.fg,  icon: Cube },
  glass:   { bg: colors.material.glass.bg,   fg: colors.material.glass.fg,   icon: Cube },
  custom:  { bg: colors.material.custom.bg,  fg: colors.material.custom.fg,  icon: Package },
};

function toMaterialType(value: unknown): MaterialType {
  const normalized = String(value ?? '').trim().toLowerCase();
  return MATERIAL_CODE_TO_TYPE[normalized] ?? 'custom';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

interface RouteOrder {
  id: string;
  orderNumber: string;
  status: string;
  locality: string;
  distanceKm: number | null;
  materials: { type: MaterialType; weight: number; label: string }[];
  price: number;
  lat: number;
  lng: number;
}

// ── Screen dimensions ─────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NAV_HEIGHT = Platform.OS === 'ios' ? 88 : 64;
const USABLE = SCREEN_HEIGHT - NAV_HEIGHT;
const MAP_HEIGHT_COLLAPSED = Math.round(USABLE * 0.5);
const MAP_HEIGHT_EXPANDED = Math.round(USABLE * 0.82);

// ── Component ────────────────────────────────────────────────────────────────

export default function RoutePlannerScreen() {
  const router = useRouter();
  const aggOrders = useAggregatorStore((state) => state.aggOrders);

  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Map height animation
  const mapHeightAnim = useRef(new Animated.Value(MAP_HEIGHT_COLLAPSED)).current;

  // Authenticated map style
  const [authenticatedMapStyle, setAuthenticatedMapStyle] = React.useState<AuthenticatedMapStyle | null>(null);
  const mapAvailability = useMemo(() => getMapRenderAvailability(), []);
  const mapLibre = useMemo(
    () => (mapAvailability.canRenderMap ? getMapLibreModule() : null),
    [mapAvailability.canRenderMap],
  );
  const canRenderMap = Boolean(mapAvailability.canRenderMap && mapLibre && authenticatedMapStyle);

  React.useEffect(() => {
    let isMounted = true;
    if (!mapAvailability.canRenderMap || !mapLibre || !OLA_TILE_STYLE_URL) {
      setAuthenticatedMapStyle(null);
      return () => { isMounted = false; };
    }
    void getAuthenticatedMapStyle(OLA_TILE_STYLE_URL)
      .then((style) => { if (isMounted) setAuthenticatedMapStyle(style); })
      .catch((err) => {
        console.warn('[aggregator-route] failed to resolve map style', err);
        if (isMounted) setAuthenticatedMapStyle(null);
      });
    return () => { isMounted = false; };
  }, [mapAvailability.canRenderMap, mapLibre]);

  // ── Build route orders from aggOrders (accepted only, with coordinates) ──

  const storeOrders: RouteOrder[] = useMemo(() => {
    if (!Array.isArray(aggOrders)) return [];

    return aggOrders
      .filter((item: any) => {
        const status = String(item?.status ?? '').toLowerCase();
        // Show accepted + en_route + arrived + weighing_in_progress — everything not completed/cancelled
        const isActive = ['accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(status);
        const hasCoords =
          Number.isFinite(toFiniteNumber(item?.pickup_lat ?? item?.pickupLat)) &&
          Number.isFinite(toFiniteNumber(item?.pickup_lng ?? item?.pickupLng));
        return isActive && hasCoords;
      })
      .slice(0, 20)
      .map((item: any, index: number): RouteOrder => {
        // Materials from order_items or estimated_weights
        const rawOrderItems = Array.isArray(item?.order_items) ? item.order_items : [];
        const estimatedWeights =
          item?.estimated_weights && typeof item.estimated_weights === 'object'
            ? item.estimated_weights as Record<string, number>
            : {};

        let materials: { type: MaterialType; weight: number; label: string }[] = [];

        if (rawOrderItems.length > 0) {
          materials = rawOrderItems
            .map((oi: any) => ({
              type: toMaterialType(oi?.material_code ?? oi?.materialCode),
              weight: Number(
                toFiniteNumber(oi?.estimated_weight_kg ?? oi?.estimatedWeightKg) ?? 0,
              ),
              label: String(oi?.material_label ?? oi?.materialLabel ?? oi?.material_code ?? ''),
            }))
            .filter((m: { weight: number }) => m.weight > 0);
        }

        if (materials.length === 0 && Object.keys(estimatedWeights).length > 0) {
          materials = Object.entries(estimatedWeights)
            .map(([code, weight]) => ({
              type: toMaterialType(code),
              weight: Number((toFiniteNumber(weight) ?? 0).toFixed(2)),
              label: code,
            }))
            .filter((m) => m.weight > 0);
        }

        // Fallback: at least show material_codes as chips with 0 weight hidden
        if (materials.length === 0 && Array.isArray(item?.material_codes)) {
          materials = (item.material_codes as string[]).map((code) => ({
            type: toMaterialType(code),
            weight: 0,
            label: code,
          }));
        }

        const lat = toFiniteNumber(item?.pickup_lat ?? item?.pickupLat) ?? 0;
        const lng = toFiniteNumber(item?.pickup_lng ?? item?.pickupLng) ?? 0;

        // Distance: prefer distance_km from API or liveDistanceKm
        const distanceKm = toFiniteNumber(item?.distance_km ?? item?.liveDistanceKm ?? item?.distanceKm);

        const price = Number(
          item?.orderAmount ??
            item?.display_amount ??
            item?.confirmed_total ??
            item?.estimated_total ??
            item?.estimatedAmount ??
            0,
        );

        const rawId = String(item.id ?? item.orderId ?? `route-order-${index + 1}`);
        const orderNumber = String(
          item.order_display_id ??
            item.orderNumber ??
            `#${rawId.slice(0, 6).toUpperCase()}`,
        );

        const locality = String(
          item.pickup_locality ?? item.pickupLocality ?? item.locality ?? 'Unknown area',
        );

        return { id: rawId, orderNumber, status: String(item?.status ?? 'accepted'), locality, distanceKm, materials, price, lat, lng };
      });
  }, [aggOrders]);

  // Set initial focused order
  React.useEffect(() => {
    if (storeOrders.length === 0) {
      setFocusedOrderId(null);
      return;
    }
    if (focusedOrderId && storeOrders.some((o) => o.id === focusedOrderId)) return;
    setFocusedOrderId(null); // No auto-selection — user picks from list
  }, [storeOrders]);

  const focusedOrder = useMemo(
    () => storeOrders.find((o) => o.id === focusedOrderId) ?? null,
    [focusedOrderId, storeOrders],
  );

  const totalValue = storeOrders.reduce((sum, o) => sum + o.price, 0);

  // ── Map expand/collapse toggle ─────────────────────────────────────────────

  const toggleMapExpand = useCallback(() => {
    const toExpanded = !isMapExpanded;
    setIsMapExpanded(toExpanded);
    Animated.spring(mapHeightAnim, {
      toValue: toExpanded ? MAP_HEIGHT_EXPANDED : MAP_HEIGHT_COLLAPSED,
      useNativeDriver: false,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [isMapExpanded, mapHeightAnim]);

  // ── Handle order card tap (list below map) ─────────────────────────────────

  const handleOrderCardPress = useCallback(
    (orderId: string) => {
      setFocusedOrderId((prev) => (prev === orderId ? null : orderId));
    },
    [],
  );

  // ── Handle floating detail card tap → navigate to order detail ─────────────

  const handleDetailCardPress = useCallback(
    (orderId: string) => {
      router.push(`/(aggregator)/order/${orderId}` as any);
    },
    [router],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Route Planner" variant="light" />

      <View style={styles.main}>
        {/* ── Map Area (animated height) ── */}
        <Animated.View style={[styles.mapArea, { height: mapHeightAnim }]}>
          {canRenderMap && mapLibre ? (
            <mapLibre.MapView style={styles.map} mapStyle={authenticatedMapStyle ?? undefined}>
              <mapLibre.Camera
                centerCoordinate={
                  focusedOrder
                    ? [focusedOrder.lng, focusedOrder.lat]
                    : [78.4867, 17.385]
                }
                zoomLevel={focusedOrder ? 14 : 11}
                animationDuration={500}
              />
              {storeOrders.map((order) => (
                <mapLibre.PointAnnotation
                  key={order.id}
                  id={`route-pin-${order.id}`}
                  coordinate={[order.lng, order.lat]}
                  onSelected={() => setFocusedOrderId(order.id)}
                >
                  <View
                    style={[
                      styles.routePointPin,
                      focusedOrderId === order.id && styles.routePointPinActive,
                    ]}
                  />
                </mapLibre.PointAnnotation>
              ))}
            </mapLibre.MapView>
          ) : (
            /* Fallback graphic when native map is unavailable */
            <View style={styles.mapGraphic}>
              {storeOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.marker,
                    {
                      left: `${Math.max(5, Math.min(90, ((order.lng - 78.2) / 0.6) * 100))}%`,
                      top: `${Math.max(5, Math.min(90, ((17.6 - order.lat) / 0.4) * 100))}%`,
                    },
                  ]}
                  onPress={() => handleOrderCardPress(order.id)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.markerPin,
                      styles.markerOrder,
                      focusedOrderId === order.id && styles.markerPinActive,
                    ]}
                  >
                    <Package size={14} color="#fff" weight="bold" />
                  </View>
                  <View style={styles.markerLabelBg}>
                    <Text style={styles.markerLabel}>{order.orderNumber}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={[styles.marker, { left: '45%', top: '65%' }]}>
                <View style={[styles.markerPin, styles.markerUser]}>
                  <NavigationArrow size={14} color="#fff" weight="fill" />
                </View>
                <View style={styles.markerLabelBg}>
                  <Text style={styles.markerLabel}>You</Text>
                </View>
              </View>

              <View style={styles.mapOverlay}>
                <Globe size={40} color={colors.muted} style={{ opacity: 0.1 }} />
                <Text style={styles.mapOverlayText}>Route Preview</Text>
                <Text style={styles.mapOverlayText}>
                  {mapAvailability.heading || 'Map preview unavailable'}
                </Text>
                <Text style={styles.mapOverlayText}>
                  {mapAvailability.body || 'Use a development build to view map pins.'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Map overlays ── */}
          <View style={styles.overlayTopLeft}>
            <View style={styles.badge}>
              <Text variant="caption" style={styles.badgeText}>
                {storeOrders.length} on map
              </Text>
            </View>
          </View>

          <View style={styles.overlayTopRight}>
            <View style={[styles.badge, styles.badgePrice]}>
              <Numeric size={12} color={colors.amber}>
                ~₹{totalValue.toLocaleString()}
              </Numeric>
            </View>
          </View>

          {/* ── Expand / Collapse button ── */}
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={toggleMapExpand}
            activeOpacity={0.85}
          >
            {isMapExpanded ? (
              <ArrowsIn size={18} color={colors.navy} weight="bold" />
            ) : (
              <ArrowsOut size={18} color={colors.navy} weight="bold" />
            )}
          </TouchableOpacity>

          {/* ── Floating detail card (appears over map when an order is selected) ── */}
          {focusedOrder ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleDetailCardPress(focusedOrder.id)}
            >
              <BaseCard style={styles.focusedOrderCard}>
                <View style={styles.focusedOrderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={styles.focusedOrderTitle}>
                      {focusedOrder.orderNumber}
                    </Text>
                    <Text variant="caption" color={colors.muted}>
                      {focusedOrder.locality}
                      {focusedOrder.distanceKm !== null
                        ? `  ·  ${focusedOrder.distanceKm.toFixed(1)} km`
                        : ''}
                    </Text>
                  </View>
                  <StatusChip status={focusedOrder.status as any} />
                </View>

                <View style={styles.materialRow}>
                  {focusedOrder.materials.map((material, idx) => {
                    const chipColors = MATERIAL_CHIP_COLORS[material.type];
                    const Icon = chipColors.icon;
                    return (
                      <View
                        key={`${focusedOrder.id}-${material.type}-${idx}`}
                        style={[styles.miniChip, { backgroundColor: chipColors.bg }]}
                      >
                        <Icon size={10} color={chipColors.fg} />
                        {material.weight > 0 && (
                          <Text variant="caption" style={[styles.miniChipText, { color: chipColors.fg }]}>
                            {material.weight} kg
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.focusedOrderFooter}>
                  <Text variant="caption" color={colors.muted}>
                    Tap to view order details
                  </Text>
                  <Numeric color={colors.amber} style={styles.orderPriceText}>
                    ~₹{focusedOrder.price}
                  </Numeric>
                </View>
              </BaseCard>
            </TouchableOpacity>
          ) : null}
        </Animated.View>

        {/* ── Order List Section ── */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text variant="subheading" style={styles.listTitle}>
              Accepted Orders ({storeOrders.length})
            </Text>
          </View>

          {storeOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={36} color={colors.muted} />
              <Text variant="caption" color={colors.muted} style={styles.emptyText}>
                No accepted orders with location data
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.orderList}
              contentContainerStyle={styles.orderListContent}
              showsVerticalScrollIndicator={false}
            >
              {storeOrders.map((order) => {
                const isFocused = focusedOrderId === order.id;
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={[styles.orderRow, isFocused && styles.orderRowFocused]}
                    onPress={() => handleOrderCardPress(order.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderInfo}>
                      <View style={styles.orderTopRow}>
                        <Text variant="label" style={styles.orderLocality}>
                          {order.locality}
                        </Text>
                        {order.distanceKm !== null && (
                          <Text variant="caption" color={colors.muted}>
                            {order.distanceKm.toFixed(1)} km
                          </Text>
                        )}
                      </View>
                      <View style={styles.materialRow}>
                        {order.materials.map((m, idx) => {
                          const chipColors = MATERIAL_CHIP_COLORS[m.type];
                          const Icon = chipColors.icon;
                          return (
                            <View
                              key={`${order.id}-${m.type}-${idx}`}
                              style={[styles.miniChip, { backgroundColor: chipColors.bg }]}
                            >
                              <Icon size={10} color={chipColors.fg} />
                              {m.weight > 0 && (
                                <Text
                                  variant="caption"
                                  style={[styles.miniChipText, { color: chipColors.fg }]}
                                >
                                  {m.weight} kg
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    <Numeric color={colors.amber} style={styles.orderPriceText}>
                      ~₹{order.price}
                    </Numeric>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  main: {
    flex: 1,
  },
  // ── Map area ──
  mapArea: {
    backgroundColor: '#EEF4FC',
    position: 'relative',
    overflow: 'hidden',
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.navy,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  // ── Fallback map graphic ──
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
    textAlign: 'center',
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
    transform: [{ scale: 1.15 }],
    backgroundColor: colors.navy,
    borderColor: colors.surface,
  },
  markerUser: {
    backgroundColor: colors.teal,
  },
  markerLabelBg: {
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  markerLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.navy,
  },
  // ── Map overlays ──
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
  // ── Expand button ──
  expandBtn: {
    position: 'absolute',
    bottom: spacing.md + 80, // above the detail card
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 20,
  },
  // ── Floating detail card ──
  focusedOrderCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.md,
    zIndex: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
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
    fontSize: 15,
  },
  focusedOrderFooter: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  // ── List section ──
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
    color: colors.navy,
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
  orderRowFocused: {
    borderColor: colors.navy,
    backgroundColor: colors.navyAlpha3,
  },
  orderInfo: {
    flex: 1,
    gap: 4,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLocality: {
    fontWeight: '700',
    color: colors.navy,
    flex: 1,
    marginRight: spacing.sm,
  },
  // ── Material chips ──
  materialRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderPriceText: {
    textAlign: 'right',
    flexShrink: 0,
  },
  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
});
