import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { BaseCard } from '../../components/ui/Card';
import { PrimaryButton, SecondaryButton, IconButton } from '../../components/ui/Button';
import { Globe, Lock, MapPin, Clock, Hash, NavigationArrow, X } from 'phosphor-react-native';
import { useOrderStore } from '../../store/orderStore';

/**
 * app/(aggregator)/order-detail.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Order Detail screen (Pre-acceptance).
 * 
 * Features:
 * - Summary Strip (Order ID + Distance)
 * - Materials Table (Material, Weight, Rate, AT YOUR RATE)
 * - V25 compliant location (Locality only + Lock warning)
 * - Map placeholder (Globe icon + Dashboard aesthetic)
 * ──────────────────────────────────────────────────────────────────
 */

export default function AggregatorOrderDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const MOCK_ORDER = {
        id: (id as string) || 'ORD-24095',
        distance: '1.4 km',
        locality: 'Banjara Hills area',
        window: 'Today · 10 AM — 12 PM',
        items: [
            { material: 'Metal', weight: 18, rate: 28, yourRate: 30 },
            { material: 'Paper', weight: 15, rate: 12, yourRate: 14 },
            { material: 'Plastic', weight: 4, rate: 8, yourRate: 8 },
        ],
        totalEst: 896,
    };

    const renderSummaryStrip = () => (
        <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
                <Hash size={16} color={colors.muted} />
                <Text variant="label" color={colors.navy} style={styles.summaryText}>
                    {MOCK_ORDER.id}
                </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
                <NavigationArrow size={16} color={colors.muted} weight="fill" />
                <Text variant="label" color={colors.navy} style={styles.summaryText}>
                    {MOCK_ORDER.distance} away
                </Text>
            </View>
        </View>
    );

    const renderMaterialsTable = () => (
        <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
                <Text variant="caption" style={[styles.col, styles.colMaterial]}>MATERIAL</Text>
                <Text variant="caption" style={[styles.col, styles.colWeight]}>WEIGHT</Text>
                <Text variant="caption" style={[styles.col, styles.colRate]}>RATE</Text>
                <Text variant="caption" style={[styles.col, styles.colYourRate]}>AT YOUR RATE</Text>
            </View>
            {MOCK_ORDER.items.map((item, idx) => (
                <View key={item.material} style={[styles.tableRow, idx === MOCK_ORDER.items.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text variant="label" color={colors.navy} style={[styles.col, styles.colMaterial]}>{item.material}</Text>
                    <Numeric size={14} style={[styles.col, styles.colWeight, { color: colors.teal }]}>{item.weight} kg</Numeric>
                    <Numeric size={14} color={colors.muted} style={[styles.col, styles.colRate]}>₹{item.rate}</Numeric>
                    <Numeric size={14} color={colors.amber} style={[styles.col, styles.colYourRate]}>₹{item.yourRate}</Numeric>
                </View>
            ))}
            <View style={styles.totalRow}>
                <Text variant="label" color={colors.navy} style={{ fontFamily: 'DMSans-Bold' }}>Total Estimated</Text>
                <Numeric size={24} color={colors.navy}>₹{MOCK_ORDER.totalEst}</Numeric>
            </View>
        </View>
    );

    const renderLocationCard = () => (
        <BaseCard style={styles.locationCard}>
            <View style={styles.locationContent}>
                <View style={styles.locationInfo}>
                    <View style={styles.localityHeader}>
                        <MapPin size={18} color={colors.red} weight="fill" />
                        <Text variant="subheading" color={colors.navy} style={styles.localityText}>
                            {MOCK_ORDER.locality}
                        </Text>
                    </View>
                    <View style={styles.windowInfo}>
                        <Clock size={14} color={colors.muted} />
                        <Text variant="caption" color={colors.muted} style={{ marginLeft: 4 }}>
                            {MOCK_ORDER.window}
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
                        <Lock size={14} color={colors.surface} weight="fill" />
                        <Text variant="caption" color={colors.surface} style={{ marginLeft: 8, fontWeight: '600' }}>
                            Accept Order to view full address
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
                title="Order Details"
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

            {/* Sticky Bottom Bar */}
            <View style={styles.bottomBar}>
                <PrimaryButton
                    label="Reject"
                    style={styles.rejectBtn}
                    textStyle={styles.btnText}
                    onPress={() => {
                        useOrderStore.getState().rejectOrder(MOCK_ORDER.id);
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.push('/(aggregator)/home');
                        }
                    }}
                />
                <PrimaryButton
                    label="Accept"
                    style={styles.acceptBtn}
                    textStyle={styles.btnText}
                    onPress={() => router.push('/(aggregator)/execution/navigate')}
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
        flex: 1,
        textAlign: 'center',
    },
    colYourRate: {
        flex: 2,
        textAlign: 'right',
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
    unlockBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.navy,
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
        backgroundColor: 'transparent',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 0,
        paddingBottom: 24, // adapted for safe area with less height
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
