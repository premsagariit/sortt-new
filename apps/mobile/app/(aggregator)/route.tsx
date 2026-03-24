/**
 * app/(aggregator)/route.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Route Planner — matches design Image 2
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { BaseCard } from '../../components/ui/Card';
import { PrimaryButton } from '../../components/ui/Button';
import { Text, Numeric } from '../../components/ui/Typography';
import { useOrderStore } from '../../store/orderStore';
import { MAP_RENDERING_AVAILABLE } from '../../utils/mapAvailable';
import { getMapLibreModule } from '../../lib/maplibre';
import { OLA_TILE_STYLE_URL } from '../../lib/olaMaps';
import { openExternalDirections } from '../../utils/mapNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Order {
  id: string;
  orderNumber: string;
  locality: string;
  distance: string;
  materials: { type: 'metal' | 'paper' | 'fabric'; weight: number }[];
  price: number;
  lat: number;
  lng: number;
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'route-order-1',
    orderNumber: '#000005',
    locality: 'Banjara Hills',
    distance: '0.8 km',
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
    locality: 'Jubilee Hills',
    distance: '1.4 km',
    materials: [{ type: 'metal', weight: 10 }],
    price: 280,
    lat: 50,
    lng: 60,
  },
  {
    id: 'route-order-3',
    orderNumber: '#000007',
    locality: 'Somajiguda',
    distance: '2.1 km',
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
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const orders = useOrderStore((state: any) => state.orders);
  const mapLibre = React.useMemo(() => (MAP_RENDERING_AVAILABLE ? getMapLibreModule() : null), []);
  const canRenderMap = Boolean(MAP_RENDERING_AVAILABLE && mapLibre && OLA_TILE_STYLE_URL);

  const storeOrders: Order[] = React.useMemo(() => {
    const withCoordinates = Array.isArray(orders)
      ? orders.filter((item: any) => Number.isFinite(item?.pickupLat) && Number.isFinite(item?.pickupLng))
      : [];

    if (withCoordinates.length === 0) return MOCK_ORDERS;

    return withCoordinates.slice(0, 12).map((item: any, index: number) => ({
      id: String(item.orderId ?? item.id ?? `route-order-${index + 1}`),
      orderNumber: String(item.orderNumber ?? item.order_display_id ?? `#${String(item.orderId ?? '').slice(0, 6).toUpperCase()}`),
      locality: String(item.pickupLocality ?? item.locality ?? 'Unknown area'),
      distance: typeof item.liveDistanceKm === 'number' ? `${item.liveDistanceKm.toFixed(1)} km` : '—',
      materials: [{ type: 'metal', weight: Number(item.estimatedWeightKg ?? 0) || 0 }],
      price: Number(item.estimatedAmount ?? item.estimatedTotal ?? item.displayAmount ?? 0) || 0,
      lat: Number(item.pickupLat),
      lng: Number(item.pickupLng),
    }));
  }, [orders]);

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

  const totalValue = storeOrders
    .filter(o => selectedIds.includes(o.id))
    .reduce((sum, o) => sum + o.price, 0);

  const openRouteInMaps = async (): Promise<void> => {
    const selectedOrders = storeOrders.filter((order) => selectedIds.includes(order.id));
    if (selectedOrders.length === 0) {
      Alert.alert('No orders selected', 'Select at least one order to open route.');
      return;
    }

    const destinationOrder = selectedOrders[selectedOrders.length - 1];
    const waypointOrders = selectedOrders.slice(0, -1);
    await openExternalDirections({
      destination: { latitude: destinationOrder.lat, longitude: destinationOrder.lng },
      waypoints: waypointOrders.map((order) => ({ latitude: order.lat, longitude: order.lng })),
      errorTitle: 'Unable to open maps',
      errorBody: 'No compatible maps app was found on this device.',
    });
  };

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
            <mapLibre.MapView style={styles.map} mapStyle={OLA_TILE_STYLE_URL}>
              <mapLibre.Camera centerCoordinate={[78.4867, 17.385]} zoomLevel={11} />
              {storeOrders
                .filter((order) => selectedIds.includes(order.id))
                .map((order) => (
                  <mapLibre.PointAnnotation
                    key={order.id}
                    id={`route-order-pin-${order.id}`}
                    coordinate={[order.lng, order.lat]}
                  >
                    <View style={styles.routePointPin} />
                  </mapLibre.PointAnnotation>
                ))}
            </mapLibre.MapView>
          ) : (
            <View style={styles.mapGraphic}>
            {/* Markers */}
            {storeOrders.map(order => (
              <View
                key={order.id}
                style={[
                  styles.marker,
                  {
                    left: `${Math.max(5, Math.min(90, ((order.lng - 78.2) / 0.6) * 100))}%`,
                    top: `${Math.max(5, Math.min(90, ((order.lat - 17.2) / 0.4) * 100))}%`,
                  },
                  !selectedIds.includes(order.id) && { opacity: 0.4 },
                ]}
              >
                <View style={[styles.markerPin, styles.markerOrder]}>
                  <Package size={14} color="#fff" weight="bold" />
                </View>
                <View style={styles.markerLabelBg}>
                  <Text style={styles.markerLabel}>{order.orderNumber}</Text>
                </View>
              </View>
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
            </View>
            {/* TODO: MapLibre requires a dev build. In Expo Go, this renders the search-based geocode fallback. See address-form.tsx for pattern. */}
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

          {/* Action Button */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <PrimaryButton
              label="Open Route in Maps"
              onPress={() => void openRouteInMaps()}
              style={{ backgroundColor: colors.red }}
              disabled={selectedIds.length === 0}
            />
          </View>
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
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
