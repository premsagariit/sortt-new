/**
 * app/(aggregator)/execution/weighing/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Weighing Screen — Aggregator enters actual weights for each material
 * and photographs the weighing scale. Local state only until Day 8.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, TextInput,
    KeyboardAvoidingView, Platform, Pressable,
    ActivityIndicator, Image, BackHandler,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, WarningCircle } from 'phosphor-react-native';
import { colors, spacing, radius, colorExtended } from '../../../../constants/tokens';
import { NavBar } from '../../../../components/ui/NavBar';
import { useOrderStore } from '../../../../store/orderStore';
import { useAggregatorStore } from '../../../../store/aggregatorStore';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../../components/ui/Button';
import { MaterialCode } from '../../../../components/ui/Card';
// Camera logic is ONLY in this hook — never call ImagePicker directly in screens
import { usePhotoCapture } from '../../../../hooks/usePhotoCapture';
import { safeBack } from '../../../../utils/navigation';

const MATERIAL_MAP: Record<MaterialCode, { label: string }> = {
    metal: { label: 'Metal / Iron' },
    plastic: { label: 'Plastic (PET)' },
    paper: { label: 'Paper / Cardboard' },
    ewaste: { label: 'E-Waste' },
    glass: { label: 'Glass Bottles' },
    fabric: { label: 'Fabric / Textiles' },
    custom: { label: 'Other Item' },
};

export default function WeighingScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { orders } = useOrderStore();
    const order = orders.find(o => o.orderId === id);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [weights, setWeights] = useState<Record<string, string>>({});

    // usePhotoCapture is the ONLY place camera is launched — never inline in screens
    const { photoUri, capturePhoto, permissionDenied, isLoading, reset: resetPhoto } = usePhotoCapture();
    const {
        scalePhotoUri,
        setScalePhotoUri,
        uploadOrderMediaApi,
        finalizeWeighingApi,
        materialRates,
        materials: materialConfig,
        setExecutionDraft,
    } = useAggregatorStore();

    const materials = (order?.materialCodes ?? order?.materials ?? []).map((code) => {
        const fromRates = materialRates.find((rate) => rate.material_code === code)?.rate_per_kg;
        const fromConfig = materialConfig.find((material) => material.id === code)?.ratePerKg;
        return {
            code,
            label: MATERIAL_MAP[code as MaterialCode]?.label || String(code).toUpperCase(),
            rate: Number(fromRates ?? fromConfig ?? 0),
            estimatedWeight: Number(order?.estimatedWeights?.[code] ?? 0),
        };
    });

    // Sync hook URI into aggregatorStore whenever a new photo is captured
    useEffect(() => {
        if (photoUri) setScalePhotoUri(photoUri);
    }, [photoUri, setScalePhotoUri]);

    useEffect(() => {
        const onBackPress = () => true; // Block hardware back
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const handleRetake = async () => {
        resetPhoto();
        setScalePhotoUri(null);
        await capturePhoto();
    };

    const calculateTotal = () =>
        materials.reduce((sum, mat, idx) => {
            const w = parseFloat(weights[`${mat.code}-${idx}`] || '0');
            return sum + (w * mat.rate);
        }, 0);

    const allWeightsEntered = materials.length > 0 && materials.every(
        (mat, idx) => parseFloat(weights[`${mat.code}-${idx}`] || '0') > 0
    );

    // CTA disabled state reads from STORE (scalePhotoUri), not local state — per hard rules
    const canSubmit = allWeightsEntered && scalePhotoUri !== null;

    const handleNext = async () => {
        if (!id || !scalePhotoUri) {
            return;
        }

        const total = calculateTotal();

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            await uploadOrderMediaApi(id, scalePhotoUri, 'scale_photo');

            const lineItems = materials.map((mat, idx) => {
                const key = `${mat.code}-${idx}`;
                const weight = parseFloat(weights[key] || '0');
                return {
                    materialCode: mat.code,
                    label: mat.label,
                    weightKg: weight,
                    ratePerKg: mat.rate,
                    amount: weight * mat.rate,
                };
            });

            await finalizeWeighingApi(id, lineItems.map((item) => ({
                materialCode: item.materialCode,
                weightKg: item.weightKg,
                ratePerKg: item.ratePerKg,
            })));

            setExecutionDraft(id, {
                lineItems,
                totalAmount: total,
                totalWeight: lineItems.reduce((sum, item) => sum + item.weightKg, 0),
                capturedAt: new Date().toISOString(),
            });

            router.push({
                pathname: '/(aggregator)/execution/otp/[id]' as any,
                params: { id },
            });
        } catch (err: any) {
            console.error('Failed to submit weighing step:', err);
            setErrorMsg(err?.response?.data?.error ?? err?.message ?? 'Failed to upload scale photo');
        } finally {
            setIsSubmitting(false);
        }
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
                onBack={() => safeBack(`/(aggregator)/execution/navigate?id=${id}` as any)}
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
                                            placeholder={mat.estimatedWeight > 0 ? String(mat.estimatedWeight) : '0.0'}
                                            placeholderTextColor={colors.muted}
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

                {/* Scale Photo Zone */}
                <View style={styles.photoSection}>
                    <Text variant="subheading" style={styles.sectionTitle}>
                        Scale Photo{' '}
                        <Text variant="caption" color={colors.red}>*required</Text>
                    </Text>

                    {/* Permission denied inline banner — never an alert() */}
                    {permissionDenied && (
                        <View style={styles.permissionBanner}>
                            <WarningCircle size={16} color={colors.surface} weight="fill" />
                            <Text variant="caption" color={colors.surface} style={{ flex: 1, marginLeft: spacing.xs }}>
                                Camera access denied. Enable it in Settings.
                            </Text>
                        </View>
                    )}

                    {!scalePhotoUri ? (
                        <Pressable
                            style={styles.photoBoxEmpty}
                            onPress={capturePhoto}
                            disabled={isLoading}
                        >
                            {isLoading
                                ? <ActivityIndicator size="small" color={colors.muted} />
                                : <Camera size={32} color={colors.muted} weight="light" />
                            }
                            <Text variant="label" style={styles.photoLabel}>
                                {isLoading ? 'Opening camera...' : 'Take a photo of the reading on your scale'}
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={styles.photoBoxFilled}>
                            <Image
                                source={{ uri: scalePhotoUri }}
                                style={styles.photoThumbnail}
                                resizeMode="cover"
                            />
                            <View style={styles.photoHeader}>
                                <View style={styles.capturedBadge}>
                                    <Text variant="label" color={colors.teal}>✓ Scale photo captured</Text>
                                </View>
                                <View style={{ width: 90 }}>
                                    <SecondaryButton label="Retake" onPress={handleRetake} />
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Total Summary */}
                <View style={styles.totalCard}>
                    <Text variant="label" color={colors.muted}>Final Payable Amount</Text>
                    <Numeric size={32} color={colors.teal} style={styles.totalAmount}>
                        ₹{calculateTotal().toFixed(0)}
                    </Numeric>
                </View>

                {errorMsg && (
                    <Text variant="caption" color={colors.red} style={styles.errorText}>
                        {errorMsg}
                    </Text>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <PrimaryButton
                    label="Upload Scale Photo & Send OTP →"
                    onPress={handleNext}
                    disabled={!canSubmit}
                    loading={isSubmitting}
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
    // Photo
    photoSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        marginBottom: spacing.sm,
        color: colors.navy,
    },
    photoBoxEmpty: {
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: radius.card,
        padding: spacing.xl,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    photoLabel: {
        marginTop: spacing.sm,
        textAlign: 'center',
        color: colors.slate,
    },
    photoBoxFilled: {
        borderWidth: 1,
        borderColor: colors.teal,
        borderRadius: radius.card,
        padding: spacing.md,
        backgroundColor: colors.surface,
        gap: spacing.sm,
    },
    photoThumbnail: {
        width: '100%',
        height: 160,
        borderRadius: radius.input,
        backgroundColor: colors.border,
    },
    photoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    capturedBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: colorExtended.tealLight,
        borderRadius: 8,
    },
    permissionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.amber,
        borderRadius: radius.btn,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    // Total
    totalCard: {
        backgroundColor: colorExtended.tealLight,
        padding: spacing.xl,
        borderRadius: radius.card,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colorExtended.tealLight,
    },
    totalAmount: {
        marginTop: spacing.xs,
        fontFamily: 'DMMono-Bold',
    },
    errorText: {
        marginTop: spacing.md,
        textAlign: 'center',
    },
    footer: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
