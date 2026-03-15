/**
 * app/(aggregator)/profile/order-summary.tsx
 * ──────────────────────────────────────────────────────────────────
 * Order Summary screen for Aggregators.
 * Displays completed pickups summary and history.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { safeBack } from '../../../utils/navigation';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { MaterialChip } from '../../../components/ui/MaterialChip';

// Mock transaction data based on aggregator's perspective
const COMPLETED_ORDERS = [
    {
        orderId: 'ORD-2841',
        orderNumber: '#000001',
        date: 'Today, 2:45 PM',
        amount: 1240,
        materials: ['metal', 'plastic'],
        seller: 'Amit R.',
    },
    {
        orderId: 'ORD-1001',
        orderNumber: '#000002',
        date: 'Yesterday, 11:20 AM',
        amount: 680,
        materials: ['paper'],
        seller: 'Priya S.',
    },
    {
        orderId: 'ORD-7777',
        orderNumber: '#000003',
        date: '4 Mar 2026',
        amount: 2150,
        materials: ['paper', 'plastic'],
        seller: 'Kiran K.',
    },
    {
        orderId: 'ORD-24091',
        orderNumber: '#000004',
        date: '3 Mar 2026',
        amount: 1890,
        materials: ['metal', 'plastic'],
        seller: 'Suresh M.',
    },
];

export default function OrderSummary() {
    const router = useRouter();

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
                        <Numeric size={20} color={colors.navy}>1,420kg</Numeric>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBox}>
                        <Text variant="caption" color={colors.muted}>Pickups</Text>
                        <Numeric size={20} color={colors.navy}>142</Numeric>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBox}>
                        <Text variant="caption" color={colors.muted}>Total Payout</Text>
                        <Numeric size={20} color={colors.navy}>₹58.4k</Numeric>
                    </View>
                </View>

                {/* History Section */}
                <View style={styles.historyHeader}>
                    <Text variant="subheading">Pickup History</Text>
                </View>

                {COMPLETED_ORDERS.map((order) => (
                    <View key={order.orderId} style={styles.orderCard}>
                        <View style={styles.tealBar} />
                        <View style={styles.orderContent}>
                            <View style={styles.orderTop}>
                                <View>
                                    <Numeric size={14} color={colors.navy}>{order.orderNumber}</Numeric>
                                    <Text variant="caption" color={colors.muted}>{order.date}</Text>
                                </View>
                                <Numeric size={20} color={colors.teal}>₹{order.amount}</Numeric>
                            </View>

                            <View style={styles.sellerRow}>
                                <Text variant="label" color={colors.slate}>Picked up from {order.seller}</Text>
                            </View>

                            <View style={styles.materialsRow}>
                                {order.materials.map((m: any) => (
                                    <MaterialChip key={m} material={m} variant="chip" />
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
