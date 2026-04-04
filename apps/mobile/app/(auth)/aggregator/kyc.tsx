/**
 * app/(auth)/aggregator/kyc.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator KYC — Simplified Onboarding.
 * Requires only Shop/Vehicle photo.
 * Aadhaar/Selfie move to profile (Day 8+).
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, Pressable,
    ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Camera, Storefront, WarningCircle, CheckCircle, IconWeight, Truck } from 'phosphor-react-native';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { usePhotoCapture } from '../../../hooks/usePhotoCapture';
import { safeBack } from '../../../utils/navigation';
import { api } from '../../../lib/api';

export default function KycScreen() {
    const { getToken } = useAuth();
    const {
        aggregatorType,
        kycShopPhotoUri,
        kycVehiclePhotoUri,
        setKycShopPhotoUri,
        setKycVehiclePhotoUri,
    } = useAggregatorStore();

    // Only one photo needed for onboarding now
    const businessPhoto = usePhotoCapture();

    // Sync captures into store
    useEffect(() => {
        if (businessPhoto.photoUri) {
            if (aggregatorType === 'shop') setKycShopPhotoUri(businessPhoto.photoUri);
            else setKycVehiclePhotoUri(businessPhoto.photoUri);
        }
    }, [businessPhoto.photoUri, aggregatorType, setKycShopPhotoUri, setKycVehiclePhotoUri]);

    const handleRetake = async () => {
        businessPhoto.reset();
        if (aggregatorType === 'shop') setKycShopPhotoUri(null);
        else setKycVehiclePhotoUri(null);
        await businessPhoto.capturePhoto();
    };

    const businessUri = aggregatorType === 'shop' ? kycShopPhotoUri : kycVehiclePhotoUri;
    const canSubmit = businessUri !== null;
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (!businessUri || !businessUri.startsWith('file://')) {
                Alert.alert('Photo Error', 'Please retake the photo and try again.');
                return;
            }

            const fourthKey = aggregatorType === 'shop' ? 'shop_photo' : 'vehicle_photo';

            // Match the stable step1 upload style: fetch + FormData + Bearer token.
            const maxAttempts = 3;
            let lastError: any = null;
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                try {
                    const formData = new FormData();
                    formData.append(fourthKey, {
                        uri: businessUri,
                        name: `${fourthKey}_${Date.now()}.jpg`,
                        type: 'image/jpeg',
                    } as any);

                    let authToken: string | null = null;
                    try {
                        authToken = await getToken({ skipCache: true } as any);
                    } catch {
                        authToken = await getToken();
                    }

                    const url = `${api.defaults.baseURL}/api/aggregators/kyc`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 90000);

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                        },
                        body: formData,
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const body = await response.json().catch(() => ({}));
                        const err: any = new Error(body?.error || `KYC upload failed with status ${response.status}`);
                        err.response = { status: response.status, data: body };
                        throw err;
                    }

                    lastError = null;
                    break;
                } catch (err: any) {
                    lastError = err;
                    const status = err?.response?.status;
                    const retryable = !status || status >= 500 || err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK';
                    if (attempt < maxAttempts && retryable) {
                        await new Promise((resolve) => setTimeout(resolve, attempt * 700));
                        continue;
                    }
                    throw err;
                }
            }

            if (lastError) {
                throw lastError;
            }
            
            router.replace('/(aggregator)/home' as any);
        } catch (error: any) {
            const status = error?.response?.status;
            const body = error?.response?.data;
            console.error('KYC form submission failed:', {
                message: error?.message,
                code: error?.code,
                status,
                body,
            });

            const serverMessage = typeof body?.error === 'string' ? body.error : null;
            Alert.alert('KYC Upload Failed', serverMessage || 'Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = aggregatorType === 'shop' ? 'Shop Photo' : 'Vehicle Photo';
    const subtitle = aggregatorType === 'shop'
        ? 'Photo of your shop front'
        : 'Photo of your collection vehicle';
    const BusinessIcon = aggregatorType === 'shop' ? Storefront : Truck;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <NavBar
                variant="light"
                title="Business Photo"
                onBack={() => safeBack('/(auth)/aggregator/materials-setup')}
                rightAction={
                    <Text variant="caption" style={{ color: colors.muted }}>Step 4 of 4</Text>
                }
            />

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '100%' }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text variant="heading">Final Step: Photo</Text>
                    <Text variant="caption" color={colors.muted}>
                        Please provide a clear photo of your {aggregatorType === 'shop' ? 'shop' : 'vehicle'}.
                    </Text>
                </View>

                <PhotoCard
                    title={title}
                    subtitle={subtitle}
                    Icon={BusinessIcon}
                    storedUri={businessUri}
                    badge="✓ Photo uploaded"
                    permissionDenied={businessPhoto.permissionDenied}
                    isLoading={businessPhoto.isLoading}
                    onTap={businessPhoto.capturePhoto}
                    onRetake={handleRetake}
                />

                <View style={styles.infoBox}>
                    <WarningCircle size={18} color={colors.amber} weight="fill" />
                    <Text variant="caption" color={colors.navy} style={{ flex: 1 }}>
                        Aadhaar and Selfie can be uploaded later from your profile to complete full verification.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <PrimaryButton
                    label={isSubmitting ? "Submitting..." : "Complete Setup"}
                    onPress={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                />
            </View>
        </SafeAreaView>
    );
}

// ─── Shared Photo Card Sub-Component ──────────────────────────────────────────
interface PhotoCardProps {
    title: string;
    subtitle: string;
    Icon: React.ComponentType<{ size: number; color: string; weight?: IconWeight }>;
    storedUri: string | null;
    badge: string;
    permissionDenied: boolean;
    isLoading: boolean;
    onTap: () => Promise<any>;
    onRetake: () => Promise<any>;
}

function PhotoCard({
    title, subtitle, Icon, storedUri, badge,
    permissionDenied, isLoading, onTap, onRetake,
}: PhotoCardProps) {
    return (
        <View style={cardStyles.card}>
            <View style={cardStyles.cardHeader}>
                <View style={cardStyles.iconWrap}>
                    <Icon size={20} color={colors.navy} weight="regular" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text variant="label" color={colors.navy}>{title}</Text>
                    <Text variant="caption" color={colors.muted}>{subtitle}</Text>
                </View>
                {storedUri && (
                    <CheckCircle size={20} color={colors.teal} weight="fill" />
                )}
            </View>

            {permissionDenied && (
                <View style={cardStyles.permissionBanner}>
                    <WarningCircle size={14} color={colors.surface} weight="fill" />
                    <Text variant="caption" color={colors.surface} style={{ flex: 1, marginLeft: spacing.xs }}>
                        Camera access denied. Enable it in Settings.
                    </Text>
                </View>
            )}

            {!storedUri ? (
                <Pressable
                    style={cardStyles.uploadZone}
                    onPress={onTap}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.muted} />
                    ) : (
                        <Camera size={28} color={colors.muted} weight="light" />
                    )}
                    <Text variant="caption" color={colors.muted} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
                        {isLoading ? 'Opening camera...' : 'Tap to take photo'}
                    </Text>
                </Pressable>
            ) : (
                <View style={cardStyles.capturedContainer}>
                    <Image
                        source={{ uri: storedUri }}
                        style={cardStyles.thumbnail}
                        resizeMode="cover"
                    />
                    <View style={cardStyles.capturedRow}>
                        <View style={cardStyles.capturedBadge}>
                            <Text variant="caption" color={colors.teal} style={{ fontWeight: '600' }}>{badge}</Text>
                        </View>
                        <Pressable onPress={onRetake} style={cardStyles.retakeBtn}>
                            <Text variant="caption" color={colors.slate}>Retake</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    progressTrack: {
        height: 3,
        backgroundColor: colors.border,
    },
    progressFill: {
        height: 3,
        backgroundColor: colors.teal,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
    },
    header: {
        gap: spacing.xs,
    },
    infoBox: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colorExtended.surface2,
        borderRadius: radius.card,
        gap: spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    footer: {
        padding: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: colorExtended.surface2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadZone: {
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: radius.input,
        padding: spacing.xl,
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colorExtended.surface2,
    },
    capturedContainer: {
        gap: spacing.sm,
    },
    thumbnail: {
        width: '100%',
        height: 140,
        borderRadius: radius.input,
        backgroundColor: colors.border,
    },
    capturedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    capturedBadge: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        backgroundColor: colorExtended.tealLight,
        borderRadius: radius.chip,
    },
    retakeBtn: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.input,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.amber,
        borderRadius: radius.btn,
        padding: spacing.sm,
        gap: spacing.xs,
    },
});
