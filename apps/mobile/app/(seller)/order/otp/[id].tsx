/**
 * app/(seller)/order/otp/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Seller OTP Display — Seller shows this to aggregator for verification.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Share, BackHandler } from 'react-native';
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
    const fetchOrder = useOrderStore((s) => s.fetchOrder);
    const order = useOrderStore((s) => s.orders.find(o => o.orderId === id));
    const orderNumber = order?.orderNumber ?? `#${String(id ?? '').slice(0, 8).toUpperCase()}`;

    const otp = order?.otp || '';

    useEffect(() => {
        if (id) {
            fetchOrder(id, true);
        }
    }, [id, fetchOrder]);

    useEffect(() => {
        if (!id) return;

        const interval = setInterval(() => {
            fetchOrder(id, true);
        }, 3000);

        return () => clearInterval(interval);
    }, [id, fetchOrder]);

    useEffect(() => {
        if (!id || order?.status !== 'completed') return;

        const completedAmount = Number(
            order?.confirmedTotal ?? order?.displayAmount ?? order?.confirmedAmount ?? order?.estimatedTotal ?? order?.estimatedAmount ?? 0
        );

        router.replace({
            pathname: '/(shared)/order-complete',
            params: {
                orderId: order?.orderId ?? id,
                amount: String(completedAmount),
                fallback: `/(seller)/order/receipt/${id}`,
            },
        });
    }, [id, order?.status, order?.orderId, order?.confirmedTotal, order?.displayAmount, order?.confirmedAmount, order?.estimatedTotal, order?.estimatedAmount, router]);

    useEffect(() => {
        const onBackPress = () => true;
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `My Sortt verification code for Order ${orderNumber} is: ${otp}`,
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
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text variant="subheading" style={styles.title}>Verification Code</Text>
                    <Text variant="body" color={colors.muted} style={styles.subtitle}>
                        Show this 6-digit code to the dealer to confirm the pickup and complete the payment.
                    </Text>
                </View>

                <View style={styles.otpCard}>
                    {otp ? (
                        <View style={styles.otpRow}>
                            {otp.split('').map((digit, i) => (
                                <View key={i} style={styles.digitBox}>
                                    <Numeric size={36} color={colors.navy}>{digit}</Numeric>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text variant="caption" color={colors.muted} style={styles.waitingText}>
                            Waiting for OTP generation...
                        </Text>
                    )}
                    <View style={styles.orderLabel}>
                        <Text variant="caption" color={colors.muted}>Order ID: </Text>
                        <Numeric size={12} color={colors.navy}>{orderNumber}</Numeric>
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
                        disabled={!otp}
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
    waitingText: {
        textAlign: 'center',
        paddingVertical: spacing.md,
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: colors.tealLight,
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
