import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Globe, Phone, ChatCenteredText, MapTrifold, CaretLeft } from 'phosphor-react-native';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { BaseCard } from '../../../components/ui/Card';

type NavigateState = 'accepted' | 'enroute';

export default function NavigateScreen() {
    const [executionState, setExecutionState] = useState<NavigateState>('accepted');
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        router.back();
    };

    const handleNextState = () => {
        if (executionState === 'accepted') {
            setExecutionState('enroute');
        } else {
            // Updated to point to the new persistent weighing screen within the execution stack
            router.push(`/(aggregator)/execution/weighing/ORD-24091` as any);
        }
    };

    return (
        <View style={styles.container}>
            {/* NavBar - Light variant as per spec */}
            <NavBar
                variant="light"
                title="Order #ORD-24091"
                onBack={handleBack}
            />

            {/* Map View Placeholder */}
            <View style={styles.mapContainer}>
                <View style={styles.mapGrid}>
                    {/* Centered Globe icon (40% opacity) */}
                    <Globe size={120} color={colors.navy} weight="thin" style={{ opacity: 0.1 }} />
                    <Numeric size={13} color={colors.muted} style={styles.mapText}>
                        Map Live Preview
                    </Numeric>
                </View>
            </View>

            {/* Location Card Overlay */}
            <View style={styles.overlayContainer}>
                <BaseCard style={styles.locationCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.locationInfo}>
                            <Text variant="subheading" style={styles.sellerName}>
                                Priya ••••6721
                            </Text>
                            <Text variant="body" style={styles.addressText}>
                                No. 24, 7th Cross, 3rd Main Road, HSR Layout, Sector 2, Hyderabad - 500102
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.callButton}>
                            <Phone size={24} color={colors.teal} weight="fill" />
                        </TouchableOpacity>
                    </View>
                </BaseCard>
            </View>

            {/* Fixed Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                {executionState === 'accepted' ? (
                    <View style={styles.dualActions}>
                        <SecondaryButton
                            label="Chat"
                            onPress={() => router.push('/(shared)/chat/ORD-24091' as any)}
                            style={styles.chatButton}
                            icon={<ChatCenteredText size={20} color={colors.navy} />}
                        />
                        <PrimaryButton
                            label="Mark En Route"
                            onPress={handleNextState}
                            style={styles.enRouteButton}
                        />
                    </View>
                ) : (
                    <PrimaryButton
                        label="✓ I've Arrived"
                        onPress={handleNextState}
                        style={[styles.arrivedButton, { backgroundColor: colors.teal }]}
                    />
                )}
            </View>

            {/* SafeAreaView edges={['bottom']} implicitly handled by bottomBar padding */}
            <SafeAreaView edges={['bottom']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="none" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    navAction: {
        padding: spacing.xs,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: colors.surface2,
    },
    mapGrid: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapText: {
        marginTop: spacing.sm,
        color: colors.muted,
    },
    overlayContainer: {
        position: 'absolute',
        bottom: 120, // Space for bottom bar
        left: spacing.md,
        right: spacing.md,
    },
    locationCard: {
        padding: spacing.md,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    locationInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    sellerName: {
        color: colors.navy,
        marginBottom: spacing.xs,
    },
    addressText: {
        color: colors.slate,
        fontSize: 14,
        lineHeight: 20,
    },
    callButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colorExtended.tealLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xs,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    dualActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    chatButton: {
        flex: 1,
    },
    enRouteButton: {
        flex: 2,
    },
    arrivedButton: {
        width: '100%',
    },
});
