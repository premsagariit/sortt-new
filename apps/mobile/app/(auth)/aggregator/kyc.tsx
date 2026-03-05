/**
 * app/(auth)/aggregator/kyc.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator KYC — Step 4/4 of onboarding.
 * Two independent camera cards (Aadhaar + Shop/Vehicle photo).
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
import { Camera, IdentificationCard, Storefront, WarningCircle, CheckCircle, IconWeight } from 'phosphor-react-native';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { useAggregatorStore } from '../../../store/aggregatorStore';
// Camera logic is ONLY in this hook — never call ImagePicker directly in screens
import { usePhotoCapture } from '../../../hooks/usePhotoCapture';

export default function KycScreen() {
    const {
        kycAadhaarUri,
        kycShopPhotoUri,
        setKycAadhaarUri,
        setKycShopPhotoUri,
    } = useAggregatorStore();

    // Two independent hook instances — each manages its own permission + loading state
    const aadhaar = usePhotoCapture();
    const shopPhoto = usePhotoCapture();

    // Sync Aadhaar capture into store
    useEffect(() => {
        if (aadhaar.photoUri) setKycAadhaarUri(aadhaar.photoUri);
    }, [aadhaar.photoUri, setKycAadhaarUri]);

    // Sync shop/vehicle capture into store
    useEffect(() => {
        if (shopPhoto.photoUri) setKycShopPhotoUri(shopPhoto.photoUri);
    }, [shopPhoto.photoUri, setKycShopPhotoUri]);

    const handleRetakeAadhaar = async () => {
        aadhaar.reset();
        setKycAadhaarUri(null);
        await aadhaar.pickPhoto();
    };

    const handleRetakeShop = async () => {
        shopPhoto.reset();
        setKycShopPhotoUri(null);
        await shopPhoto.pickPhoto();
    };

    // Submit enabled only when BOTH URIs are captured — reads from STORE, not local state
    const canSubmit = kycAadhaarUri !== null && kycShopPhotoUri !== null;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <NavBar
                variant="light"
                title="KYC Documents"
                onBack={() => router.back()}
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
                        Both photos are required. Documents are verified within 24 hours.
                    </Text>
                </View>

                {/* Card 1 — Aadhaar */}
                <PhotoCard
                    title="Aadhaar Card (Front)"
                    subtitle="Clear photo of the front side of your Aadhaar card"
                    Icon={IdentificationCard}
                    storedUri={kycAadhaarUri}
                    badge="✓ Aadhaar uploaded"
                    permissionDenied={aadhaar.permissionDenied}
                    isLoading={aadhaar.isLoading}
                    onTap={aadhaar.pickPhoto}
                    onRetake={handleRetakeAadhaar}
                />

                {/* Card 2 — Shop / Vehicle Photo */}
                <PhotoCard
                    title="Shop / Vehicle Photo"
                    subtitle="Photo of your shop front or collection vehicle"
                    Icon={Storefront}
                    storedUri={kycShopPhotoUri}
                    badge="✓ Photo uploaded"
                    permissionDenied={shopPhoto.permissionDenied}
                    isLoading={shopPhoto.isLoading}
                    onTap={shopPhoto.pickPhoto}
                    onRetake={handleRetakeShop}
                />
            </ScrollView>

            <View style={styles.footer}>
                <PrimaryButton
                    label="Submit & Continue →"
                    onPress={() => router.push('/(auth)/aggregator/kyc-pending' as any)}
                    disabled={!canSubmit}
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
