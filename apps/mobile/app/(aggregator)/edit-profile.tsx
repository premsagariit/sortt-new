/**
 * app/(aggregator)/edit-profile.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Edit Profile screen.
 * Replicates high-fidelity form from seller side for consistency.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, Camera, EnvelopeSimple, IdentificationCard, MapPin, User } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { safeBack } from '../../utils/navigation';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { api } from '../../lib/api';

type FileSystemCompat = {
    cacheDirectory?: string | null;
    documentDirectory?: string | null;
    copyAsync: (options: { from: string; to: string }) => Promise<void>;
};

export default function AggregatorEditProfileScreen() {
    const router = useRouter();
    const { name, email, locality, city, profilePhoto, setName, setEmail, setLocality, setProfilePhoto } = useAuthStore();
    const { profile, fetchAggregatorProfile } = useAggregatorStore();

    const [newFullName, setNewFullName] = useState(profile?.name || name);
    const [newEmail, setNewEmail] = useState(profile?.email || email);
    const [newBusinessName, setNewBusinessName] = useState(profile?.businessName || '');
    const [newLocality, setNewLocality] = useState(profile?.operatingArea || locality);
    const [newVehicleNumber, setNewVehicleNumber] = useState(profile?.vehicleNumber || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMobileAggregator = profile?.aggregatorType === 'mobile';

    const ensureUploadableUri = async (uri: string, filename: string): Promise<string> => {
        if (Platform.OS === 'android' && uri.startsWith('content://')) {
            const extensionMatch = /\.([a-zA-Z0-9]+)$/.exec(filename);
            const extension = extensionMatch?.[1] ?? 'jpg';
            const fs = FileSystem as unknown as FileSystemCompat;
            const safeDir = fs.cacheDirectory ?? fs.documentDirectory;
            if (!safeDir) return uri;

            const copiedUri = `${safeDir}profile_upload_${Date.now()}.${extension}`;
            await fs.copyAsync({ from: uri, to: copiedUri });
            return copiedUri;
        }

        return uri;
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                
                setIsUploadingPhoto(true);
                setError(null);
                
                const filename = asset.fileName || asset.uri.split('/').pop() || 'profile.jpg';
                const localUri = await ensureUploadableUri(asset.uri, filename);
                const match = /\.(\w+)$/.exec(filename);
                const type = asset.mimeType || (match ? `image/${match[1].toLowerCase()}` : 'image/jpeg');
                
                const authToken = useAuthStore.getState().token;
                const url = `${api.defaults.baseURL}/api/users/profile-photo`;
                const maxAttempts = 3;
                let uploadedUrl: string | null = null;

                for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                    const formData = new FormData();
                    formData.append('file', {
                        uri: localUri,
                        name: filename,
                        type,
                    } as any);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 90000);
                    try {
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                            },
                            body: formData,
                            signal: controller.signal,
                        });

                        const payload = await response.json().catch(() => ({}));
                        if (!response.ok) {
                            const err: any = new Error(payload?.error || `Profile photo upload failed (${response.status})`);
                            err.response = { status: response.status, data: payload };
                            throw err;
                        }

                        uploadedUrl = typeof payload?.profile_photo_url === 'string' ? payload.profile_photo_url : null;
                        break;
                    } catch (uploadErr: any) {
                        const status = uploadErr?.response?.status;
                        const retryable = !status || status >= 500 || uploadErr?.name === 'AbortError';
                        if (attempt < maxAttempts && retryable) {
                            await new Promise((resolve) => setTimeout(resolve, attempt * 700));
                            continue;
                        }
                        throw uploadErr;
                    } finally {
                        clearTimeout(timeoutId);
                    }
                }

                if (uploadedUrl) {
                    setProfilePhoto(uploadedUrl);
                }
            }
        } catch (err: any) {
            console.error('Error uploading photo', err);
            setError('Failed to upload photo. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    React.useEffect(() => {
        void fetchAggregatorProfile();
    }, [fetchAggregatorProfile]);

    React.useEffect(() => {
        // Correctly distinguish between user's name and business name
        setNewFullName(profile?.name || name);
        setNewEmail(profile?.email || email);
        setNewBusinessName(profile?.businessName || '');
        setNewLocality(profile?.operatingArea || locality);
        setNewVehicleNumber(profile?.vehicleNumber || '');
    }, [profile, name, email, locality]);

    const handleSave = async () => {
        const trimmedName = newFullName.trim();
        const trimmedEmail = newEmail.trim();
        const trimmedLocality = newLocality.trim();
        const trimmedVehicleNumber = newVehicleNumber.trim().toUpperCase();

        if (trimmedName.length === 0) {
            setError('Name cannot be empty');
            return;
        }

        if (trimmedName.length > 50) {
            setError('Name is too long (max 50 chars)');
            return;
        }

        if (trimmedEmail.length > 0 && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
            setError('Enter a valid email address');
            return;
        }

        if (trimmedLocality.length > 80) {
            setError('Locality is too long (max 80 chars)');
            return;
        }

        if (isMobileAggregator && trimmedVehicleNumber.length === 0) {
            setError('Vehicle number is required for mobile aggregators');
            return;
        }

        if (trimmedVehicleNumber.length > 20) {
            setError('Vehicle number is too long (max 20 chars)');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await useAggregatorStore.getState().updateProfile({
                name: newFullName.trim(),
                email: trimmedEmail || null,
                business_name: newBusinessName.trim(),
                operating_area: trimmedLocality,
                vehicle_number: isMobileAggregator ? (trimmedVehicleNumber || null) : undefined,
            });
            setName(newFullName.trim());
            setEmail(trimmedEmail);
            setLocality(trimmedLocality);
            setIsSaving(false);
            router.back();
        } catch (err: any) {
            setIsSaving(false);
            setError(err.message || 'Failed to update profile');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="Edit Profile"
                variant="light"
                onBack={() => safeBack()}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <Pressable style={styles.avatarWrap} onPress={handlePickImage} disabled={isUploadingPhoto || isSaving}>
                        <Avatar
                            name={name}
                            userType="aggregator"
                            size="xxxl"
                            uri={profilePhoto || undefined}
                        />
                        <View style={styles.cameraIcon}>
                            <Camera size={18} color={colors.surface} weight="fill" />
                        </View>
                    </Pressable>
                    {isUploadingPhoto && (
                        <Text variant="label" color={colors.red} style={{ marginTop: 12, fontWeight: '600' }}>
                            Uploading...
                        </Text>
                    )}
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text variant="label" color={colors.muted} style={styles.inputLabel}>FULL NAME</Text>
                        <View style={styles.inputWrap}>
                            <User size={20} color={colors.muted} />
                            <TextInput
                                style={styles.input}
                                value={newFullName}
                                onChangeText={setNewFullName}
                                placeholder="Enter your full name"
                                placeholderTextColor={colors.muted}
                                maxLength={60}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text variant="label" color={colors.muted} style={styles.inputLabel}>EMAIL ADDRESS</Text>
                        <View style={styles.inputWrap}>
                            <EnvelopeSimple size={20} color={colors.muted} />
                            <TextInput
                                style={styles.input}
                                value={newEmail}
                                onChangeText={setNewEmail}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.muted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={120}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text variant="label" color={colors.muted} style={styles.inputLabel}>BUSINESS NAME</Text>
                        <View style={styles.inputWrap}>
                            <Briefcase size={20} color={colors.muted} />
                            <TextInput
                                style={styles.input}
                                value={newBusinessName}
                                onChangeText={setNewBusinessName}
                                placeholder="e.g. Hyderabad Scrap Store"
                                placeholderTextColor={colors.muted}
                                maxLength={60}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text variant="label" color={colors.muted} style={styles.inputLabel}>LOCALITY / AREA</Text>
                        <View style={styles.inputWrap}>
                            <MapPin size={20} color={colors.muted} />
                            <TextInput
                                style={styles.input}
                                value={newLocality}
                                onChangeText={setNewLocality}
                                placeholder="e.g. Madhapur"
                                placeholderTextColor={colors.muted}
                                maxLength={90}
                            />
                        </View>
                    </View>

                    {isMobileAggregator && (
                        <View style={styles.inputGroup}>
                            <Text variant="label" color={colors.muted} style={styles.inputLabel}>VEHICLE NUMBER</Text>
                            <View style={styles.inputWrap}>
                                <IdentificationCard size={20} color={colors.muted} />
                                <TextInput
                                    style={styles.input}
                                    value={newVehicleNumber}
                                    onChangeText={(txt) => setNewVehicleNumber(txt.toUpperCase())}
                                    placeholder="e.g. TS09AB1234"
                                    placeholderTextColor={colors.muted}
                                    autoCapitalize="characters"
                                    maxLength={20}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text variant="label" color={colors.muted} style={styles.inputLabel}>CITY</Text>
                        <View style={[styles.inputWrap, styles.inputDisabled]}>
                            <MapPin size={20} color={colors.muted} weight="fill" />
                            <Text variant="body" color={colors.muted} style={styles.inputTextDisabled}>{city}</Text>
                            <View style={styles.pilotPill}>
                                <Text variant="caption" color={colors.amber} style={{ fontSize: 10, fontWeight: '700' }}>PILOT</Text>
                            </View>
                        </View>
                        <Text variant="caption" color={colors.muted} style={{ marginTop: 8 }}>
                            City switching is disabled during the Hyderabad pilot phase.
                        </Text>
                    </View>

                    {error && (
                        <View style={styles.errorBanner}>
                            <Text variant="caption" color={colors.red}>{error}</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />

                <PrimaryButton
                    label={isSaving ? "Saving..." : "Save Changes"}
                    onPress={handleSave}
                    disabled={isSaving}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
    },
    avatarSection: {
        alignItems: 'center',
        marginVertical: 24,
    },
    avatarWrap: {
        position: 'relative',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.navy,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginLeft: 4,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
        paddingHorizontal: spacing.md,
        height: 56,
        gap: 12,
    },
    input: {
        flex: 1,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: colors.navy,
        height: '100%',
    },
    inputDisabled: {
        backgroundColor: colorExtended.surface2,
    },
    inputTextDisabled: {
        flex: 1,
    },
    pilotPill: {
        backgroundColor: colorExtended.amberLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.amber,
    },
    errorBanner: {
        backgroundColor: 'rgba(255, 0, 0, 0.05)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 0, 0.1)',
    },
});

