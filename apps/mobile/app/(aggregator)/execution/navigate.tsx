import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Globe, Phone, ChatCenteredText, MapPin } from 'phosphor-react-native';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { BaseCard } from '../../../components/ui/Card';
import { safeBack } from '../../../utils/navigation';
import { useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { api } from '../../../lib/api';
import { MAP_RENDERING_AVAILABLE } from '../../../utils/mapAvailable';
import { getMapLibreModule } from '../../../lib/maplibre';
import { OLA_TILE_STYLE_URL } from '../../../lib/olaMaps';
import { openExternalDirections } from '../../../utils/mapNavigation';

export default function NavigateScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [resolvedPickupCoords, setResolvedPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const mapLibre = React.useMemo(() => (MAP_RENDERING_AVAILABLE ? getMapLibreModule() : null), []);
    const canRenderMap = Boolean(MAP_RENDERING_AVAILABLE && mapLibre && OLA_TILE_STYLE_URL);
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { orders, fetchOrder } = useOrderStore();
    const { updateOrderStatusApi } = useAggregatorStore();
    const order = orders.find((o) => o.orderId === id);

    React.useEffect(() => {
        if (id && !order) {
            fetchOrder(id, true);
        }
    }, [id, order, fetchOrder]);

    React.useEffect(() => {
        if (!order) return;

        // Forward-only execution flow: once order advances, prevent returning
        // to navigate/arrived stage via back stack.
        if (['arrived', 'weighing_in_progress', 'completed', 'cancelled', 'disputed'].includes(order.status)) {
            router.replace('/(aggregator)/orders');
        }
    }, [order?.status]);

    React.useEffect(() => {
        let isMounted = true;

        const resolvePickupCoords = async () => {
            if (order?.pickupLat != null && order?.pickupLng != null) {
                setResolvedPickupCoords({ latitude: order.pickupLat, longitude: order.pickupLng });
                return;
            }

            const addressText = (order?.pickupAddress ?? '').trim();
            if (!addressText) {
                setResolvedPickupCoords(null);
                return;
            }

            try {
                const geocodeRes = await api.get('/api/maps/geocode', { params: { address: addressText } });
                const lat = Number(geocodeRes.data?.lat);
                const lng = Number(geocodeRes.data?.lng);
                if (!isMounted) return;
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    setResolvedPickupCoords({ latitude: lat, longitude: lng });
                    return;
                }
            } catch {
                try {
                    const geocoded = await Location.geocodeAsync(addressText);
                    if (!isMounted) return;
                    if (Array.isArray(geocoded) && geocoded.length > 0) {
                        setResolvedPickupCoords({ latitude: geocoded[0].latitude, longitude: geocoded[0].longitude });
                        return;
                    }
                } catch {
                }
            }

            if (isMounted) setResolvedPickupCoords(null);
        };

        void resolvePickupCoords();

        return () => {
            isMounted = false;
        };
    }, [order?.pickupLat, order?.pickupLng, order?.pickupAddress]);

    React.useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        let mounted = true;
        const terminalStatuses: ReadonlyArray<string> = ['arrived', 'weighing_in_progress', 'completed', 'cancelled', 'disputed'];

        const startTracking = async () => {
            try {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (permission.status !== 'granted') return;

                const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (!mounted) return;

                const firstPoint = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
                setCurrentLocation(firstPoint);

                if (id) {
                    await api.post('/api/aggregators/heartbeat', {
                        is_online: true,
                        order_id: id,
                        latitude: firstPoint.latitude,
                        longitude: firstPoint.longitude,
                    }).catch(() => {});
                }

                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 8000,
                        distanceInterval: 20,
                    },
                    (position) => {
                        if (terminalStatuses.includes(order?.status ?? '')) {
                            return;
                        }

                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;
                        setCurrentLocation({ latitude, longitude });

                        if (id) {
                            api.post('/api/aggregators/heartbeat', {
                                is_online: true,
                                order_id: id,
                                latitude,
                                longitude,
                            }).catch(() => {
                                // keep non-blocking; heartbeat retries on next location tick
                            });
                        }
                    }
                );
            } catch {
            }
        };

        void startTracking();

        return () => {
            mounted = false;
            if (subscription) subscription.remove();
        };
    }, [id, order?.status]);

    const internalOrderId = order?.orderId ?? id ?? 'ORD-24091';
    const navUserId = useAuthStore((s: any) => s.userId);
    const chatUnread = useChatStore((state) => {
        if (!navUserId || !internalOrderId) return 0;
        return (state.messages[internalOrderId] ?? []).filter(m => m.senderId !== navUserId && !m.read).length;
    });
    const displayOrderNumber = order?.orderNumber ?? `#${String(internalOrderId).slice(0, 8).toUpperCase()}`;

    const handleBack = () => {
        router.replace('/(aggregator)/orders');
    };

    const handleNextState = async () => {
        const currentStatus = order?.status === 'en_route' ? 'en_route' : 'accepted';
        const nextStatus = currentStatus === 'accepted' ? 'en_route' : 'arrived';

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            await updateOrderStatusApi(internalOrderId, nextStatus, undefined, currentLocation);

            if (nextStatus === 'en_route') {
                await openNavigationRoute();
            }

            if (nextStatus === 'arrived') {
                router.push(`/(aggregator)/execution/weighing/${internalOrderId}` as any);
            }
        } catch (err: any) {
            console.error('Failed to update execution status:', err);
            setErrorMsg(err?.response?.data?.error ?? err?.message ?? 'Failed to update order status');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEnRoute = order?.status === 'en_route';
    const displaySeller = order?.sellerName ?? 'Seller';
    const displayPhone = order?.sellerPhone ?? null;
    const displayAddress = order?.pickupAddress ?? 'Address unavailable';
    const displayCoords = resolvedPickupCoords
        ? `${resolvedPickupCoords.latitude.toFixed(5)}, ${resolvedPickupCoords.longitude.toFixed(5)}`
        : null;

    const liveDistanceLabel = React.useMemo(() => {
        if (!currentLocation || !resolvedPickupCoords) return null;

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const earthRadiusKm = 6371;
        const deltaLat = toRad(resolvedPickupCoords.latitude - currentLocation.latitude);
        const deltaLng = toRad(resolvedPickupCoords.longitude - currentLocation.longitude);
        const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(toRad(currentLocation.latitude)) * Math.cos(toRad(resolvedPickupCoords.latitude)) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return `${(earthRadiusKm * c).toFixed(1)} km`;
    }, [currentLocation, resolvedPickupCoords]);

    const openNavigationRoute = React.useCallback(async () => {
        if (!currentLocation || !resolvedPickupCoords) return;
        await openExternalDirections({
            origin: currentLocation,
            destination: resolvedPickupCoords,
            errorTitle: 'Unable to open navigation',
            errorBody: 'No compatible maps app was found on this device.',
        });
    }, [currentLocation, resolvedPickupCoords]);

    return (
        <View style={styles.container}>
            {/* NavBar - Light variant as per spec */}
            <NavBar
                variant="light"
                title={`Order ${displayOrderNumber}`}
                onBack={handleBack}
            />

            {/* Map View Placeholder */}
            <View style={styles.mapContainer}>
                {resolvedPickupCoords ? (
                    canRenderMap && mapLibre ? (
                        <mapLibre.MapView style={styles.map} mapStyle={OLA_TILE_STYLE_URL}>
                            <mapLibre.Camera
                                centerCoordinate={
                                    currentLocation
                                        ? [
                                            (currentLocation.longitude + resolvedPickupCoords.longitude) / 2,
                                            (currentLocation.latitude + resolvedPickupCoords.latitude) / 2,
                                        ]
                                        : [resolvedPickupCoords.longitude, resolvedPickupCoords.latitude]
                                }
                                zoomLevel={currentLocation ? 13 : 14}
                            />
                            {currentLocation ? (
                                <mapLibre.PointAnnotation
                                    id="agg-current-location"
                                    coordinate={[currentLocation.longitude, currentLocation.latitude]}
                                >
                                    <View style={styles.currentPointPin} />
                                </mapLibre.PointAnnotation>
                            ) : null}
                            <mapLibre.PointAnnotation
                                id="agg-seller-location"
                                coordinate={[resolvedPickupCoords.longitude, resolvedPickupCoords.latitude]}
                            >
                                <View style={styles.sellerPointPin} />
                            </mapLibre.PointAnnotation>
                            {currentLocation ? (
                                <mapLibre.ShapeSource
                                    id="agg-route-line-source"
                                    shape={{
                                        type: 'Feature',
                                        geometry: {
                                            type: 'LineString',
                                            coordinates: [
                                                [currentLocation.longitude, currentLocation.latitude],
                                                [resolvedPickupCoords.longitude, resolvedPickupCoords.latitude],
                                            ],
                                        },
                                        properties: {},
                                    } as any}
                                >
                                    <mapLibre.LineLayer
                                        id="agg-route-line-layer"
                                        style={{ lineColor: colors.teal, lineWidth: 3 }}
                                    />
                                </mapLibre.ShapeSource>
                            ) : null}
                        </mapLibre.MapView>
                    ) : (
                        <View style={styles.mapGrid}>
                            <EmptyState
                                icon={<MapPin size={48} color={colors.muted} weight="thin" />}
                                heading="Map unavailable in Expo Go"
                                body="Location tracking continues and navigation opens in your maps app."
                            />
                            {/* TODO: MapLibre requires a dev build. In Expo Go, this renders the search-based geocode fallback. See address-form.tsx for pattern. */}
                        </View>
                    )
                ) : (
                    <View style={styles.mapGrid}>
                        <EmptyState
                          icon={<MapPin size={48} color={colors.muted} weight="thin" />}
                          heading="Location unavailable"
                                                    body="Pickup coordinates could not be resolved for this order."
                        />
                    </View>
                )}
            </View>

            {/* Location Card Overlay */}
            <View style={styles.overlayContainer}>
                <BaseCard style={styles.locationCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.locationInfo}>
                            <Text variant="subheading" style={styles.sellerName}>
                                {displaySeller}
                            </Text>
                            <Text variant="body" style={styles.addressText}>
                                {displayAddress}
                            </Text>
                            {liveDistanceLabel ? (
                                <Text variant="caption" color={colors.teal} style={{ marginTop: spacing.xs }}>
                                    {liveDistanceLabel}
                                </Text>
                            ) : null}
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                style={[styles.callButton, !displayPhone && styles.callButtonDisabled]}
                                disabled={!displayPhone}
                                onPress={async () => {
                                    if (!displayPhone) return;
                                    const telUrl = `tel:${displayPhone}`;
                                    const canOpen = await Linking.canOpenURL(telUrl);
                                    if (canOpen) {
                                        await Linking.openURL(telUrl);
                                    }
                                }}
                            >
                                <Phone size={24} color={colors.teal} weight="fill" />
                            </TouchableOpacity>
                            <View style={styles.chatBtnWrapper}>
                                <TouchableOpacity
                                    style={styles.callButton}
                                    onPress={() => router.push(`/(shared)/chat/${internalOrderId}` as any)}
                                >
                                    <ChatCenteredText size={24} color={colors.navy} weight="fill" />
                                </TouchableOpacity>
                                {chatUnread > 0 && (
                                    <View style={styles.chatBadge}>
                                        <Text variant="caption" color={colors.surface} style={styles.chatBadgeText}>
                                            {chatUnread > 99 ? '99+' : String(chatUnread)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </BaseCard>
            </View>

            {/* Fixed Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                {errorMsg && (
                    <Text variant="caption" color={colors.red} style={styles.errorText}>
                        {errorMsg}
                    </Text>
                )}

                <PrimaryButton
                    label={isEnRoute ? "✓ I've Arrived" : "Mark On The Way!"}
                    onPress={handleNextState}
                    style={isEnRoute ? [styles.arrivedButton, { backgroundColor: colors.teal }] : styles.arrivedButton}
                    loading={isSubmitting}
                />
            </View>

            {/* SafeAreaView edges={['bottom']} implicitly handled by bottomBar padding */}
            <SafeAreaView edges={['bottom']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="none" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    navAction: {
        padding: spacing.xs,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: colors.surface2,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    currentPointPin: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.navy,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    sellerPointPin: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.red,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    mapGrid: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapText: {
        marginTop: spacing.sm,
        color: colors.muted,
    },
    overlayContainer: {
        position: 'absolute',
        bottom: 120, // Space for bottom bar
        left: spacing.md,
        right: spacing.md,
    },
    locationCard: {
        padding: spacing.md,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    locationInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    sellerName: {
        color: colors.navy,
        marginBottom: spacing.xs,
    },
    addressText: {
        color: colors.slate,
        fontSize: 14,
        lineHeight: 20,
    },
    callButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colorExtended.tealLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xs,
    },
    callButtonDisabled: {
        opacity: 0.5,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    errorText: {
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    cardActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    chatBtnWrapper: {
        position: 'relative',
    },
    chatBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.red,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: colors.surface,
        zIndex: 10,
    },
    chatBadgeText: {
        fontSize: 10,
        lineHeight: 12,
        fontFamily: 'DMSans-Bold',
    },
    arrivedButton: {
        width: '100%',
    },
});
