import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check, Checks, Clock } from 'phosphor-react-native';
import { Text, Numeric } from './Typography';
import { colors, spacing } from '../../constants/tokens';

export interface MessageBubbleProps {
    body: string;
    time: string;
    isOwn: boolean;
    senderName?: string;
    isSystemMessage?: boolean;
    status?: 'sending' | 'sent' | 'read';
}

function DeliveryTick({ status }: { status: 'sending' | 'sent' | 'read' }) {
    if (status === 'sending') {
        return <Clock size={12} color="rgba(255,255,255,0.5)" weight="regular" />;
    }
    if (status === 'read') {
        return <Checks size={13} color={colors.teal} weight="bold" />;
    }
    // 'sent'
    return <Check size={13} color="rgba(255,255,255,0.6)" weight="bold" />;
}

export function MessageBubble({ body, time, isOwn, senderName, isSystemMessage, status }: MessageBubbleProps) {
    if (isSystemMessage) {
        return (
            <View style={styles.systemContainer}>
                <View style={styles.systemPill}>
                    <Text variant="caption" color={colors.slate} style={{ textAlign: 'center' }}>
                        {body}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.bubbleContainer, isOwn ? styles.bubbleContainerMe : styles.bubbleContainerThem]}>
            {!isOwn && senderName && (
                <Text variant="caption" color={colors.muted} style={styles.senderName}>
                    {senderName}
                </Text>
            )}
            <View style={[styles.bubble, isOwn ? styles.bubbleMe : styles.bubbleThem]}>
                <Text variant="body" color={isOwn ? colors.surface : colors.navy}>
                    {body}
                </Text>
                <View style={styles.metaRow}>
                    <Numeric size={10} color={isOwn ? 'rgba(255,255,255,0.7)' : colors.muted}>
                        {time}
                    </Numeric>
                    {isOwn && status && (
                        <View style={styles.tickContainer}>
                            <DeliveryTick status={status} />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    systemContainer: {
        alignItems: 'center',
        marginVertical: spacing.sm,
    },
    systemPill: {
        backgroundColor: colors.surface2,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bubbleContainer: {
        maxWidth: '80%',
        gap: 2,
    },
    bubbleContainerMe: {
        alignItems: 'flex-end',
    },
    bubbleContainerThem: {
        alignItems: 'flex-start',
    },
    senderName: {
        fontSize: 10,
        marginLeft: 4,
        marginBottom: 2,
    },
    bubble: {
        padding: spacing.md,
        borderRadius: 18,
        gap: 4,
    },
    bubbleMe: {
        backgroundColor: colors.navy,
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 3,
        marginTop: 2,
    },
    tickContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
