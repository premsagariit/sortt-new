import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, Clock } from 'phosphor-react-native';
import { colors, spacing, radius, colorExtended } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { BaseCard } from '../../../components/ui/Card';
import { useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';

type ConfirmState = 'waiting' | 'verified';

export default function ConfirmScreen() {
    const [state, setState] = useState<ConfirmState>('waiting');
    const insets = useSafeAreaInsets();
    const pulseAnim = React.useRef(new Animated.Value(1)).current;
    const { id } = useLocalSearchParams<{ id: string }>();
    const { orders, fetchOrder } = useOrderStore();
    const { executionDraftByOrderId } = useAggregatorStore();
    const order = orders.find((o) => o.orderId === id);
    const draft = id ? executionDraftByOrderId[id] : undefined;

    useEffect(() => {
        if (id && !order) {
            fetchOrder(id, true);
        }
    }, [id, order, fetchOrder]);

    const internalOrderId = order?.orderId ?? id ?? 'ORD-24091';
    const displayOrderNumber = order?.orderNumber ?? `#${String(internalOrderId).slice(0, 8).toUpperCase()}`;
    const totalWeight = draft?.totalWeight ?? (order?.lineItems?.reduce((sum, item) => sum + Number(item.weightKg || 0), 0) ?? 0);
    const totalAmount = draft?.totalAmount ?? Number(order?.displayAmount ?? order?.confirmedAmount ?? order?.estimatedAmount ?? 0);
    const itemCount = draft?.lineItems?.length ?? order?.materials?.length ?? 0;

    // Block back button
    useEffect(() => {
        const backAction = () => {
            return true; // Block back action
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, []);

    // Pulse animation for waiting state
    useEffect(() => {
        if (state === 'waiting') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Auto-advance after 3 seconds
            const timer = setTimeout(() => {
                setState('verified');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [state]);

    const handleFinish = () => {
        router.push({ pathname: '/(aggregator)/execution/receipt', params: { id: internalOrderId } } as any);
    };

    return (
        <View style={styles.container}>
            <NavBar
                variant="light"
                title={state === 'waiting' ? `Order ${displayOrderNumber}` : 'Pickup Confirmation'}
                onBack={undefined}
            />

            <View style={styles.content}>
                {state === 'waiting' ? (
                    <View style={styles.waitingContainer}>
                        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                            <View style={styles.pulseInner}>
                                <Clock size={48} color={colors.amber} weight="duotone" />
                            </View>
                        </Animated.View>
                        <Text variant="heading" style={styles.waitingTitle}>
                            Waiting for seller...
                        </Text>
                        <Text variant="body" color={colors.muted} style={styles.subtitle}>
                            The seller is reviewing the weights on their app. Once they confirm, the pickup will be verified.
                        </Text>

                        <BaseCard style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text variant="label" color={colors.muted}>Items Collected</Text>
                                <Numeric size={13} style={styles.monoText}>{itemCount} Items</Numeric>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text variant="label" color={colors.muted}>Total Weight</Text>
                                <Numeric size={13} style={styles.monoText}>{totalWeight.toFixed(2)} <Text variant="caption" style={{ color: colors.amber }}>kg</Text></Numeric>
                            </View>
                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text variant="subheading" style={{ color: colors.navy }}>Payload Value</Text>
                                <Numeric size={17} style={{ color: colors.amber, fontFamily: 'DMMono-Bold' }}>₹{totalAmount.toFixed(0)}</Numeric>
                            </View>
                        </BaseCard>
                    </View>
                ) : (
                    <View style={styles.verifiedContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: colorExtended.tealLight }]}>
                            <CheckCircle size={64} color={colors.teal} weight="fill" />
                        </View>
                        <Text variant="heading" style={styles.verifiedTitle}>
                            Pickup Verified!
                        </Text>
                        <Text variant="body" color={colors.muted} style={styles.subtitle}>
                            The seller has confirmed the weights and the transaction is complete.
                        </Text>

                        <BaseCard style={[styles.summaryCard, { borderColor: colors.teal, backgroundColor: colorExtended.tealLight + '20' }] as any}>
                            <View style={styles.summaryRow}>
                                <Text variant="label" color={colors.muted}>Final Weight</Text>
                                <Numeric size={13} style={styles.monoText}>{totalWeight.toFixed(2)} kg</Numeric>
                            </View>
                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text variant="subheading" style={{ color: colors.navy }}>Total Payment</Text>
                                <Numeric size={17} style={{ color: colors.amber, fontFamily: 'DMMono-Bold' }}>₹{totalAmount.toFixed(0)}</Numeric>
                            </View>
                        </BaseCard>
                    </View>
                )}
            </View>

            {/* Bottom Action Bar (Verified state only) */}
            {state === 'verified' && (
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <PrimaryButton
                        label="✓ Mark Pickup Complete"
                        onPress={handleFinish}
                        style={{ backgroundColor: colors.teal }}
                    />
                </View>
            )}

            {/* Bottom SafeArea for waiting state (ensure layout consistency) */}
            {state === 'waiting' && <SafeAreaView edges={['bottom']} />}
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
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    waitingContainer: {
        alignItems: 'center',
    },
    verifiedContainer: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.amberLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    pulseInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(183, 121, 31, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    waitingTitle: {
        color: colors.navy,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    verifiedTitle: {
        color: colors.teal,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: spacing.xxl,
        lineHeight: 22,
    },
    summaryCard: {
        width: '100%',
        padding: spacing.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    totalRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginBottom: 0,
    },
    monoText: {
        fontFamily: 'DMMono-Medium',
        color: colors.navy,
    },
    footer: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
