import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, BackHandler, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckCircle, Star } from 'phosphor-react-native';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { BaseCard } from '../../../components/ui/Card';

export default function ReceiptScreen() {
    const [rating, setRating] = useState(0);
    const insets = useSafeAreaInsets();

    // Block hardware back button
    useEffect(() => {
        const backAction = () => {
            return true; // Block exit
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, []);

    const handleFinish = () => {
        router.replace('/(aggregator)/orders');
    };

    return (
        <View style={styles.container}>
            {/* Scrollable Content */}
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Success Hero Section */}
                <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
                    <CheckCircle size={64} color={colors.surface} weight="fill" />
                    <Text variant="heading" color={colors.surface} style={styles.heroTitle}>
                        Pickup Complete!
                    </Text>
                    <View style={styles.amountContainer}>
                        <Numeric size={32} color={colors.surface} style={styles.amountText}>
                            ₹896.50
                        </Numeric>
                        <Text variant="label" color={colors.surface} style={{ opacity: 0.8 }}>
                            Paid to Seller
                        </Text>
                    </View>
                    <Numeric size={12} color={colors.surface} style={styles.orderId}>
                        #ORD-24091
                    </Numeric>
                </View>

                {/* Transaction Summary Table */}
                <View style={styles.section}>
                    <Text variant="caption" style={styles.sectionLabel}>
                        TRANSACTION SUMMARY
                    </Text>
                    <BaseCard style={styles.tableCard}>
                        <View style={styles.tableRow}>
                            <View style={[styles.dot, { backgroundColor: colors.material.metal.fg }]} />
                            <Text variant="body" style={styles.materialName}>Metal</Text>
                            <Numeric size={14} color={colors.navy}>12.5 kg</Numeric>
                            <Numeric size={14} color={colors.amber} style={styles.materialValue}>₹350</Numeric>
                        </View>
                        <View style={styles.tableRow}>
                            <View style={[styles.dot, { backgroundColor: colors.material.plastic.fg }]} />
                            <Text variant="body" style={styles.materialName}>Plastic</Text>
                            <Numeric size={14} color={colors.navy}>4.2 kg</Numeric>
                            <Numeric size={14} color={colors.amber} style={styles.materialValue}>₹546</Numeric>
                        </View>
                        <View style={[styles.tableRow, styles.totalRow]}>
                            <Text variant="subheading" style={{ flex: 1, color: colors.navy }}>Total</Text>
                            <Numeric size={15} style={{ color: colors.navy }}>16.7 kg</Numeric>
                            <Numeric size={18} style={{ color: colors.amber, fontFamily: 'DMMono-Bold', marginLeft: spacing.md }}>₹896</Numeric>
                        </View>
                    </BaseCard>
                </View>

                {/* Rating Card */}
                <View style={styles.section}>
                    <BaseCard style={styles.ratingCard}>
                        <View style={styles.sellerAvatar}>
                            <Text variant="subheading" style={{ color: colors.surface }}>P</Text>
                        </View>
                        <Text variant="subheading" style={styles.ratingTitle}>Rate Priya's behavior</Text>
                        <Text variant="caption" style={styles.ratingSubtitle}>Sharing feedback helps maintain quality</Text>

                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                                    <Star
                                        size={40}
                                        color={s <= rating ? colors.amber : colors.border}
                                        weight={s <= rating ? 'fill' : 'regular'}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </BaseCard>
                </View>

                {/* Footer Actions */}
                <View style={styles.actions}>
                    <PrimaryButton
                        label="Submit Rating & Close"
                        onPress={handleFinish}
                        disabled={rating === 0}
                    />
                    <TouchableOpacity onPress={handleFinish} style={styles.backToFeed}>
                        <Text variant="label" style={styles.backToFeedText}>
                            Back to Feed
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/(shared)/dispute' as any)}
                        style={styles.reportIssue}
                    >
                        <Text variant="caption" style={styles.reportIssueText}>
                            Report an issue with this pickup
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Bottom Padding */}
            <View style={{ height: Math.max(insets.bottom, spacing.md) }} />
        </View>
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
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    hero: {
        backgroundColor: colors.teal,
        alignItems: 'center',
        paddingBottom: 40,
        paddingHorizontal: spacing.xl,
    },
    heroTitle: {
        marginTop: spacing.md,
        letterSpacing: -0.5,
    },
    amountContainer: {
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    amountText: {
        fontFamily: 'DMMono-Bold',
        marginBottom: 4,
    },
    orderId: {
        marginTop: spacing.md,
        opacity: 0.6,
    },
    section: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    sectionLabel: {
        letterSpacing: 1,
        marginBottom: spacing.sm,
        fontWeight: '700',
        color: colors.slate,
    },
    tableCard: {
        padding: 0,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    materialName: {
        flex: 1,
        fontWeight: '600',
        color: colors.navy,
    },
    materialValue: {
        width: 60,
        textAlign: 'right',
        marginLeft: spacing.sm,
    },
    totalRow: {
        borderBottomWidth: 0,
        backgroundColor: colors.surface2,
    },
    ratingCard: {
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.surface,
    },
    sellerAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.teal,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    ratingTitle: {
        color: colors.navy,
        marginBottom: 4,
    },
    ratingSubtitle: {
        marginBottom: spacing.xl,
    },
    starsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actions: {
        marginTop: spacing.xxl,
        paddingHorizontal: spacing.md,
        gap: spacing.md,
    },
    backToFeed: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    backToFeedText: {
        color: colors.slate,
        textDecorationLine: 'underline',
    },
    reportIssue: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    reportIssueText: {
        color: colors.muted,
        textDecorationLine: 'underline',
    },
});
