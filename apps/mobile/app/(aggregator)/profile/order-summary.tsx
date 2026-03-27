/**
 * app/(aggregator)/profile/order-summary.tsx
 * ──────────────────────────────────────────────────────────────────
 * Order Summary screen for Aggregators.
 * Displays completed pickups summary and history.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Clock, MapPin, Star, CheckCircle } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { safeBack } from '../../../utils/navigation';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { MaterialChip } from '../../../components/ui/MaterialChip';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function OrderSummary() {
    const router = useRouter();
    const { aggOrders, fetchAggregatorOrders } = useAggregatorStore();

    useFocusEffect(
        React.useCallback(() => {
            void fetchAggregatorOrders(true);
        }, [fetchAggregatorOrders])
    );

    const completedOrders = (aggOrders || []).filter((order: any) => order.status === 'completed');
    const getAmount = (order: any) => Number(order.display_amount ?? order.displayAmount ?? order.confirmed_value ?? order.confirmedAmount ?? order.estimated_value ?? order.estimatedAmount ?? 0);
    const totalPayout = completedOrders.reduce((sum: number, order: any) => sum + getAmount(order), 0);
    const totalVolume = completedOrders.reduce((sum: number, order: any) => {
        const weights = order.estimated_weights ?? order.estimatedWeights ?? {};
        return sum + Object.values(weights).reduce((itemSum: number, value: any) => itemSum + Number(value || 0), 0);
    }, 0);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <NavBar
                title="Order Summary"
                variant="light"
                onBack={() => safeBack(`/(aggregator)/profile`)}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Strip (Mirroring Seller's Earnings view) */}
                <View style={styles.summaryStrip}>
                    <View style={styles.statBox}>
                        <Text variant="caption" color={colors.muted}>Total Volume</Text>
                        <Numeric size={20} color={colors.navy}>{totalVolume.toFixed(1)}kg</Numeric>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBox}>
                        <Text variant="caption" color={colors.muted}>Pickups</Text>
                        <Numeric size={20} color={colors.navy}>{completedOrders.length}</Numeric>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBox}>
                        <Text variant="caption" color={colors.muted}>Total Payout</Text>
                        <Numeric size={20} color={colors.navy}>₹{totalPayout.toLocaleString('en-IN')}</Numeric>
                    </View>
                </View>

                {/* History Section */}
                <View style={styles.historyHeader}>
                    <Text variant="subheading">Pickup History</Text>
                </View>

                {completedOrders.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle size={48} color={colors.muted} weight="thin" />}
                      heading="No completed pickups yet"
                      body="Completed order history will appear here."
                    />
                ) : completedOrders.map((order: any, index: number) => (
                    <View key={order.orderId || order.id || index} style={styles.orderCard}>
                        <View style={styles.tealBar} />
                        <View style={styles.orderContent}>
                            <View style={styles.orderTop}>
                                <View>
                                    <Numeric size={14} color={colors.navy}>{order.orderNumber ?? order.order_display_id}</Numeric>
                                    <Text variant="caption" color={colors.muted}>{new Date(order.created_at ?? order.createdAt).toLocaleString('en-IN')}</Text>
                                </View>
                                <Numeric size={20} color={colors.teal}>₹{getAmount(order).toLocaleString('en-IN')}</Numeric>
                            </View>

                            <View style={styles.sellerRow}>
                                <Text variant="label" color={colors.slate}>Picked up from {order.seller_name ?? order.sellerName ?? 'Seller'}</Text>
                            </View>

                            <View style={styles.materialsRow}>
                                {(order.material_codes ?? order.materials ?? []).map((m: any, mIndex: number) => (
                                    <MaterialChip key={m.code || m.id || m || mIndex} material={m} variant="chip" />
                                ))}
                            </View>
                        </View>
                    </View>
                ))}

                <View style={styles.listFooter}>
                    <Text variant="caption" color={colors.muted}>Showing all pickups from last 30 days</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
    },
    summaryStrip: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    divider: {
        width: 1,
        height: 32,
        backgroundColor: colors.border,
    },
    historyHeader: {
        marginBottom: spacing.md,
    },
    orderCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    tealBar: {
        width: 4,
        backgroundColor: colors.teal,
    },
    orderContent: {
        flex: 1,
        padding: spacing.md,
        gap: spacing.sm,
    },
    orderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    sellerRow: {
        marginTop: -4,
    },
    materialsRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        flexWrap: 'wrap',
    },
    listFooter: {
        alignItems: 'center',
        paddingVertical: 24,
    },
});
