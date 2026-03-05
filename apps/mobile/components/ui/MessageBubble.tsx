import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Numeric } from './Typography';
import { colors, spacing } from '../../constants/tokens';

export interface MessageBubbleProps {
    body: string;
    time: string;
    isOwn: boolean;
    senderName?: string;
    isSystemMessage?: boolean;
}

export function MessageBubble({ body, time, isOwn, senderName, isSystemMessage }: MessageBubbleProps) {
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
                <Numeric size={10} color={isOwn ? 'rgba(255,255,255,0.7)' : colors.muted} style={styles.time}>
                    {time}
                </Numeric>
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
    time: {
        alignSelf: 'flex-end',
        marginTop: 2,
    },
});
