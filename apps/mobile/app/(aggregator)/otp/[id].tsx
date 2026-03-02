/**
 * app/(aggregator)/otp/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * OTP Verification — Aggregator enters OTP provided by seller.
 * 
 * V25: Success animation and redirection to Home.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { CheckCircle } from 'phosphor-react-native';

export default function OTPVerificationScreen() {
    const { id, amount } = useLocalSearchParams<{ id: string, amount: string }>();
    const router = useRouter();
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isSuccess, setIsSuccess] = useState(false);
    const inputs = useRef<TextInput[]>([]);

    const handleOtpChange = (val: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = val;
        setOtp(newOtp);

        // Auto-focus next
        if (val !== '' && index < 3) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleVerify = () => {
        // Mock verification
        if (otp.join('') === '1234') {
            setIsSuccess(true);
            setTimeout(() => {
                router.dismissAll();
                router.replace('/(aggregator)/home');
            }, 2000);
        } else {
            Alert.alert('Invalid OTP', 'Use 1234 for mock verification.');
        }
    };

    if (isSuccess) {
        return (
            <View style={styles.successContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <CheckCircle size={80} color={colors.teal} weight="fill" />
                <Text variant="heading" style={{ marginTop: spacing.lg }}>Payment Scripted!</Text>
                <Text variant="body" color={colors.muted} style={{ textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }}>
                    ₹{amount} has been processed for Order #{id}.
                </Text>
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
                    onBack={() => router.back()}
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
        justifyContent: 'center',
        padding: spacing.xl,
    },
});
