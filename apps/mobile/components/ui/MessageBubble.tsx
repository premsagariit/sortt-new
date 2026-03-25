import React from 'react';
import { View, StyleSheet, Image, Pressable, Modal } from 'react-native';
import { Check, Checks, Clock, X } from 'phosphor-react-native';
import { Text, Numeric } from './Typography';
import { colors, spacing } from '../../constants/tokens';

export interface MessageBubbleProps {
    body: string;
    time: string;
    isOwn: boolean;
    senderName?: string;
    isSystemMessage?: boolean;
    messageType?: 'text' | 'image';
    mediaUrl?: string | null;
    status?: 'sending' | 'sent' | 'read';
}

function DeliveryTick({ status }: { status: 'sending' | 'sent' | 'read' }) {
    if (status === 'sending') {
        return <Clock size={12} color={colors.whiteAlpha70} weight="regular" />;
    }
    if (status === 'read') {
        return <Checks size={13} color={colors.teal} weight="bold" />;
    }
    // 'sent'
    return <Check size={13} color={colors.whiteAlpha70} weight="bold" />;
}

export function MessageBubble({ body, time, isOwn, senderName, isSystemMessage, messageType = 'text', mediaUrl, status }: MessageBubbleProps) {
    const [fullScreenOpen, setFullScreenOpen] = React.useState(false);

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
                {messageType === 'image' && mediaUrl ? (
                    <Pressable onPress={() => setFullScreenOpen(true)}>
                        <Image source={{ uri: mediaUrl }} style={styles.chatImage} resizeMode="cover" />
                    </Pressable>
                ) : (
                    <Text variant="body" color={isOwn ? colors.surface : colors.navy}>
                        {body}
                    </Text>
                )}
                <View style={styles.metaRow}>
                    <Numeric size={10} color={isOwn ? colors.whiteAlpha70 : colors.muted}>
                        {time}
                    </Numeric>
                    {isOwn && status && (
                        <View style={styles.tickContainer}>
                            <DeliveryTick status={status} />
                        </View>
                    )}
                </View>
            </View>
            {messageType === 'image' && mediaUrl && (
                <Modal
                    visible={fullScreenOpen}
                    animationType="fade"
                    transparent={false}
                    onRequestClose={() => setFullScreenOpen(false)}
                >
                    <View style={styles.fullscreenContainer}>
                        <Pressable onPress={() => setFullScreenOpen(false)} style={styles.closeButton}>
                            <X size={24} color={colors.surface} weight="bold" />
                        </Pressable>
                        <Image source={{ uri: mediaUrl }} style={styles.fullscreenImage} resizeMode="contain" />
                    </View>
                </Modal>
            )}
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
        maxWidth: '82%',
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
        marginLeft: 2,
        marginBottom: 2,
    },
    bubble: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 16,
        gap: 4,
    },
    bubbleMe: {
        backgroundColor: colors.navy,
        borderBottomRightRadius: 6,
    },
    bubbleThem: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 6,
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
    chatImage: {
        width: 170,
        height: 170,
        borderRadius: 12,
        backgroundColor: colors.skeleton,
    },
    fullscreenContainer: {
        flex: 1,
        backgroundColor: colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    closeButton: {
        position: 'absolute',
        top: spacing.xl,
        right: spacing.md,
        zIndex: 10,
        padding: spacing.xs,
    },
    fullscreenImage: {
        width: '100%',
        height: '90%',
    },
    tickContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
