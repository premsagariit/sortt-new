/**
 * app/(aggregator)/execution/otp/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * OTP Verification — Aggregator enters OTP provided by seller.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, Animated, BackHandler } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius, colorExtended } from '../../../../constants/tokens';
import { NavBar } from '../../../../components/ui/NavBar';
import { useOrderStore } from '../../../../store/orderStore';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { PrimaryButton } from '../../../../components/ui/Button';
import { CheckCircle } from 'phosphor-react-native';
import { safeBack } from '../../../../utils/navigation';

export default function OTPVerificationScreen() {
    const { id, amount } = useLocalSearchParams<{ id: string, amount: string }>();
    const router = useRouter();
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isSuccess, setIsSuccess] = useState(false);
    const inputs = useRef<TextInput[]>([]);

    // Animation refs for success screen
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const storeOrders = useOrderStore((s: any) => s.orders);
    const fetchOrder = useOrderStore((s: any) => s.fetchOrder);
    const updateStatus = useOrderStore((s: any) => s.updateOrderStatus);
    const order = storeOrders.find((o: any) => o.orderId === id);
    const orderNumber = order?.orderNumber ?? `#${String(id ?? '').slice(0, 8).toUpperCase()}`;
    const targetOtp = order?.otp || '1234';

    useEffect(() => {
        if (id && !order) {
            fetchOrder(id, true);
        }
    }, [id, order, fetchOrder]);

    const handleOtpChange = (val: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = val;
        setOtp(newOtp);

        // Auto-focus next
        if (val !== '' && index < 3) {
            inputs.current[index + 1]?.focus();
        }
    };

    useEffect(() => {
        const onBackPress = () => true;
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (isSuccess) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                router.dismissAll();
                router.replace('/(aggregator)/home');
            }, 3500);

            return () => clearTimeout(timer);
        }
    }, [isSuccess, scaleAnim, fadeAnim, router]);

    const handleVerify = () => {
        if (otp.join('') === targetOtp) {
            updateStatus(id, 'completed');
            setIsSuccess(true);
        } else {
            Alert.alert('Invalid OTP', `Use ${targetOtp} for mock verification.`);
        }
    };

    if (isSuccess) {
        return (
            <View style={styles.successContainer}>
                <Stack.Screen options={{ headerShown: false }} />

                <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                    <CheckCircle size={80} color={colors.teal} weight="fill" />
                </Animated.View>

                <Animated.View style={[{ opacity: fadeAnim }, styles.successContent]}>
                    <Text variant="heading" style={styles.successHeading}>Payment Processed!</Text>
                    <Text variant="body" color={colors.muted} style={styles.successMessage}>
                        Order {orderNumber} has been marked as completed successfully.
                    </Text>

                    <View style={styles.receiptCard}>
                        <View style={styles.receiptRow}>
                            <Text variant="body" color={colors.slate}>Amount Paid</Text>
                            <Numeric size={20} color={colors.teal}>₹{amount}</Numeric>
                        </View>
                        <View style={styles.receiptDivider} />
                        <View style={styles.receiptRow}>
                            <Text variant="body" color={colors.slate}>Order Number</Text>
                            <Numeric size={14} color={colors.navy}>{orderNumber}</Numeric>
                        </View>
                    </View>

                    <PrimaryButton
                        label="Back to Home"
                        onPress={() => {
                            router.dismissAll();
                            router.replace('/(aggregator)/home');
                        }}
                        style={{ marginTop: spacing.xxl, width: '100%' }}
                    />
                </Animated.View>
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Stack.Screen options={{ headerShown: false }} />

                <NavBar
                    title="Verify OTP"
                    variant="light"
                    onBack={() => safeBack(`/(aggregator)/execution/weighing/${id}` as any)}
                />

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text variant="subheading">Collect OTP from Seller</Text>
                        <Text variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                            Ask the seller for the 4-digit code shown on their app.
                        </Text>
                    </View>

                    <View style={styles.amountCard}>
                        <Text variant="label" color={colors.slate}>AMOUNT TO PAY</Text>
                        <Numeric size={32} color={colors.navy}>₹{amount}</Numeric>
                    </View>

                    <View style={styles.otpRow}>
                        {otp.map((digit, i) => (
                            <TextInput
                                key={i}
                                ref={(ref) => (inputs.current[i] = ref as any)}
                                style={styles.otpInput}
                                value={digit}
                                onChangeText={(v) => handleOtpChange(v, i)}
                                keyboardType="numeric"
                                maxLength={1}
                                placeholder="0"
                                placeholderTextColor={colors.border}
                            />
                        ))}
                    </View>

                    <View style={styles.footer}>
                        <PrimaryButton
                            label="Confirm & Mark Completed"
                            onPress={handleVerify}
                            disabled={otp.some(d => d === '')}
                        />
                        <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', marginTop: spacing.md }}>
                            By confirming, you agree that you have collected the scrap and weighed it correctly.
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
    amountCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radius.card,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.xxl,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.xxl,
    },
    otpInput: {
        width: 60,
        height: 70,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 2,
        borderColor: colors.border,
        fontSize: 32,
        fontFamily: 'DMMono-Bold',
        color: colors.navy,
        textAlign: 'center',
    },
    footer: {
        marginTop: 'auto',
    },
    successContainer: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        paddingTop: 120, // push down a bit
        paddingHorizontal: spacing.xl,
    },
    successContent: {
        alignItems: 'center',
        width: '100%',
    },
    successHeading: {
        marginTop: spacing.xl,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    successMessage: {
        textAlign: 'center',
        marginBottom: spacing.xxl,
        paddingHorizontal: spacing.sm,
    },
    receiptCard: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.md,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    receiptDivider: {
        height: 1,
        backgroundColor: colors.border,
        width: '100%',
    },
});
