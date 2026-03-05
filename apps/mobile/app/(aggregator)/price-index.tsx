import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Warning, Robot } from 'phosphor-react-native';

import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { safeBack } from '../../utils/navigation';

type PriceIndexItem = {
    id: string;
    label: string;
    subLabel: string;
    priceRange: string;
    trend: 'up' | 'down' | 'stable';
    trendText: string;
    icon: string;
    bg: string;
};

const PRICE_DATA: PriceIndexItem[] = [
    { id: '1', label: 'Metal (Iron)', subLabel: 'Ferrous scrap', priceRange: '₹26–30/kg', trend: 'up', trendText: '▲ trending up', icon: '⚙️', bg: '#F3F4F6' },
    { id: '2', label: 'Metal (Copper)', subLabel: 'Wire, pipes', priceRange: '₹460–500/kg', trend: 'up', trendText: '▲ up ₹12', icon: '🔩', bg: '#F3F4F6' },
    { id: '3', label: 'Aluminium', subLabel: 'Cans, sheets', priceRange: '₹80–100/kg', trend: 'stable', trendText: '— stable', icon: '🪨', bg: '#F3F4F6' },
    { id: '4', label: 'Paper', subLabel: 'Newspaper, office', priceRange: '₹10–14/kg', trend: 'stable', trendText: '— stable', icon: '📄', bg: '#FEF3E2' },
    { id: '5', label: 'Cardboard', subLabel: 'Corrugated boxes', priceRange: '₹6–10/kg', trend: 'stable', trendText: '— stable', icon: '📦', bg: '#FEF3E2' },
    { id: '6', label: 'Plastic (PET)', subLabel: 'Bottles, clear', priceRange: '₹7–9/kg', trend: 'down', trendText: '▼ down ₹0.2', icon: '🧴', bg: '#EEF4FC' },
    { id: '7', label: 'E-Waste', subLabel: 'Electronics, cables', priceRange: '₹55–70/kg', trend: 'up', trendText: '▲ up ₹3', icon: '💻', bg: '#EAF5F4' },
    { id: '8', label: 'Fabric / Clothes', subLabel: '', priceRange: '₹4–8/kg', trend: 'stable', trendText: '— stable', icon: '👗', bg: '#F5F3FF' },
    { id: '9', label: 'Glass', subLabel: '', priceRange: '₹1–3/kg', trend: 'stable', trendText: '— stable', icon: '🫙', bg: '#EFF6FF' },
];

export default function PriceIndexScreen() {
    const router = useRouter();

    const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return colors.teal;
            case 'down': return colors.red;
            default: return colors.muted;
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="Daily Price Index"
                variant="light"
                onBack={() => safeBack()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text variant="caption" color={colors.muted}>
                            Hyderabad · Updated <Numeric size={11} color={colors.muted}>Feb 28, 9:00 AM</Numeric>
                        </Text>
                    </View>
                    <View style={styles.aiPill}>
                        <View style={styles.aiDot} />
                        <Text style={styles.aiText}>AI Updated</Text>
                    </View>
                </View>

                <View style={styles.infoBanner}>
                    <Robot size={20} color={colors.navy} weight="fill" />
                    <Text variant="caption" style={styles.infoText}>
                        Rates are scraped daily by AI from Hyderabad scrap market references. Admin can manually adjust flagged rates.
                    </Text>
                </View>

                <View style={styles.listContainer}>
                    {PRICE_DATA.map((item, index) => (
                        <View
                            key={item.id}
                            style={[
                                styles.row,
                                index === PRICE_DATA.length - 1 && { borderBottomWidth: 0 }
                            ]}
                        >
                            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                                <Text style={styles.iconText}>{item.icon}</Text>
                            </View>

                            <View style={styles.labelWrap}>
                                <Text variant="body" style={styles.label}>{item.label}</Text>
                                {item.subLabel !== '' && (
                                    <Text variant="caption" color={colors.muted}>{item.subLabel}</Text>
                                )}
                            </View>

                            <View style={styles.priceWrap}>
                                <Numeric size={13} style={styles.priceRange}>{item.priceRange}</Numeric>
                                <Text
                                    variant="caption"
                                    style={[styles.trendText, { color: getTrendColor(item.trend) }]}
                                >
                                    {item.trendText}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.warningBanner}>
                    <Warning size={20} color={colors.amber} weight="fill" />
                    <Text variant="caption" style={styles.warningText}>
                        These are city-average reference rates, not mandated prices. Your rates are set independently in "My Buy Rates".
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
        backgroundColor: colors.bg,
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    aiPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7', // pill-green
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        gap: 4,
    },
    aiDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#166534',
    },
    aiText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#166534',
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: '#EEF4FC', // banner-info
        padding: spacing.md,
        borderRadius: radius.card,
        gap: 10,
        marginBottom: spacing.lg,
    },
    infoText: {
        flex: 1,
        lineHeight: 18,
        color: colors.slate,
    },
    listContainer: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        paddingHorizontal: spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 18,
    },
    labelWrap: {
        flex: 1,
    },
    label: {
        fontFamily: 'DMSans-Bold',
        color: colors.navy,
    },
    priceWrap: {
        alignItems: 'flex-end',
    },
    priceRange: {
        color: colors.amber,
        fontFamily: 'DMMono-Medium',
    },
    trendText: {
        fontSize: 11,
        marginTop: 2,
    },
    warningBanner: {
        flexDirection: 'row',
        backgroundColor: colors.amberLight,
        padding: spacing.md,
        borderRadius: radius.card,
        gap: 10,
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    warningText: {
        flex: 1,
        lineHeight: 18,
        color: colors.slate,
    },
});
