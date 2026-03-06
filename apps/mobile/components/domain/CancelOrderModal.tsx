import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing } from '../../constants/tokens';
import { Text } from '../ui/Typography';
import { PrimaryButton, SecondaryButton } from '../ui/Button';
import { useAggregatorStore } from '../../store/aggregatorStore';

interface CancelOrderModalProps {
    orderId: string;
    onClose: () => void;
    onConfirm?: (reason: string) => void;
}

export function CancelOrderModal({ orderId, onClose, onConfirm }: CancelOrderModalProps) {
    const [cancelReason, setCancelReason] = React.useState<string | null>(null);
    const { cancelOrder } = useAggregatorStore();

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
            <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                onPress={onClose}
            />
            <View style={styles.sheetContent}>
                <Text variant="subheading" color={colors.navy} style={{ marginBottom: spacing.md }}>
                    Why are you cancelling?
                </Text>
                <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
                    {['Distance too far', 'Vehicle broke down', 'Other reason'].map((reason) => (
                        <Pressable
                            key={reason}
                            onPress={() => setCancelReason(reason)}
                            style={[
                                styles.reasonBox,
                                cancelReason === reason && styles.reasonBoxSelected,
                            ]}
                        >
                            <Text variant="body" color={colors.navy}>{reason}</Text>
                        </Pressable>
                    ))}
                </View>
                <View style={{ gap: spacing.sm, paddingBottom: spacing.xl }}>
                    <PrimaryButton
                        label="Confirm Cancellation"
                        style={{ backgroundColor: colors.red, opacity: cancelReason ? 1 : 0.5 }}
                        disabled={!cancelReason}
                        onPress={() => {
                            if (orderId && cancelReason) {
                                cancelOrder(orderId, cancelReason);
                                if (onConfirm) onConfirm(cancelReason);
                                onClose();
                            }
                        }}
                    />
                    <SecondaryButton
                        label="Go Back"
                        onPress={onClose}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sheetContent: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderTopLeftRadius: radius.card,
        borderTopRightRadius: radius.card,
    },
    reasonBox: {
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
    },
    reasonBoxSelected: {
        borderColor: colors.navy,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
});
