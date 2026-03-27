/**
 * app/(aggregator)/execution/weighing/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Weighing Screen — Aggregator enters actual weights for each material
 * and photographs the weighing scale. Local state only until Day 8.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, StyleSheet, ScrollView, TextInput,
    KeyboardAvoidingView, Platform, Pressable,
    ActivityIndicator, BackHandler,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
import { api } from '../../../../lib/api';
import { ImageCarouselViewer } from '../../../../components/ui/ImageCarouselViewer';

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
    const { orders, fetchOrder } = useOrderStore();
    const order = orders.find(o => o.orderId === id);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [weights, setWeights] = useState<Record<string, string>>({});
    const [liveRates, setLiveRates] = useState<any[]>([]);

    // usePhotoCapture is the ONLY place camera is launched — never inline in screens
    const { photoUri, capturePhoto, permissionDenied, isLoading, reset: resetPhoto } = usePhotoCapture();
    const {
        scalePhotoUris,
        addScalePhotoUri,
        removeScalePhotoAt,
        clearScalePhotos,
        uploadOrderMediaApi,
        finalizeWeighingApi,
        materialRates,
        materials: materialConfig,
        setExecutionDraft,
        fetchAggregatorRates,
    } = useAggregatorStore();

    const normalizeMaterialCode = useCallback((value: string) => String(value || '').toLowerCase().replace(/[-_\s]/g, ''), []);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            clearScalePhotos();

            if (id) {
                fetchOrder(id, true);
            }

            // Refresh store's materialRates and materials[] so configRateMap stays current
            void fetchAggregatorRates();

            (async () => {
                try {
                    const res = await api.get('/api/aggregators/me/rates');
                    if (!active) return;
                    setLiveRates(Array.isArray(res.data) ? res.data : (res.data?.rates || []));
                } catch {
                    try {
                        const fallback = await api.get('/api/rates');
                        if (!active) return;
                        setLiveRates(fallback.data?.rates || []);
                    } catch {
                        if (!active) return;
                        setLiveRates([]);
                    }
                }
            })();

            return () => {
                active = false;
            };
        }, [id, fetchOrder, fetchAggregatorRates, clearScalePhotos])
    );

    useEffect(() => {
        if (!id || !order) return;

        // Guard stale screens when order has moved to another stage.
        if (order.status === 'accepted' || order.status === 'en_route') {
            router.replace({ pathname: '/(aggregator)/execution/navigate', params: { id } } as any);
            return;
        }

        if (['completed', 'cancelled', 'disputed'].includes(order.status)) {
            router.replace('/(aggregator)/orders');
        }
    }, [id, order?.status]);

    const liveRateMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const rate of liveRates) {
            const normalized = normalizeMaterialCode(String(rate?.material_code || ''));
            if (!normalized) continue;
            map.set(normalized, Number(rate?.rate_per_kg || 0));
        }
        return map;
    }, [liveRates, normalizeMaterialCode]);

    const storeRateMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const rate of materialRates) {
            const normalized = normalizeMaterialCode(String(rate?.material_code || ''));
            if (!normalized) continue;
            map.set(normalized, Number(rate?.rate_per_kg || 0));
        }
        return map;
    }, [materialRates, normalizeMaterialCode]);

    const configRateMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const material of materialConfig) {
            const normalized = normalizeMaterialCode(String(material?.id || ''));
            if (!normalized) continue;
            map.set(normalized, Number(material?.ratePerKg || 0));
        }
        return map;
    }, [materialConfig, normalizeMaterialCode]);

    const orderItemRateMap = useMemo(() => {
        const map = new Map<string, number>();
        const orderItems = Array.isArray(order?.orderItems) ? order.orderItems : [];
        for (const item of orderItems) {
            const normalized = normalizeMaterialCode(String(item?.materialCode || ''));
            if (!normalized) continue;
            const rate = Number(item?.ratePerKg || 0);
            if (rate > 0) {
                map.set(normalized, rate);
            }
        }
        return map;
    }, [order?.orderItems, normalizeMaterialCode]);

    const materials = (order?.materialCodes ?? order?.materials ?? []).map((code) => {
        const normalizedCode = normalizeMaterialCode(String(code));
        const fromOrderItem = orderItemRateMap.get(normalizedCode);
        const fromLiveRates = liveRateMap.get(normalizedCode);
        const fromStoreRates = storeRateMap.get(normalizedCode);
        const fromConfig = configRateMap.get(normalizedCode);
        return {
            code,
            label: MATERIAL_MAP[code as MaterialCode]?.label || String(code).toUpperCase(),
            rate: Number(fromOrderItem ?? fromLiveRates ?? fromStoreRates ?? fromConfig ?? 0),
            estimatedWeight: Number(order?.estimatedWeights?.[code] ?? 0),
        };
    });

    // Sync hook URI into aggregatorStore whenever a new photo is captured
    useEffect(() => {
        if (photoUri) addScalePhotoUri(photoUri);
    }, [photoUri, addScalePhotoUri]);

    useEffect(() => {
        const onBackPress = () => true; // Block hardware back
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const handleAddPhoto = async () => {
        await capturePhoto();
    };

    const handleRemoveLastPhoto = () => {
        if (scalePhotoUris.length === 0) return;
        removeScalePhotoAt(scalePhotoUris.length - 1);
        resetPhoto();
    };

    const calculateTotal = () =>
        materials.reduce((sum, mat, idx) => {
            const w = parseFloat(weights[`${mat.code}-${idx}`] || '0');
            return sum + (w * mat.rate);
        }, 0);

    const allWeightsEntered = materials.length > 0 && materials.every(
        (mat, idx) => parseFloat(weights[`${mat.code}-${idx}`] || '0') > 0
    );

    const canSubmit = allWeightsEntered;

    const handleNext = async () => {
        if (!id) {
            return;
        }

        const total = calculateTotal();

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            for (const uri of scalePhotoUris) {
                await uploadOrderMediaApi(id, uri, 'scale_photo');
            }

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
                onBack={() => router.replace('/(aggregator)/orders')}
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
                        <Text variant="caption" color={colors.muted}>(Optional)</Text>
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

                    {scalePhotoUris.length === 0 ? (
                        <Pressable
                            style={styles.photoBoxEmpty}
                            onPress={handleAddPhoto}
                            disabled={isLoading}
                        >
                            {isLoading
                                ? <ActivityIndicator size="small" color={colors.muted} />
                                : <Camera size={32} color={colors.muted} weight="light" />
                            }
                            <Text variant="label" style={styles.photoLabel}>
                                {isLoading ? 'Opening camera...' : 'Take first photo of the reading on your scale'}
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={styles.photoBoxFilled}>
                            <ImageCarouselViewer images={scalePhotoUris} height={160} autoScrollIntervalMs={4000} />
                            <View style={styles.photoHeader}>
                                <View style={styles.capturedBadge}>
                                    <Text variant="label" color={colors.teal}>✓ {scalePhotoUris.length} scale photo{scalePhotoUris.length > 1 ? 's' : ''} captured</Text>
                                </View>
                                <View style={styles.photoActions}>
                                    <View style={styles.photoActionBtnWrap}>
                                        <SecondaryButton label="Add More" onPress={handleAddPhoto} />
                                    </View>
                                    <View style={styles.photoActionBtnWrap}>
                                        <SecondaryButton label="Remove" onPress={handleRemoveLastPhoto} />
                                    </View>
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
                    label="Next →"
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
    photoHeader: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    photoActions: {
        flexDirection: 'column',
        width: '100%',
        gap: spacing.xs,
    },
    photoActionBtnWrap: {
        flex: 1,
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
