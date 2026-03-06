/**
 * app/(aggregator)/profile/buy-rates.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator "My Buy Rates" refinement — high fidelity reference.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
    Lightbulb,
    ArrowUp,
    ArrowDown,
    Plus,
    Gear,
    Plug,
    FileText,
    Dress,
    Wine,
    Cube
} from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { MaterialCode } from '../../../components/ui/MaterialChip';
import { PrimaryButton } from '../../../components/ui/Button';

interface MaterialRate {
    id: MaterialCode;
    label: string;
    marketRate: number;
    userRate: string;
    isActive: boolean;
    type: string;
}

const INITIAL_RATES: MaterialRate[] = [
    { id: 'metal', label: 'Metal (Iron)', marketRate: 28, userRate: '29', isActive: true, type: 'Iron' },
    { id: 'metal', label: 'Metal (Copper)', marketRate: 480, userRate: '480', isActive: true, type: 'Copper' },
    { id: 'paper', label: 'Paper', marketRate: 12, userRate: '12', isActive: true, type: 'General' },
    { id: 'paper', label: 'Cardboard', marketRate: 8, userRate: '7', isActive: true, type: 'General' },
    { id: 'fabric', label: 'Fabric', marketRate: 6, userRate: '6', isActive: true, type: 'General' },
    { id: 'plastic', label: 'Plastic', marketRate: 15, userRate: '15', isActive: false, type: 'General' },
    { id: 'ewaste', label: 'E-Waste', marketRate: 50, userRate: '50', isActive: false, type: 'General' },
    { id: 'glass', label: 'Glass', marketRate: 5, userRate: '5', isActive: false, type: 'General' },
];

const MATERIAL_ICONS: Record<string, any> = {
    'Metal (Iron)': Gear,
    'Metal (Copper)': Plug,
    'Paper': FileText,
    'Cardboard': Cube,
    'Fabric': Dress,
    'Glass': Wine,
    'Plastic': Package,
    'E-Waste': Cube,
};

function Package(props: any) {
    return <Cube {...props} />; // Fallback icon
}

export default function BuyRatesScreen() {
    const router = useRouter();
    const [rates, setRates] = useState<MaterialRate[]>(INITIAL_RATES);
    const [isSaving, setIsSaving] = useState(false);

    const activeRates = rates.filter(r => r.isActive);
    const inactiveRates = rates.filter(r => !r.isActive);

    const handleRateChange = (idKey: string, value: string) => {
        setRates(prev => prev.map(r => (r.label === idKey) ? { ...r, userRate: value } : r));
    };

    const handleToggle = (label: string) => {
        setRates(prev => prev.map(r => r.label === label ? { ...r, isActive: !r.isActive } : r));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSaving(false);
        router.back();
    };

    const getComparison = (user: number, market: number) => {
        if (user > market) return { label: 'Above avg', color: colors.teal, icon: ArrowUp };
        if (user < market) return { label: 'Below avg', color: colors.amber, icon: ArrowDown };
        return { label: 'At avg', color: colors.slate, icon: null };
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="My Buy Rates"
                variant="light"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Bulby Info Box */}
                <View style={styles.infoBox}>
                    <Lightbulb size={24} color={colors.amber} weight="fill" />
                    <Text variant="caption" style={styles.infoText}>
                        These are the rates visible to sellers when they browse aggregators. Competitive rates get more orders.
                    </Text>
                </View>

                <View style={styles.timestampRow}>
                    <Text variant="label" style={styles.updateLabel}>Last updated: </Text>
                    <Text variant="label" style={styles.timestamp}>Today, 9:12 AM</Text>
                </View>

                {/* Active Rates Section */}
                <View style={styles.cardContainer}>
                    <View style={styles.mainCard}>
                        {activeRates.map((item, idx) => {
                            const uRate = parseFloat(item.userRate) || 0;
                            const compare = getComparison(uRate, item.marketRate);
                            const Icon = MATERIAL_ICONS[item.label] || Cube;

                            return (
                                <View key={item.label} style={[styles.rateRow, idx === activeRates.length - 1 && styles.lastRow]}>
                                    <View style={styles.matIconWrap}>
                                        <Icon size={20} color={colors.navy} />
                                    </View>

                                    <View style={styles.matInfo}>
                                        <Text variant="label" style={styles.matLabel}>{item.label}</Text>
                                        <View style={styles.marketInfo}>
                                            <Text variant="caption" color={colors.muted}>Market avg: ₹{item.marketRate} · </Text>
                                            <Text variant="caption" color={compare.color} style={styles.compareText}>
                                                {compare.label} {compare.icon && <compare.icon size={10} color={compare.color} />}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.inputCell}>
                                        <View style={styles.inputBorder}>
                                            <TextInput
                                                value={item.userRate}
                                                onChangeText={(val) => handleRateChange(item.label, val)}
                                                keyboardType="numeric"
                                                style={styles.priceInput}
                                                placeholder="0"
                                                placeholderTextColor={colors.muted}
                                            />
                                        </View>
                                        <Text variant="caption" color={colors.muted}>/kg</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Custom Product Link */}
                <Pressable style={styles.addCustomBtn}>
                    <Plus size={18} color={colors.navy} weight="bold" />
                    <Text variant="label" style={styles.addCustomText}>Add Custom Product</Text>
                </Pressable>

                {/* Not Currently Collecting */}
                <View style={styles.notCollectingBox}>
                    <Text variant="label" style={styles.notCollectingTitle}>NOT CURRENTLY COLLECTING</Text>
                    <View style={styles.chipsContainer}>
                        {inactiveRates.map(r => (
                            <Pressable key={r.label} style={styles.inactiveChip} onPress={() => handleToggle(r.label)}>
                                <Cube size={14} color={colors.slate} />
                                <Text variant="caption" style={styles.chipText}>{r.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text variant="caption" color={colors.muted} style={styles.helperText}>Tap to enable these materials</Text>
                </View>
            </ScrollView>

            {/* Footer Save Button */}
            <View style={[styles.footer, { paddingBottom: spacing.md }]}>
                <PrimaryButton
                    label={isSaving ? "Saving..." : "Save Rates"}
                    onPress={handleSave}
                    disabled={isSaving}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB', // Slightly lighter bg for contrast
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 120,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#EEF6FF',
        padding: spacing.md,
        borderRadius: radius.card,
        gap: spacing.sm,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    infoText: {
        flex: 1,
        lineHeight: 18,
        color: '#4B5563',
    },
    timestampRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    updateLabel: {
        fontWeight: '700',
        color: colors.slate,
    },
    timestamp: {
        fontWeight: '700',
        color: colors.muted,
    },
    cardContainer: {
        marginBottom: spacing.lg,
    },
    mainCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    matIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    matInfo: {
        flex: 1,
        marginRight: spacing.sm, // give space before input box
    },
    matLabel: {
        fontWeight: '700',
        color: colors.navy,
    },
    marketInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap', // Prevent overlapping content
        marginTop: 2,
    },
    compareText: {
        fontWeight: '600',
    },
    inputCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    inputBorder: {
        width: 80,
        height: 44,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 10,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    priceInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: colors.navy,
    },
    addCustomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'center',
        marginBottom: spacing.xl,
    },
    addCustomText: {
        fontWeight: '700',
        color: colors.navy,
    },
    notCollectingBox: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    notCollectingTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.slate,
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    inactiveChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F5FA',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    chipText: {
        fontWeight: '600',
        color: colors.slate,
    },
    helperText: {
        fontSize: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
