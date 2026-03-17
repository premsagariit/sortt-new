/**
 * app/(aggregator)/profile/kyc-documents.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Profile KYC Management.
 * Manage Aadhaar, Selfie, and Shop/Vehicle photos.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Camera, CheckCircle, Trash, WarningCircle, ShieldCheck, IdentificationCard, User, Storefront, Truck } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton } from '../../../components/ui/Button';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { usePhotoCapture } from '../../../hooks/usePhotoCapture';
import { api } from '../../../lib/api';

interface DocumentStatus {
    id: string;
    label: string;
    dbKey: string;
    status: 'empty' | 'pending' | 'verified' | 'rejected';
    uri?: string | null;
    Icon: any;
}

export default function KycDocumentsScreen() {
    const router = useRouter();
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

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeDocId, setActiveDocId] = useState<string | null>(null);

    const capture = usePhotoCapture();

    // Sync capture back to store
    useEffect(() => {
        if (capture.photoUri && activeDocId) {
            switch (activeDocId) {
                case 'aadhaar_front': setKycAadhaarFrontUri(capture.photoUri); break;
                case 'aadhaar_back': setKycAadhaarBackUri(capture.photoUri); break;
                case 'selfie': setKycSelfieUri(capture.photoUri); break;
                case 'business': 
                    if (aggregatorType === 'shop') setKycShopPhotoUri(capture.photoUri);
                    else setKycVehiclePhotoUri(capture.photoUri);
                    break;
            }
            setActiveDocId(null);
            capture.reset();
        }
    }, [capture.photoUri]);

    const handlePick = async (id: string) => {
        setActiveDocId(id);
        await capture.capturePhoto();
    };

    const handleRemove = (id: string) => {
        switch (id) {
            case 'aadhaar_front': setKycAadhaarFrontUri(null); break;
            case 'aadhaar_back': setKycAadhaarBackUri(null); break;
            case 'selfie': setKycSelfieUri(null); break;
            case 'business': 
                if (aggregatorType === 'shop') setKycShopPhotoUri(null);
                else setKycVehiclePhotoUri(null);
                break;
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            
            if (kycAadhaarFrontUri && kycAadhaarFrontUri.startsWith('file://')) {
                formData.append('aadhaar_front', { uri: kycAadhaarFrontUri, name: 'af.jpg', type: 'image/jpeg' } as any);
            }
            if (kycAadhaarBackUri && kycAadhaarBackUri.startsWith('file://')) {
                formData.append('aadhaar_back', { uri: kycAadhaarBackUri, name: 'ab.jpg', type: 'image/jpeg' } as any);
            }
            if (kycSelfieUri && kycSelfieUri.startsWith('file://')) {
                formData.append('selfie', { uri: kycSelfieUri, name: 'selfie.jpg', type: 'image/jpeg' } as any);
            }
            
            const busUri = aggregatorType === 'shop' ? kycShopPhotoUri : kycVehiclePhotoUri;
            const busKey = aggregatorType === 'shop' ? 'shop_photo' : 'vehicle_photo';
            if (busUri && busUri.startsWith('file://')) {
                formData.append(busKey, { uri: busUri, name: 'bus.jpg', type: 'image/jpeg' } as any);
            }

            await api.post('/api/aggregators/kyc', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            Alert.alert('Success', 'KYC documents updated successfully.');
            router.back();
        } catch (error) {
            console.error('KYC update failed:', error);
            Alert.alert('Error', 'Failed to update KYC documents.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const docList: DocumentStatus[] = [
        { id: 'aadhaar_front', label: 'Aadhaar Card (Front)', dbKey: 'aadhaar_front', status: kycAadhaarFrontUri ? 'pending' : 'empty', uri: kycAadhaarFrontUri, Icon: IdentificationCard },
        { id: 'aadhaar_back', label: 'Aadhaar Card (Back)', dbKey: 'aadhaar_back', status: kycAadhaarBackUri ? 'pending' : 'empty', uri: kycAadhaarBackUri, Icon: IdentificationCard },
        { id: 'selfie', label: 'Your Selfie', dbKey: 'selfie', status: kycSelfieUri ? 'pending' : 'empty', uri: kycSelfieUri, Icon: User },
        { id: 'business', label: aggregatorType === 'shop' ? 'Shop Photo' : 'Vehicle Photo', dbKey: aggregatorType === 'shop' ? 'shop_photo' : 'vehicle_photo', status: (aggregatorType === 'shop' ? kycShopPhotoUri : kycVehiclePhotoUri) ? 'pending' : 'empty', uri: aggregatorType === 'shop' ? kycShopPhotoUri : kycVehiclePhotoUri, Icon: aggregatorType === 'shop' ? Storefront : Truck },
    ];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="KYC Documents"
                variant="light"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerInfo}>
                    <ShieldCheck size={20} color={colors.navy} weight="fill" />
                    <Text variant="caption" style={styles.headerInfoText as any}>
                        Please upload your documents for account verification. Documents are usually verified within 24 hours.
                    </Text>
                </View>

                <View style={styles.docList}>
                    {docList.map((doc) => (
                        <View key={doc.id} style={styles.docCard}>
                            <View style={styles.docHeader}>
                                <View style={styles.iconWrap}>
                                    <doc.Icon size={20} color={colors.navy} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text variant="subheading" color={colors.navy}>{doc.label}</Text>
                                    <StatusBadge status={doc.status} />
                                </View>
                            </View>

                            {doc.uri ? (
                                <View style={styles.previewContainer}>
                                    <Image source={{ uri: doc.uri }} style={styles.previewImage} />
                                    <Pressable style={styles.removeBtn} onPress={() => handleRemove(doc.id)}>
                                        <Trash size={16} color={colors.surface} weight="bold" />
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    style={styles.uploadTrigger}
                                    onPress={() => handlePick(doc.id)}
                                    disabled={capture.isLoading}
                                >
                                    {capture.isLoading && activeDocId === doc.id ? (
                                        <ActivityIndicator color={colors.teal} />
                                    ) : (
                                        <>
                                            <Camera size={24} color={colors.muted} />
                                            <Text variant="caption" color={colors.muted}>Tap to capture</Text>
                                        </>
                                    )}
                                </Pressable>
                            )}
                        </View>
                    ))}
                </View>

                <View style={styles.saveContainer}>
                    <PrimaryButton
                        label={isSubmitting ? "Updating..." : "Submit Updates"}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

function StatusBadge({ status }: { status: DocumentStatus['status'] }) {
    const config = {
        empty: { label: 'REQUIRED', color: colors.muted, bg: colors.bg },
        pending: { label: 'PENDING', color: colors.amber, bg: colors.amberLight },
        verified: { label: 'VERIFIED', color: colors.teal, bg: colors.tealLight },
        rejected: { label: 'REJECTED', color: colors.red, bg: colors.redLight },
    }[status];

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text variant="caption" style={[styles.badgeText, { color: config.color }] as any}>
                {config.label}
            </Text>
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
        paddingBottom: spacing.xxl * 2,
    },
    headerInfo: {
        flexDirection: 'row',
        backgroundColor: colorExtended.surface2,
        padding: spacing.md,
        borderRadius: radius.card,
        gap: spacing.sm,
        marginBottom: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerInfoText: {
        flex: 1,
        lineHeight: 18,
    },
    docList: {
        gap: spacing.lg,
    },
    docCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    docHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: colorExtended.surface2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    previewContainer: {
        height: 180,
        borderRadius: radius.input,
        overflow: 'hidden',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadTrigger: {
        height: 100,
        borderRadius: radius.input,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: colorExtended.surface2,
    },
    saveContainer: {
        marginTop: spacing.xl,
    },
});
