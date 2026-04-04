/**
 * app/(aggregator)/edit-profile.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Edit Profile screen.
 * Replicates high-fidelity form from seller side for consistency.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, Camera, EnvelopeSimple, MapPin, User } from 'phosphor-react-native';
import { safeBack } from '../../utils/navigation';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useAggregatorStore } from '../../store/aggregatorStore';

const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');

export default function AggregatorEditProfileScreen() {
    const router = useRouter();
    const { name, email, locality, city, setName, setEmail, setLocality } = useAuthStore();
    const { profile, fetchAggregatorProfile } = useAggregatorStore();

    const [newFullName, setNewFullName] = useState(profile?.name || name);
    const [newEmail, setNewEmail] = useState(profile?.email || email);
    const [newBusinessName, setNewBusinessName] = useState(profile?.businessName || '');
    const [newLocality, setNewLocality] = useState(profile?.operatingArea || locality);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        void fetchAggregatorProfile();
    }, [fetchAggregatorProfile]);

    React.useEffect(() => {
        // Correctly distinguish between user's name and business name
        setNewFullName(profile?.name || name);
        setNewEmail(profile?.email || email);
        setNewBusinessName(profile?.businessName || '');
        setNewLocality(profile?.operatingArea || locality);
    }, [profile, name, email, locality]);

    const handleSave = async () => {
        const trimmedName = newFullName.trim();
        const trimmedEmail = newEmail.trim();
        const trimmedLocality = newLocality.trim();

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

        setIsSaving(true);
        setError(null);

        try {
            await useAggregatorStore.getState().updateProfile({
                name: newFullName.trim(),
                email: trimmedEmail || null,
                business_name: newBusinessName.trim(),
                operating_area: trimmedLocality,
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
                    <View style={styles.avatarWrap}>
                        <Avatar
                            name={name}
                            userType="aggregator"
                            size="lg"
                            source={AVATAR_SOURCE}
                        />
                        <View style={styles.cameraIcon}>
                            <Camera size={18} color={colors.surface} weight="fill" />
                        </View>
                    </View>
                    <Text variant="label" color={colors.red} style={{ marginTop: 12, fontWeight: '600' }}>
                        Change Photo
                    </Text>
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

