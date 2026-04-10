import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, BackHandler, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { CheckCircle, Clock, MapPin, NavigationArrow } from 'phosphor-react-native';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { BaseCard } from '../../../components/ui/Card';
import { useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { api } from '../../../lib/api';
import { getMapRenderAvailability } from '../../../utils/mapAvailable';
import { getMapLibreModule } from '../../../lib/maplibre';
import { type AuthenticatedMapStyle, getAuthenticatedMapStyle, OLA_TILE_STYLE_URL } from '../../../lib/olaMaps';
import { openExternalDirections } from '../../../utils/mapNavigation';

type ConfirmState = 'waiting' | 'verified';

export default function ConfirmScreen() {
    const [state, setState] = useState<ConfirmState>('waiting');
    const insets = useSafeAreaInsets();
    const pulseAnim = React.useRef(new Animated.Value(1)).current;
    const { id } = useLocalSearchParams<{ id: string }>();
    const { orders, fetchOrder } = useOrderStore();
    const { executionDraftByOrderId } = useAggregatorStore();
    const [resolvedPickupCoords, setResolvedPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [authenticatedMapStyle, setAuthenticatedMapStyle] = React.useState<AuthenticatedMapStyle | null>(null);
    const mapAvailability = React.useMemo(() => getMapRenderAvailability(), []);
    const mapLibre = React.useMemo(() => (mapAvailability.canRenderMap ? getMapLibreModule() : null), [mapAvailability.canRenderMap]);
    const canRenderMap = Boolean(mapAvailability.canRenderMap && mapLibre && authenticatedMapStyle);
    const order = orders.find((o) => o.orderId === id);
    const draft = id ? executionDraftByOrderId[id] : undefined;

    useEffect(() => {
        if (id && !order) {
            fetchOrder(id, true);
        }
    }, [id, order, fetchOrder]);

    useEffect(() => {
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
            .catch(() => {
                if (isMounted) setAuthenticatedMapStyle(null);
            });

        return () => {
            isMounted = false;
        };
    }, [mapAvailability.canRenderMap, mapLibre, OLA_TILE_STYLE_URL]);

    useEffect(() => {
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

    useEffect(() => {
        let mounted = true;

        const detectCurrentLocation = async () => {
            try {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (permission.status !== 'granted') return;
                const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (!mounted) return;
                setCurrentLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
            } catch {
            }
        };

        void detectCurrentLocation();
        return () => {
            mounted = false;
        };
    }, []);

    const internalOrderId = order?.orderId ?? id ?? 'ORD-24091';
    const displayOrderNumber = order?.orderNumber ?? `#${String(internalOrderId).slice(0, 8).toUpperCase()}`;
    const totalWeight = draft?.totalWeight ?? (order?.lineItems?.reduce((sum, item) => sum + Number(item.weightKg || 0), 0) ?? 0);
    const totalAmount = draft?.totalAmount ?? Number(order?.displayAmount ?? order?.confirmedAmount ?? order?.estimatedAmount ?? 0);
    const itemCount = draft?.lineItems?.length ?? order?.materials?.length ?? 0;

    // Block back button
    useEffect(() => {
        const backAction = () => {
            return true; // Block back action
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, []);

    // Pulse animation for waiting state
    useEffect(() => {
        if (state === 'waiting') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Auto-advance after 3 seconds
            const timer = setTimeout(() => {
                setState('verified');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [state]);

    const handleFinish = () => {
        router.push({ pathname: '/(aggregator)/execution/receipt', params: { id: internalOrderId } } as any);
    };

    const openPickupNavigation = async () => {
        if (!resolvedPickupCoords) return;
        await openExternalDirections({
            origin: currentLocation ?? undefined,
            destination: resolvedPickupCoords,
            errorTitle: 'Unable to open navigation',
            errorBody: 'No compatible maps app was found on this device.',
        });
    };

    return (
        <View style={styles.container}>
            <NavBar
                variant="light"
                title={state === 'waiting' ? `Order ${displayOrderNumber}` : 'Pickup Confirmation'}
                onBack={undefined}
            />

            <View style={styles.content}>
                {state === 'waiting' ? (
                    <View style={styles.waitingContainer}>
                        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                            <View style={styles.pulseInner}>
                                <Clock size={48} color={colors.amber} weight="duotone" />
                            </View>
                        </Animated.View>
                        <Text variant="heading" style={styles.waitingTitle}>
                            Waiting for seller...
                        </Text>
                        <Text variant="body" color={colors.muted} style={styles.subtitle}>
                            The seller is reviewing the weights on their app. Once they confirm, the pickup will be verified.
                        </Text>

                        <BaseCard style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text variant="label" color={colors.muted}>Items Collected</Text>
                                <Numeric size={13} style={styles.monoText}>{itemCount} Items</Numeric>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text variant="label" color={colors.muted}>Total Weight</Text>
                                <Numeric size={13} style={styles.monoText}>{totalWeight.toFixed(2)} <Text variant="caption" style={{ color: colors.amber }}>kg</Text></Numeric>
                            </View>
                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text variant="subheading" style={{ color: colors.navy }}>Payload Value</Text>
                                <Numeric size={17} style={{ color: colors.amber, fontFamily: 'DMMono-Bold' }}>₹{totalAmount.toFixed(0)}</Numeric>
                            </View>
                        </BaseCard>

                        <BaseCard style={styles.pickupCard}>
                            <View style={styles.pickupHeader}>
                                <MapPin size={16} color={colors.teal} weight="fill" />
                                <Text variant="label" color={colors.slate}>PICKUP LOCATION</Text>
                            </View>
                            <Text variant="subheading" style={{ color: colors.navy, marginBottom: spacing.xs }}>
                                {order?.pickupLocality || 'Pickup Location'}
                            </Text>
                            <Text variant="body" color={colors.slate} style={{ marginBottom: spacing.md }}>
                                {order?.pickupAddress || 'Address unavailable'}
                            </Text>

                            <Pressable onPress={() => void openPickupNavigation()} style={styles.pickupMapWrap}>
                                {resolvedPickupCoords && canRenderMap && mapLibre ? (
                                    <mapLibre.MapView style={styles.pickupMap} mapStyle={authenticatedMapStyle ?? undefined}>
                                        <mapLibre.Camera
                                            centerCoordinate={[resolvedPickupCoords.longitude, resolvedPickupCoords.latitude]}
                                            zoomLevel={14}
                                        />
                                        <mapLibre.PointAnnotation
                                            id="confirm-pickup-point"
                                            coordinate={[resolvedPickupCoords.longitude, resolvedPickupCoords.latitude]}
                                        >
                                            <View style={styles.pickupPointPin} />
                                        </mapLibre.PointAnnotation>
                                    </mapLibre.MapView>
                                ) : (
                                    <View style={styles.pickupMapFallback}>
                                        <MapPin size={28} color={colors.teal} weight="fill" />
                                        <Text variant="body" color={colors.slate} style={{ marginTop: spacing.xs }}>
                                            {mapAvailability.heading || 'Map preview unavailable'}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.navigateHintBar}>
                                    <NavigationArrow size={16} color={colors.surface} />
                                    <Text variant="body" color={colors.surface}>Tap map to get directions</Text>
                                </View>
                            </Pressable>

                            <SecondaryButton
                                label="Navigate"
                                onPress={() => void openPickupNavigation()}
                                style={styles.navigateBtn}
                            />
                        </BaseCard>
                    </View>
                ) : (
                    <View style={styles.verifiedContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: colorExtended.tealLight }]}>
                            <CheckCircle size={64} color={colors.teal} weight="fill" />
                        </View>
                        <Text variant="heading" style={styles.verifiedTitle}>
                            Pickup Verified!
                        </Text>
                        <Text variant="body" color={colors.muted} style={styles.subtitle}>
                            The seller has confirmed the weights and the transaction is complete.
                        </Text>

                        <BaseCard style={[styles.summaryCard, { borderColor: colors.teal, backgroundColor: colorExtended.tealLight + '20' }] as any}>
                            <View style={styles.summaryRow}>
                                <Text variant="label" color={colors.muted}>Final Weight</Text>
                                <Numeric size={13} style={styles.monoText}>{totalWeight.toFixed(2)} kg</Numeric>
                            </View>
                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text variant="subheading" style={{ color: colors.navy }}>Total Payment</Text>
                                <Numeric size={17} style={{ color: colors.amber, fontFamily: 'DMMono-Bold' }}>₹{totalAmount.toFixed(0)}</Numeric>
                            </View>
                        </BaseCard>

                        <BaseCard style={styles.pickupCard}>
                            <View style={styles.pickupHeader}>
                                <MapPin size={16} color={colors.teal} weight="fill" />
                                <Text variant="label" color={colors.slate}>PICKUP LOCATION</Text>
                            </View>
                            <Text variant="subheading" style={{ color: colors.navy, marginBottom: spacing.xs }}>
                                {order?.pickupLocality || 'Pickup Location'}
                            </Text>
                            <Text variant="body" color={colors.slate} style={{ marginBottom: spacing.md }}>
                                {order?.pickupAddress || 'Address unavailable'}
                            </Text>

                            <Pressable onPress={() => void openPickupNavigation()} style={styles.pickupMapWrap}>
                                {resolvedPickupCoords && canRenderMap && mapLibre ? (
                                    <mapLibre.MapView style={styles.pickupMap} mapStyle={authenticatedMapStyle ?? undefined}>
                                        <mapLibre.Camera
                                            centerCoordinate={[resolvedPickupCoords.longitude, resolvedPickupCoords.latitude]}
                                            zoomLevel={14}
                                        />
                                        <mapLibre.PointAnnotation
                                            id="confirm-verified-pickup-point"
                                            coordinate={[resolvedPickupCoords.longitude, resolvedPickupCoords.latitude]}
                                        >
                                            <View style={styles.pickupPointPin} />
                                        </mapLibre.PointAnnotation>
                                    </mapLibre.MapView>
                                ) : (
                                    <View style={styles.pickupMapFallback}>
                                        <MapPin size={28} color={colors.teal} weight="fill" />
                                        <Text variant="body" color={colors.slate} style={{ marginTop: spacing.xs }}>
                                            {mapAvailability.heading || 'Map preview unavailable'}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.navigateHintBar}>
                                    <NavigationArrow size={16} color={colors.surface} />
                                    <Text variant="body" color={colors.surface}>Tap map to get directions</Text>
                                </View>
                            </Pressable>

                            <SecondaryButton
                                label="Navigate"
                                onPress={() => void openPickupNavigation()}
                                style={styles.navigateBtn}
                            />
                        </BaseCard>
                    </View>
                )}
            </View>

            {/* Bottom Action Bar (Verified state only) */}
            {state === 'verified' && (
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <PrimaryButton
                        label="✓ Mark Pickup Complete"
                        onPress={handleFinish}
                        style={{ backgroundColor: colors.teal }}
                    />
                </View>
            )}

            {/* Bottom SafeArea for waiting state (ensure layout consistency) */}
            {state === 'waiting' && <SafeAreaView edges={['bottom']} />}
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
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    waitingContainer: {
        alignItems: 'center',
    },
    verifiedContainer: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.amberLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    pulseInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(183, 121, 31, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    waitingTitle: {
        color: colors.navy,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    verifiedTitle: {
        color: colors.teal,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: spacing.xxl,
        lineHeight: 22,
    },
    summaryCard: {
        width: '100%',
        padding: spacing.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    pickupCard: {
        width: '100%',
        marginTop: spacing.lg,
        padding: spacing.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    pickupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    pickupMapWrap: {
        height: 180,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.input,
        overflow: 'hidden',
        backgroundColor: colors.surface2,
        marginBottom: spacing.md,
    },
    pickupMap: {
        ...StyleSheet.absoluteFillObject,
    },
    pickupPointPin: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.red,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    pickupMapFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navigateHintBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 44,
        backgroundColor: colors.teal,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    navigateBtn: {
        borderColor: colors.teal,
        backgroundColor: colors.surface,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    totalRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginBottom: 0,
    },
    monoText: {
        fontFamily: 'DMMono-Medium',
        color: colors.navy,
    },
    footer: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
