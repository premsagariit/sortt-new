/**
 * app/(seller)/order/otp/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Seller OTP Display — Seller shows this to aggregator for verification.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../../../constants/tokens';
import { NavBar } from '../../../../components/ui/NavBar';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { PrimaryButton } from '../../../../components/ui/Button';
import { useOrderStore } from '../../../../store/orderStore';
import { ShareNetwork, Info } from 'phosphor-react-native';

export default function SellerOTPDisplayScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const order = useOrderStore((s) => s.orders.find(o => o.orderId === id));

    // Fallback OTP if not in store
    const otp = order?.otp || '1234';

    const handleShare = async () => {
        try {
            await Share.share({
                message: `My Sortt verification code for Order #${id} is: ${otp}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <NavBar
                title="Share OTP"
                variant="light"
                onBack={() => router.back()}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text variant="subheading" style={styles.title}>Verification Code</Text>
                    <Text variant="body" color={colors.muted} style={styles.subtitle}>
                        Show this 4-digit code to the dealer to confirm the pickup and complete the payment.
                    </Text>
                </View>

                <View style={styles.otpCard}>
                    <View style={styles.otpRow}>
                        {otp.split('').map((digit, i) => (
                            <View key={i} style={styles.digitBox}>
                                <Numeric size={36} color={colors.navy}>{digit}</Numeric>
                            </View>
                        ))}
                    </View>
                    <View style={styles.orderLabel}>
                        <Text variant="caption" color={colors.muted}>Order ID: </Text>
                        <Numeric size={12} color={colors.navy}>{id}</Numeric>
                    </View>
                </View>

                <View style={styles.infoBanner}>
                    <Info size={20} color={colors.teal} weight="fill" />
                    <Text variant="caption" color={colors.slate} style={styles.infoText}>
                        Do not share this OTP over the phone. Only share it when the dealer is present and has weighed all materials.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <PrimaryButton
                        label="Share Verification Code"
                        onPress={handleShare}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    content: {
        flex: 1,
        padding: spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    title: {
        fontSize: 22,
        color: colors.navy,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    otpCard: {
        backgroundColor: colors.surface,
        padding: spacing.xl,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    otpRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    digitBox: {
        width: 60,
        height: 70,
        backgroundColor: colors.bg,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderLabel: {
        flexDirection: 'row',
        marginTop: spacing.lg,
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: '#E6FFFA', // Light teal
        padding: spacing.md,
        borderRadius: radius.card,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        lineHeight: 18,
    },
    footer: {
        marginTop: 'auto',
    },
});
