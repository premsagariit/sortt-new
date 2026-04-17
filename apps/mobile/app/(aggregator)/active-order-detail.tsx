import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { colors, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { BaseCard } from '../../components/ui/Card';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { MapPin, Clock, Hash, NavigationArrow, CheckCircle } from 'phosphor-react-native';
import { useOrderStore } from '../../store/orderStore';
import { getOrderDisplayAmount } from '../../store/orderStore';
import { safeBack } from '../../utils/navigation';
import { CancelOrderModal } from '../../components/domain/CancelOrderModal';
import { useOrderChannel } from '../../hooks/useOrderChannel';

/**
 * app/(aggregator)/active-order-detail.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Order Detail screen — Post-acceptance (Active).
 *
 * Same layout as order-detail.tsx but:
 *  - Full address revealed (no lock overlay)
 *  - Status badge showing "Accepted"
 *  - Navigate + Cancel action buttons (NO Accept / Reject)
 * ──────────────────────────────────────────────────────────────────
 */

export default function ActiveOrderDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { orders, fetchOrder } = useOrderStore();
    const [showCancelModal, setShowCancelModal] = React.useState(false);
    const [currentLocation, setCurrentLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);

    const storeOrder = orders.find(o => o.orderId === id);
    useOrderChannel(
        storeOrder?.orderId ?? id ?? '',
        storeOrder?.orderChannelToken ?? null,
        storeOrder?.chatChannelToken ?? null
    );

    React.useEffect(() => {
        if (id) {
            fetchOrder(id, true);
        }
    }, [id, fetchOrder]);

    React.useEffect(() => {
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

    const distanceLabel = React.useMemo(() => {
        const pickupLat = storeOrder?.pickupLat;
        const pickupLng = storeOrder?.pickupLng;
        if (
            currentLocation &&
            typeof pickupLat === 'number' &&
            typeof pickupLng === 'number'
        ) {
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

        if (typeof storeOrder?.liveDistanceKm === 'number') {
            return `${storeOrder.liveDistanceKm.toFixed(1)} km`;
        }

        return '—';
    }, [currentLocation, storeOrder?.pickupLat, storeOrder?.pickupLng, storeOrder?.liveDistanceKm]);

    const internalOrderId = storeOrder?.orderId ?? id ?? '';
    const displayOrderNumber = storeOrder?.orderNumber ?? `#${String(internalOrderId).slice(0, 8).toUpperCase()}`;

    const itemRows = React.useMemo(() => {
        if (Array.isArray(storeOrder?.orderItems) && storeOrder.orderItems.length > 0) {
            return storeOrder.orderItems.map((item) => {
                const weight = Number(item.confirmedWeightKg ?? item.estimatedWeightKg ?? 0);
                const rate = Number(item.ratePerKg ?? 0);
                const amount = Number(item.amount ?? (weight * rate));
                return {
                    material: item.materialLabel || item.materialCode,
                    weight,
                    rate,
                    amount,
                };
            });
        }

        return Object.entries(storeOrder?.estimatedWeights ?? {}).map(([materialCode, value]) => ({
            material: materialCode.charAt(0).toUpperCase() + materialCode.slice(1),
            weight: Number(value ?? 0),
            rate: 0,
            amount: 0,
        }));
    }, [storeOrder?.orderItems, storeOrder?.estimatedWeights]);

    const computedTotal = itemRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const activeOrder = {
        id: displayOrderNumber,
        distance: distanceLabel,
        locality: storeOrder?.pickupLocality ?? '—',
        address: storeOrder?.pickupAddress ?? 'Address available after acceptance',
        window: storeOrder?.window ?? 'Flexible',
        status: storeOrder?.status ?? 'accepted',
        items: itemRows,
        totalEst: storeOrder ? getOrderDisplayAmount(storeOrder as any) : computedTotal,
    };

    const statusLabel =
        activeOrder.status === 'en_route' ? 'On the Way' :
            activeOrder.status === 'arrived' ? 'Arrived' :
                activeOrder.status === 'weighing_in_progress' ? 'Weighing' :
                    'Accepted';

    const statusColor =
        activeOrder.status === 'arrived' || activeOrder.status === 'weighing_in_progress'
            ? colors.teal : colors.navy;

    const routeToExecutionStage = () => {
        if (!internalOrderId) return;

        if (activeOrder.status === 'weighing_in_progress') {
            router.push({
                pathname: '/(aggregator)/execution/otp/[id]',
                params: { id: internalOrderId },
            } as any);
            return;
        }

        if (activeOrder.status === 'arrived') {
            router.push(`/(aggregator)/execution/weighing/${internalOrderId}` as any);
            return;
        }

        router.push({
            pathname: '/(aggregator)/execution/navigate',
            params: { id: internalOrderId },
        } as any);
    };

    const canRaiseDispute = storeOrder?.status === 'completed';

    // ── Summary strip ──────────────────────────────────────────────
    const renderSummaryStrip = () => (
        <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
                <Hash size={16} color={colors.muted} />
                <Text variant="label" color={colors.navy} style={styles.monoText}>
                    {activeOrder.id}
                </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
                <NavigationArrow size={16} color={colors.muted} weight="fill" />
                <Text variant="label" color={colors.navy} style={styles.monoText}>
                    {activeOrder.distance}
                </Text>
            </View>
            <View style={styles.summaryDivider} />
            {/* Status pill */}
            <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
                <CheckCircle size={12} color={statusColor} weight="fill" />
                <Text variant="caption" style={[styles.statusText, { color: statusColor }]}>
                    {statusLabel}
                </Text>
            </View>
        </View>
    );

    // ── Materials table ────────────────────────────────────────────
    const renderMaterialsTable = () => (
        <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
                <Text variant="caption" style={[styles.col, styles.colMaterial]}>MATERIAL</Text>
                <Text variant="caption" style={[styles.col, styles.colWeight]}>WEIGHT</Text>
            </View>
            {activeOrder.items.map((item, idx) => (
                <View
                    key={item.material}
                    style={[styles.tableRow, idx === activeOrder.items.length - 1 && { borderBottomWidth: 0 }]}
                >
                    <Text variant="label" color={colors.navy} style={[styles.col, styles.colMaterial]}>
                        {item.material}
                    </Text>
                    <Numeric size={14} style={[styles.col, styles.colWeight, { color: colors.teal }]}>
                        {item.weight.toFixed(1)} kg
                    </Numeric>
                </View>
            ))}
        </View>
    );

    // ── Location card (full address revealed) ──────────────────────
    const renderLocationCard = () => (
        <BaseCard style={styles.locationCard}>
            <View style={styles.locationContent}>
                <View style={styles.locationInfo}>
                    <View style={styles.localityHeader}>
                        <MapPin size={18} color={colors.teal} weight="fill" />
                        <Text variant="subheading" color={colors.navy} style={styles.localityText}>
                            {activeOrder.locality}
                        </Text>
                    </View>
                    <Text variant="caption" color={colors.slate} style={styles.addressText}>
                        {activeOrder.address}
                    </Text>
                    <View style={styles.windowInfo}>
                        <Clock size={14} color={colors.muted} />
                        <Text variant="caption" color={colors.muted} style={{ marginLeft: 4 }}>
                            {activeOrder.window}
                        </Text>
                    </View>
                </View>

                {/* Address unlocked badge */}
                <View style={styles.unlockedBadge}>
                    <CheckCircle size={12} color={colors.teal} weight="fill" />
                    <Text variant="caption" color={colors.teal} style={styles.lockLabel}>UNLOCKED</Text>
                </View>
            </View>

            {/* Map placeholder showing full location */}
            <View style={styles.mapPlaceholder}>
                <View style={styles.mapOverlay}>
                    <View style={styles.mapCenter}>
                        <View style={styles.mapPinLarge}>
                            <MapPin size={36} color={colors.teal} weight="fill" />
                        </View>
                        <Text variant="caption" color={colors.slate} style={styles.mapCaption}>
                            {activeOrder.locality}
                        </Text>
                    </View>
                    <View style={styles.navigateBanner}>
                        <NavigationArrow size={14} color={colors.surface} weight="fill" />
                        <Text variant="caption" color={colors.surface} style={{ marginLeft: 8, fontWeight: '600' }}>
                            Tap Navigate to get directions
                        </Text>
                    </View>
                </View>
            </View>
        </BaseCard>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <NavBar
                title="Active Order"
                variant="light"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderSummaryStrip()}

                <View style={styles.content}>
                    <View style={styles.sectionHeader}>
                        <Text variant="label" color={colors.muted} style={styles.sectionTitle}>
                            MATERIALS LIST
                        </Text>
                    </View>
                    {renderMaterialsTable()}

                    <View style={styles.sectionHeader}>
                        <Text variant="label" color={colors.muted} style={styles.sectionTitle}>
                            PICKUP LOCATION
                        </Text>
                    </View>
                    {renderLocationCard()}
                </View>
            </ScrollView>

            {/* ── Sticky Bottom Bar ───────────────────────────────── */}
            <View style={styles.bottomBar}>
                {canRaiseDispute ? (
                    <PrimaryButton
                        label="Raise Dispute"
                        style={styles.disputeBtn}
                        textStyle={styles.btnText}
                        onPress={() =>
                            router.push({
                                pathname: '/(shared)/dispute',
                                params: {
                                    orderId: internalOrderId,
                                    fallbackRoute: '/(aggregator)/orders',
                                },
                            } as any)
                        }
                    />
                ) : (
                    <>
                        <SecondaryButton
                            label="Cancel"
                            style={styles.cancelBtn}
                            textStyle={{ color: colors.red, fontFamily: 'DMSans-Bold' }}
                            onPress={() => setShowCancelModal(true)}
                        />
                        <PrimaryButton
                            label={
                                activeOrder.status === 'weighing_in_progress'
                                    ? 'Continue OTP'
                                    : activeOrder.status === 'arrived'
                                        ? 'Start Weighing'
                                        : 'Navigate'
                            }
                            style={styles.navigateBtn}
                            textStyle={styles.btnText}
                            onPress={routeToExecutionStage}
                        />
                    </>
                )}
            </View>

            {/* Cancel modal */}
            {showCancelModal && (
                <CancelOrderModal
                    orderId={internalOrderId}
                    onClose={() => setShowCancelModal(false)}
                    onConfirm={() => {
                        // onConfirm is only called after successful API cancel
                        safeBack('/(aggregator)/orders');
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    summaryStrip: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    monoText: { fontSize: 13, fontFamily: 'DMMono-Medium' },
    summaryDivider: { width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: 4 },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: { fontSize: 11, fontFamily: 'DMSans-Bold' },

    scrollContent: { paddingBottom: 120 },
    content: { padding: spacing.md },
    sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 4 },
    sectionTitle: { letterSpacing: 1.2, fontSize: 11, fontFamily: 'DMSans-Bold' },

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
    col: { flex: 1 },
    colMaterial: { flex: 3 },
    colWeight: { flex: 2, textAlign: 'right' },

    locationCard: { padding: spacing.md, gap: spacing.md },
    locationContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    locationInfo: { flex: 1, gap: 4 },
    localityHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    localityText: { fontSize: 16, fontFamily: 'DMSans-Bold' },
    addressText: { paddingLeft: 24, lineHeight: 18 },
    windowInfo: { flexDirection: 'row', alignItems: 'center', paddingLeft: 24, marginTop: 2 },
    unlockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4,
    },
    lockLabel: { fontSize: 9, fontFamily: 'DMSans-Bold' },

    mapPlaceholder: {
        height: 180,
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    mapOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    mapCenter: { alignItems: 'center', gap: 8 },
    mapPinLarge: { alignItems: 'center', justifyContent: 'center' },
    mapCaption: { fontFamily: 'DMSans-Medium', opacity: 0.8 },
    navigateBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.teal,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
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
        paddingBottom: 24,
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderColor: colors.red,
    },
    navigateBtn: {
        flex: 2,
        height: 48,
        backgroundColor: colors.teal,
    },
    disputeBtn: {
        flex: 1,
        height: 48,
        backgroundColor: colors.red,
    },
    btnText: { fontSize: 14, fontFamily: 'DMSans-Bold' },
});
