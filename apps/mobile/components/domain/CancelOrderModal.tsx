import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing } from '../../constants/tokens';
import { Text } from '../ui/Typography';
import { PrimaryButton, SecondaryButton } from '../ui/Button';
import { useOrderStore } from '../../store/orderStore';

interface CancelOrderModalProps {
    orderId: string;
    onClose: () => void;
    onConfirm?: (reason: string) => void;
}

export function CancelOrderModal({ orderId, onClose, onConfirm }: CancelOrderModalProps) {
    const [cancelReason, setCancelReason] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [cancelError, setCancelError] = React.useState<string | null>(null);

    const cancelOrder = useOrderStore((s: any) => s.cancelOrder);
    const fetchOrder = useOrderStore((s: any) => s.fetchOrder);

    const handleConfirm = async () => {
        if (!cancelReason || loading) return;

        setLoading(true);
        setCancelError(null);
        try {
            // cancelOrder calls DELETE /api/orders/:id with the reason as note
            await cancelOrder(orderId, cancelReason);
            // Silent re-fetch so the order timeline updates with the 'cancelled' history entry
            try { await fetchOrder(orderId, true); } catch { /* non-fatal */ }
            if (onConfirm) onConfirm(cancelReason);
            onClose();
        } catch (err: any) {
            const msg: string = err?.response?.data?.error ?? err?.message ?? '';
            const friendly =
                msg === 'cannot cancel order in this status'
                    ? 'This order cannot be cancelled at its current stage.'
                    : msg === 'forbidden'
                    ? 'You are not allowed to cancel this order.'
                    : 'Something went wrong. Please try again.';
            setCancelError(friendly);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
            <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                onPress={loading ? undefined : onClose}
            />
            <View style={styles.sheetContent}>
                <Text variant="subheading" color={colors.navy} style={{ marginBottom: spacing.md }}>
                    Why are you cancelling?
                </Text>

                {cancelError ? (
                    <Text variant="caption" color={colors.red} style={{ marginBottom: spacing.sm }}>
                        {cancelError}
                    </Text>
                ) : null}

                <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
                    {['Distance too far', 'Vehicle broke down', 'Changed my mind', 'Other reason'].map((reason) => (
                        <Pressable
                            key={reason}
                            onPress={() => { setCancelReason(reason); setCancelError(null); }}
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
                        label={loading ? 'Cancelling...' : 'Confirm Cancellation'}
                        style={{ backgroundColor: colors.red, opacity: (cancelReason && !loading) ? 1 : 0.5 }}
                        disabled={!cancelReason || loading}
                        onPress={handleConfirm}
                    />
                    <SecondaryButton
                        label="Go Back"
                        onPress={onClose}
                        disabled={loading}
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
