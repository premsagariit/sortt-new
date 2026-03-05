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
import { Camera, MapPin, User } from 'phosphor-react-native';
import { safeBack } from '../../utils/navigation';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';

const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');

export default function AggregatorEditProfileScreen() {
    const router = useRouter();
    const { name, locality, city, setName, setLocality } = useAuthStore();

    const [newName, setNewName] = useState(name);
    const [newLocality, setNewLocality] = useState(locality);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        const trimmedName = newName.trim();
        const trimmedLocality = newLocality.trim();

        if (trimmedName.length === 0) {
            setError('Name cannot be empty');
            return;
        }

        if (trimmedName.length > 50) {
            setError('Name is too long (max 50 chars)');
            return;
        }

        if (trimmedLocality.length > 80) {
            setError('Locality is too long (max 80 chars)');
            return;
        }

        setIsSaving(true);
        setError(null);

        // Simulate small delay for UX feedback
        setTimeout(() => {
            setName(trimmedName);
            setLocality(trimmedLocality);
            setIsSaving(false);
            router.back();
        }, 600);
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
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Enter your name"
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

