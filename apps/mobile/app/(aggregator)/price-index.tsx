/**
 * app/(aggregator)/price-index.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Price Index Screen — matches sortt_ui.html
 * 
 * This screen allows aggregators to set their buying rates for 
 * different scrap materials.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text, Numeric } from '../../components/ui/Typography';
import { colors, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { PrimaryButton } from '../../components/ui/Button';
import { Info } from 'phosphor-react-native';
import { MaterialCode } from '../../components/ui/Card';

const MATERIALS: { id: string; code: MaterialCode; label: string; unit: string; marketRate: number; trend: 'up' | 'down' | 'flat'; change: string }[] = [
    { id: '1', code: 'metal', label: 'Iron (Heavy)', unit: 'kg', marketRate: 28, trend: 'up', change: '+₹1.2' },
    { id: '2', code: 'metal', label: 'Iron (Light)', unit: 'kg', marketRate: 24, trend: 'flat', change: '0' },
    { id: '3', code: 'paper', label: 'Newspaper', unit: 'kg', marketRate: 10, trend: 'up', change: '+₹0.5' },
    { id: '4', code: 'paper', label: 'Cardboard', unit: 'kg', marketRate: 8, trend: 'down', change: '-₹0.2' },
    { id: '5', code: 'plastic', label: 'PET Bottles', unit: 'kg', marketRate: 12, trend: 'up', change: '+₹0.8' },
    { id: '6', code: 'plastic', label: 'Hard Plastic', unit: 'kg', marketRate: 15, trend: 'flat', change: '0' },
    { id: '7', code: 'ewaste', label: 'Electronic Scrap', unit: 'kg', marketRate: 45, trend: 'up', change: '+₹2.5' },
];

export default function PriceIndexScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <NavBar
                title="National Market Index"
                variant="light"
                onBack={() => router.back()}
                rightAction={
                    <View style={styles.localityTag}>
                        <View style={styles.liveDot} />
                        <Text variant="caption" color={colors.muted}>LIVE · INDIA</Text>
                    </View>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* AI Hint */}
                <View style={styles.hintCard}>
                    <Info size={20} color={colors.amber} weight="fill" />
                    <View style={styles.hintTextWrap}>
                        <Text variant="label" color={colors.navy}>Market Intelligence</Text>
                        <Text variant="caption">These rates are aggregated across major Indian markets by our AI agents. Updated every 6 hours.</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text variant="subheading" style={styles.sectionTitle}>Daily Scrap Price Benchmarks</Text>
                    <Text variant="caption" style={styles.sectionDesc}>Use these trends to stay competitive and adjust your buying rates effectively.</Text>

                    <View style={styles.rateList}>
                        {MATERIALS.map((mat) => {
                            const trendColor = mat.trend === 'up' ? colors.teal : mat.trend === 'down' ? colors.red : colors.muted;
                            return (
                                <View key={mat.id} style={styles.rateRow}>
                                    <View style={styles.matInfo}>
                                        <Text variant="body" style={styles.matLabel}>{mat.label}</Text>
                                        <Text variant="caption" color={colors.muted}>Aggregated from 12 sources</Text>
                                    </View>

                                    <View style={styles.rateDisplaySide}>
                                        <Numeric size={18} color={colors.navy} style={styles.priceText}>₹{mat.marketRate}</Numeric>
                                        <View style={[styles.trendBadge, { backgroundColor: trendColor + '10' }]}>
                                            <Text variant="caption" style={{ color: trendColor, fontWeight: '700' }}>
                                                {mat.change}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Info Note */}
                <View style={styles.noteBox}>
                    <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
                        * These rates are for macro trend analysis only and do not reflect specific logistics costs in your zip code.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    localityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.teal,
    },
    hintCard: {
        flexDirection: 'row',
        backgroundColor: colors.amberLight,
        padding: spacing.md,
        borderRadius: radius.card,
        gap: spacing.sm,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.amber,
    },
    hintTextWrap: {
        flex: 1,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        marginBottom: 4,
        color: colors.navy,
    },
    sectionDesc: {
        marginBottom: spacing.lg,
    },
    rateList: {
        gap: spacing.md,
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    matInfo: {
        flex: 1,
    },
    matLabel: {
        fontFamily: 'DMSans-Bold',
        color: colors.navy,
        marginBottom: 2,
    },
    rateDisplaySide: {
        alignItems: 'flex-end',
        gap: 4,
    },
    priceText: {
        fontWeight: '700',
    },
    trendBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    noteBox: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
    },
});
