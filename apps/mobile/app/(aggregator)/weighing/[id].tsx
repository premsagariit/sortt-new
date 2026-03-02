/**
 * app/(aggregator)/weighing/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Weighing Screen — Aggregator enters actual weights for each material.
 * 
 * V25: Live calculation of total value based on aggregator's set rates.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { MaterialCode } from '../../../components/ui/Card';

const MOCK_ORDER_MATERIALS: Record<string, { code: MaterialCode; label: string; rate: number }[]> = {
    'ORD-2841': [
        { code: 'metal', label: 'Iron (Heavy)', rate: 27 },
        { code: 'paper', label: 'Newspaper', rate: 9 },
    ],
    'ORD-1001': [
        { code: 'paper', label: 'Cardboard', rate: 7 },
    ],
};

export default function WeighingScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const materials = id ? MOCK_ORDER_MATERIALS[id] : [];

    const [weights, setWeights] = useState<Record<string, string>>({});

    const calculateTotal = () => {
        return materials.reduce((sum, mat, idx) => {
            const w = parseFloat(weights[`${mat.code}-${idx}`] || '0');
            return sum + (w * mat.rate);
        }, 0);
    };

    const handleNext = () => {
        const total = calculateTotal();
        router.push({
            pathname: '/(aggregator)/otp/[id]' as any,
            params: { id, amount: total.toString() }
        });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ headerShown: false }} />

            <NavBar
                title="Weighing"
                variant="light"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text variant="subheading">Enter Actual Weights</Text>
                    <Text variant="caption" color={colors.muted}>Weigh each item and enter the reading below.</Text>
                </View>

                <View style={styles.list}>
                    {materials.map((mat, idx) => {
                        const key = `${mat.code}-${idx}`;
                        const weight = parseFloat(weights[key] || '0');
                        const subtotal = weight * mat.rate;

                        return (
                            <View key={key} style={styles.row}>
                                <View style={styles.matInfo}>
                                    <Text variant="body" style={styles.matLabel}>{mat.label}</Text>
                                    <Text variant="caption" color={colors.muted}>Rate: ₹{mat.rate}/kg</Text>
                                </View>

                                <View style={styles.inputArea}>
                                    <View style={styles.inputWrap}>
                                        <TextInput
                                            style={styles.input}
                                            value={weights[key] || ''}
                                            onChangeText={(v) => setWeights(prev => ({ ...prev, [key]: v }))}
                                            keyboardType="numeric"
                                            placeholder="0.0"
                                        />
                                        <Text variant="caption" style={styles.unitSuffix}>kg</Text>
                                    </View>
                                    <Numeric size={14} color={colors.navy} style={styles.subtotal}>
                                        ₹{subtotal.toFixed(0)}
                                    </Numeric>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Total Summary */}
                <View style={styles.totalCard}>
                    <Text variant="label" color={colors.muted}>Final Payable Amount</Text>
                    <Numeric size={32} color={colors.teal} style={styles.totalAmount}>
                        ₹{calculateTotal().toFixed(0)}
                    </Numeric>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <PrimaryButton
                    label="Review & Confirm"
                    onPress={handleNext}
                    disabled={calculateTotal() <= 0}
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
    header: {
        marginBottom: spacing.lg,
    },
    list: {
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    row: {
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
    },
    inputArea: {
        alignItems: 'flex-end',
        gap: 4,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        borderRadius: radius.input,
        paddingHorizontal: spacing.sm,
        width: 90,
        height: 44,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        fontFamily: 'DMMono-Regular',
        fontSize: 18,
        color: colors.navy,
        textAlign: 'center',
        padding: 0,
    },
    unitSuffix: {
        color: colors.muted,
        marginLeft: 2,
    },
    subtotal: {
        fontFamily: 'DMMono-Medium',
    },
    totalCard: {
        backgroundColor: colorExtended.tealLight,
        padding: spacing.xl,
        borderRadius: radius.card,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.1)',
    },
    totalAmount: {
        marginTop: spacing.xs,
        fontFamily: 'DMMono-Bold',
    },
    footer: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
