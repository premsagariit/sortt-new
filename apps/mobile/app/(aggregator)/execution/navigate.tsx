import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Globe, Phone, ChatCenteredText, MapTrifold, CaretLeft, MapPin } from 'phosphor-react-native';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { BaseCard } from '../../../components/ui/Card';
import { safeBack } from '../../../utils/navigation';
import { useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function NavigateScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

    const internalOrderId = order?.orderId ?? id ?? 'ORD-24091';
    const displayOrderNumber = order?.orderNumber ?? `#${String(internalOrderId).slice(0, 8).toUpperCase()}`;

    const handleBack = () => {
        safeBack('/(aggregator)/orders');
    };

    const handleNextState = async () => {
        const currentStatus = order?.status === 'en_route' ? 'en_route' : 'accepted';
        const nextStatus = currentStatus === 'accepted' ? 'en_route' : 'arrived';

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            await updateOrderStatusApi(internalOrderId, nextStatus);

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
    const displayPhone = order?.sellerPhone ?? 'Phone unavailable';
    const displayAddress = order?.pickupAddress ?? 'Address unavailable';
    const displayCoords = order?.pickupLat != null && order?.pickupLng != null
        ? `${order.pickupLat.toFixed(5)}, ${order.pickupLng.toFixed(5)}`
        : null;

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
                {displayCoords ? (
                    <View style={styles.mapGrid}>
                        <Globe size={120} color={colors.navy} weight="thin" style={{ opacity: 0.1 }} />
                        <Numeric size={13} color={colors.muted} style={styles.mapText}>
                            {displayCoords}
                        </Numeric>
                    </View>
                ) : (
                    <View style={styles.mapGrid}>
                        <EmptyState
                          icon={<MapPin size={48} color={colors.muted} weight="thin" />}
                          heading="Location unavailable"
                          body="Pickup coordinates are not available for this order yet."
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
                            <Text variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                                {displayPhone}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.callButton}>
                            <Phone size={24} color={colors.teal} weight="fill" />
                        </TouchableOpacity>
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

                {!isEnRoute ? (
                    <View style={styles.dualActions}>
                        <SecondaryButton
                            label="Chat"
                            onPress={() => router.push(`/(shared)/chat/${internalOrderId}` as any)}
                            style={styles.chatButton}
                            icon={<ChatCenteredText size={20} color={colors.navy} />}
                            disabled={isSubmitting}
                        />
                        <PrimaryButton
                            label="Mark On The Way!"
                            onPress={handleNextState}
                            style={styles.enRouteButton}
                            loading={isSubmitting}
                        />
                    </View>
                ) : (
                    <PrimaryButton
                        label="✓ I've Arrived"
                        onPress={handleNextState}
                        style={[styles.arrivedButton, { backgroundColor: colors.teal }]}
                        loading={isSubmitting}
                    />
                )}
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
    dualActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    chatButton: {
        flex: 1,
    },
    enRouteButton: {
        flex: 2,
    },
    arrivedButton: {
        width: '100%',
    },
});
