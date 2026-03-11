/**
 * app/(auth)/aggregator/kyc.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator KYC — Step 4/4 of onboarding.
 * 4 independent camera cards (Aadhaar Front, Aadhaar Back, Selfie, Shop/Vehicle).
 * URIs stored in aggregatorStore — local only until Day 8 upload.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, Pressable,
    ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, IdentificationCard, Storefront, WarningCircle, CheckCircle, IconWeight, User, Truck } from 'phosphor-react-native';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { useAggregatorStore } from '../../../store/aggregatorStore';
// Camera logic is ONLY in this hook — never call ImagePicker directly in screens
import { usePhotoCapture } from '../../../hooks/usePhotoCapture';
import { safeBack } from '../../../utils/navigation';
import { api } from '../../../lib/api';

export default function KycScreen() {
    const {
        aggregatorType,
        kycAadhaarFrontUri,
        kycAadhaarBackUri,
        kycSelfieUri,
        kycShopPhotoUri,
        kycVehiclePhotoUri,
        setKycAadhaarFrontUri,
        setKycAadhaarBackUri,
        setKycSelfieUri,
        setKycShopPhotoUri,
        setKycVehiclePhotoUri,
    } = useAggregatorStore();

    // Independent hook instances — each manages its own permission + loading state
    const aadhaarFront = usePhotoCapture();
    const aadhaarBack = usePhotoCapture();
    const selfie = usePhotoCapture();
    const fourthPhoto = usePhotoCapture();

    // Sync captures into store
    useEffect(() => {
        if (aadhaarFront.photoUri) setKycAadhaarFrontUri(aadhaarFront.photoUri);
    }, [aadhaarFront.photoUri, setKycAadhaarFrontUri]);

    useEffect(() => {
        if (aadhaarBack.photoUri) setKycAadhaarBackUri(aadhaarBack.photoUri);
    }, [aadhaarBack.photoUri, setKycAadhaarBackUri]);

    useEffect(() => {
        if (selfie.photoUri) setKycSelfieUri(selfie.photoUri);
    }, [selfie.photoUri, setKycSelfieUri]);

    useEffect(() => {
        if (fourthPhoto.photoUri) {
            if (aggregatorType === 'shop') setKycShopPhotoUri(fourthPhoto.photoUri);
            else setKycVehiclePhotoUri(fourthPhoto.photoUri);
        }
    }, [fourthPhoto.photoUri, aggregatorType, setKycShopPhotoUri, setKycVehiclePhotoUri]);

    const handleRetakeAadhaarFront = async () => {
        aadhaarFront.reset();
        setKycAadhaarFrontUri(null);
        await aadhaarFront.pickPhoto();
    };

    const handleRetakeAadhaarBack = async () => {
        aadhaarBack.reset();
        setKycAadhaarBackUri(null);
        await aadhaarBack.pickPhoto();
    };

    const handleRetakeSelfie = async () => {
        selfie.reset();
        setKycSelfieUri(null);
        await selfie.pickPhoto();
    };

    const handleRetakeFourth = async () => {
        fourthPhoto.reset();
        if (aggregatorType === 'shop') setKycShopPhotoUri(null);
        else setKycVehiclePhotoUri(null);
        await fourthPhoto.pickPhoto();
    };

    // Submit enabled only when ALL required URIs are captured
    const isFourthPhotoDone = aggregatorType === 'shop' ? kycShopPhotoUri !== null : kycVehiclePhotoUri !== null;
    const canSubmit = kycAadhaarFrontUri !== null && kycAadhaarBackUri !== null && kycSelfieUri !== null && isFourthPhotoDone;
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            
            formData.append('aadhaar_front', {
                uri: kycAadhaarFrontUri,
                name: 'aadhaar_front.jpg',
                type: 'image/jpeg',
            } as any);

            formData.append('aadhaar_back', {
                uri: kycAadhaarBackUri,
                name: 'aadhaar_back.jpg',
                type: 'image/jpeg',
            } as any);

            formData.append('selfie', {
                uri: kycSelfieUri,
                name: 'selfie.jpg',
                type: 'image/jpeg',
            } as any);

            const fourthUri = aggregatorType === 'shop' ? kycShopPhotoUri : kycVehiclePhotoUri;
            const fourthKey = aggregatorType === 'shop' ? 'shop_photo' : 'vehicle_photo';
            formData.append(fourthKey, {
                uri: fourthUri,
                name: `${fourthKey}.jpg`,
                type: 'image/jpeg',
            } as any);

            await api.post('/api/aggregators/kyc', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            router.replace('/(aggregator)/home' as any);
        } catch (error) {
            console.error('KYC form submission failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fourthTitle = aggregatorType === 'shop' ? 'Shop Photo' : 'Vehicle Photo';
    const fourthSubtitle = aggregatorType === 'shop'
        ? 'Photo of your shop front'
        : 'Photo of your collection vehicle';
    const FourthIcon = aggregatorType === 'shop' ? Storefront : Truck;
    const fourthUri = aggregatorType === 'shop' ? kycShopPhotoUri : kycVehiclePhotoUri;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <NavBar
                variant="light"
                title="KYC Documents"
                onBack={() => safeBack('/(auth)/aggregator/materials-setup')}
                rightAction={
                    <Text variant="caption" style={{ color: colors.muted }}>Step 4 of 4</Text>
                }
            />

            {/* Step progress bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '100%' }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text variant="heading">Upload KYC Documents</Text>
                    <Text variant="caption" color={colors.muted}>
                        All 4 photos are required. Documents are verified within 24 hours.
                    </Text>
                </View>

                {/* Card 1 — Aadhaar Front */}
                <PhotoCard
                    title="Aadhaar Card (Front)"
                    subtitle="Clear photo of the front side of your Aadhaar card"
                    Icon={IdentificationCard}
                    storedUri={kycAadhaarFrontUri}
                    badge="✓ Front uploaded"
                    permissionDenied={aadhaarFront.permissionDenied}
                    isLoading={aadhaarFront.isLoading}
                    onTap={aadhaarFront.pickPhoto}
                    onRetake={handleRetakeAadhaarFront}
                />

                {/* Card 2 — Aadhaar Back */}
                <PhotoCard
                    title="Aadhaar Card (Back)"
                    subtitle="Clear photo of the back side of your Aadhaar card"
                    Icon={IdentificationCard}
                    storedUri={kycAadhaarBackUri}
                    badge="✓ Back uploaded"
                    permissionDenied={aadhaarBack.permissionDenied}
                    isLoading={aadhaarBack.isLoading}
                    onTap={aadhaarBack.pickPhoto}
                    onRetake={handleRetakeAadhaarBack}
                />

                {/* Card 3 — Selfie */}
                <PhotoCard
                    title="Your Photo"
                    subtitle="Clear selfie facing the camera"
                    Icon={User}
                    storedUri={kycSelfieUri}
                    badge="✓ Photo uploaded"
                    permissionDenied={selfie.permissionDenied}
                    isLoading={selfie.isLoading}
                    onTap={selfie.pickPhoto}
                    onRetake={handleRetakeSelfie}
                />

                {/* Card 4 — Shop / Vehicle Photo */}
                <PhotoCard
                    title={fourthTitle}
                    subtitle={fourthSubtitle}
                    Icon={FourthIcon}
                    storedUri={fourthUri}
                    badge="✓ Photo uploaded"
                    permissionDenied={fourthPhoto.permissionDenied}
                    isLoading={fourthPhoto.isLoading}
                    onTap={fourthPhoto.pickPhoto}
                    onRetake={handleRetakeFourth}
                />
            </ScrollView>

            <View style={styles.footer}>
                <PrimaryButton
                    label={isSubmitting ? "Submitting..." : "Submit for Verification"}
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
    onTap: () => Promise<void>;
    onRetake: () => Promise<void>;
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

            {/* Permission denied inline banner */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
