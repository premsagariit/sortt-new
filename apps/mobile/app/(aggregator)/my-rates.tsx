import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text, Numeric } from '../../components/ui/Typography';
import { colors, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { PrimaryButton } from '../../components/ui/Button';
import { Info } from 'phosphor-react-native';
import { MaterialCode } from '../../components/ui/Card';

const MATERIALS: { id: string; code: MaterialCode; label: string; unit: string; marketRate: number }[] = [
    { id: '1', code: 'metal', label: 'Iron (Heavy)', unit: 'kg', marketRate: 28 },
    { id: '2', code: 'metal', label: 'Iron (Light)', unit: 'kg', marketRate: 24 },
    { id: '3', code: 'paper', label: 'Newspaper', unit: 'kg', marketRate: 10 },
    { id: '4', code: 'paper', label: 'Cardboard', unit: 'kg', marketRate: 8 },
    { id: '5', code: 'plastic', label: 'PET Bottles', unit: 'kg', marketRate: 12 },
    { id: '6', code: 'plastic', label: 'Hard Plastic', unit: 'kg', marketRate: 15 },
    { id: '7', code: 'ewaste', label: 'Electronic Scrap', unit: 'kg', marketRate: 45 },
];

export default function MyRatesScreen() {
    const router = useRouter();
    const [rates, setRates] = useState<Record<string, string>>({
        '1': '27',
        '2': '23',
        '3': '9',
        '4': '7',
        '5': '11',
        '6': '14',
        '7': '42',
    });

    const handleUpdateRate = (id: string, val: string) => {
        setRates(prev => ({ ...prev, [id]: val }));
    };

    const handleSave = () => {
        console.log('Saving rates:', rates);
        router.back();
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ headerShown: false }} />

            <NavBar
                title="My Buying Rates"
                variant="light"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Market Hint */}
                <View style={styles.hintCard}>
                    <Info size={20} color={colors.amber} weight="fill" />
                    <View style={styles.hintTextWrap}>
                        <Text variant="label" color={colors.navy}>Price Control</Text>
                        <Text variant="caption">These rates determine how much you pay to sellers. Sellers will see these values in their "Local Average" calculations.</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text variant="subheading" style={styles.sectionTitle}>Set Your Custom Rates</Text>
                    <Text variant="caption" style={styles.sectionDesc}>Adjust per-item pricing based on your processing capacity and margin.</Text>

                    <View style={styles.rateList}>
                        {MATERIALS.map((mat) => {
                            return (
                                <View key={mat.id} style={styles.rateRow}>
                                    <View style={styles.matInfo}>
                                        <Text variant="body" style={styles.matLabel}>{mat.label}</Text>
                                        <Text variant="caption" color={colors.muted}>National Avg: ₹{mat.marketRate}/{mat.unit}</Text>
                                    </View>

                                    <View style={styles.inputWrap}>
                                        <Text variant="body" style={styles.currencyPrefix}>₹</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={rates[mat.id]}
                                            onChangeText={(v) => handleUpdateRate(mat.id, v)}
                                            keyboardType="numeric"
                                            placeholder="0"
                                        />
                                        <Text variant="caption" style={styles.unitSuffix}>/{mat.unit}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.noteBox}>
                    <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
                        Tip: Staying within 5% of the National Market Index usually ensures higher order acceptance from quality sellers.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <PrimaryButton
                    label="Save Buying Rates"
                    onPress={handleSave}
                />
            </View>
        </KeyboardAvoidingView>
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
    hintCard: {
        flexDirection: 'row',
        backgroundColor: colors.amberLight,
        padding: spacing.md,
        borderRadius: radius.card,
        gap: spacing.sm,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
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
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        borderRadius: radius.input,
        paddingHorizontal: spacing.sm,
        width: 100,
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
    },
    currencyPrefix: {
        color: colors.slate,
        marginRight: 2,
        fontSize: 14,
    },
    input: {
        flex: 1,
        fontFamily: 'DMMono-Regular',
        fontSize: 16,
        color: colors.navy,
        textAlign: 'center',
        padding: 0,
    },
    unitSuffix: {
        color: colors.muted,
        marginLeft: 2,
        fontSize: 11,
    },
    noteBox: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    footer: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
