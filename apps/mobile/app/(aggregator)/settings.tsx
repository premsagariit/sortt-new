/**
 * app/(aggregator)/settings.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator High-fidelity Settings Screen.
 * Match provided UI design with Account Card, Toggles, and Preferences.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaretRight } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { Text } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { Avatar } from '../../components/ui/Avatar';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { useAuthStore } from '../../store/authStore';

const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');

interface SettingToggleProps {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    isLast?: boolean;
}

function SettingToggle({ title, subtitle, value, onValueChange, isLast }: SettingToggleProps) {
    return (
        <View style={[styles.row, isLast && styles.lastRow]}>
            <View style={styles.textContent}>
                <Text variant="body" style={styles.title}>{title}</Text>
                {subtitle && <Text variant="caption" color={colors.muted} style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: colors.teal }}
                thumbColor={colors.surface}
            />
        </View>
    );
}

interface SettingLinkProps {
    title: string;
    subtitle?: string;
    onPress: () => void;
    isLast?: boolean;
    isDestructive?: boolean;
}

function SettingLink({ title, subtitle, onPress, isLast, isDestructive }: SettingLinkProps) {
    return (
        <Pressable style={[styles.row, isLast && styles.lastRow]} onPress={onPress}>
            <View style={styles.textContent}>
                <Text variant="body" style={[styles.title, isDestructive && { color: colors.red }] as any}>{title}</Text>
                {subtitle && <Text variant="caption" color={colors.muted} style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <CaretRight size={16} color={isDestructive ? colors.red : colors.border} weight="bold" />
        </Pressable>
    );
}

export default function AggregatorSettingsScreen() {
    const router = useRouter();
    const { signOut: clerkSignOut } = useAuth();
    const { fullName, aggregatorType, primaryArea, isOnline, updateOnlineStatus, fetchAggregatorProfile, profile } = useAggregatorStore();
    const phoneNumber = useAuthStore((s) => s.phoneNumber);

    const handleLogout = async () => {
        try {
            await clerkSignOut();
        } catch {
        }
        useAuthStore.getState().clearSession();
        router.replace('/(auth)/phone');
    };

        React.useEffect(() => {
                void fetchAggregatorProfile();
        }, [fetchAggregatorProfile]);

        const displayName = profile?.businessName || fullName || 'Aggregator';
    const displayPhone = phoneNumber
      ? `+91 •••••${phoneNumber.slice(-5)}`
            : '+91 •••••';
        const displayType = aggregatorType === 'shop' ? 'Shop-Based' : aggregatorType === 'mobile' ? 'Mobile' : 'Aggregator';
        const displayLocality = profile?.operatingArea || primaryArea || 'Unknown Area';

    // States match the UI requirements
    const [autoOffline, setAutoOffline] = useState(true);
    const [newOrderAlerts, setNewOrderAlerts] = useState(true);
    const [priceUpdates, setPriceUpdates] = useState(true);
    const [sellerMessages, setSellerMessages] = useState(true);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <NavBar
                title="Settings"
                variant="light"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ACCOUNT SECTION */}
                <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>ACCOUNT</Text>
                <View style={styles.card}>
                    <View style={styles.accountRow}>
                        <Avatar name={displayName} userType="aggregator" size="lg" source={AVATAR_SOURCE} />
                        <View style={styles.accountInfo}>
                            <Text variant="body" style={styles.userName}>{displayName}</Text>
                            <Text variant="caption" color={colors.muted} style={styles.userDetail}>
                                {displayPhone} · {displayType} · {displayLocality}
                            </Text>
                        </View>
                        <Pressable onPress={() => router.push('/(aggregator)/edit-profile')}>
                            <Text variant="body" style={styles.editText}>Edit</Text>
                        </Pressable>
                    </View>
                </View>

                {/* AVAILABILITY SECTION */}
                <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>AVAILABILITY</Text>
                <View style={styles.card}>
                    <SettingToggle
                        title="Online status"
                        subtitle="Visible to sellers when online"
                        value={isOnline}
                        onValueChange={updateOnlineStatus}
                    />
                    <SettingToggle
                        title="Auto-offline after hours"
                        subtitle="Go offline after 7 PM automatically"
                        value={autoOffline}
                        onValueChange={setAutoOffline}
                        isLast
                    />
                </View>

                {/* NOTIFICATIONS SECTION */}
                <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>NOTIFICATIONS</Text>
                <View style={styles.card}>
                    <SettingToggle
                        title="New orders near me"
                        subtitle="Alert when a matching order is posted"
                        value={newOrderAlerts}
                        onValueChange={setNewOrderAlerts}
                    />
                    <SettingToggle
                        title="Price index updates"
                        subtitle="Daily market rate changes"
                        value={priceUpdates}
                        onValueChange={setPriceUpdates}
                    />
                    <SettingToggle
                        title="Seller messages"
                        value={sellerMessages}
                        onValueChange={setSellerMessages}
                        isLast
                    />
                </View>

                {/* PREFERENCES SECTION */}
                <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>PREFERENCES</Text>
                <View style={styles.card}>
                    <SettingLink
                        title="Language"
                        subtitle="English"
                        onPress={() => router.push('/(shared)/language' as any)}
                    />
                    <SettingLink
                        title="Min. order value"
                        subtitle="Only show orders above ₹100"
                        onPress={() => { }} // Feature implementation for later
                        isLast
                    />
                </View>

                {/* DELETE ACCOUNT */}
                <View style={[styles.card, { marginTop: spacing.lg }]}>
                    <SettingLink
                        title="Log Out"
                        isDestructive
                        onPress={() => { void handleLogout(); }}
                    />
                    <SettingLink
                        title="Delete Account"
                        isDestructive
                        isLast
                        onPress={() => Alert.alert('Account deletion requested')}
                    />
                </View>

            </ScrollView>
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
        paddingBottom: spacing.xxl,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.slate,
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
        marginLeft: spacing.xs,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        gap: spacing.sm,
    },
    accountInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        fontWeight: '600',
        color: colors.navy,
    },
    userDetail: {
        marginTop: 2,
        lineHeight: 16,
    },
    editText: {
        fontWeight: '600',
        color: colors.red,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        minHeight: 64,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    textContent: {
        flex: 1,
    },
    title: {
        fontWeight: '500',
        color: colors.navy,
    },
    subtitle: {
        marginTop: 2,
    },
});
