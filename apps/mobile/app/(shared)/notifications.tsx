import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Trash } from 'phosphor-react-native';

import { colors, spacing, radius } from '../../constants/tokens';
import { safeBack } from '../../utils/navigation';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { EmptyState } from '../../components/ui/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = -80;

type NotificationItem = {
    id: string;
    title: string;
    body: string;
    timestamp: string;
    isRead: boolean;
    type: 'order' | 'message' | 'payment' | 'rate' | 'review';
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: 'n1',
        type: 'order',
        isRead: false,
        title: "New order near you!",
        body: "A seller in Banjara Hills just posted. Metal + paper. Tap to view.",
        timestamp: "Just now"
    },
    {
        id: 'n2',
        type: 'order',
        isRead: false,
        title: "Order completed",
        body: "Order #8829 was successful. ₹1,240 added to your balance.",
        timestamp: "2h ago"
    },
    {
        id: 'n3',
        type: 'rate',
        isRead: true,
        title: "Price drop alert",
        body: "Iron rates dropped by ₹2/kg. Check updated rate card.",
        timestamp: "5h ago"
    },
    {
        id: 'n4',
        type: 'message',
        isRead: true,
        title: "Support message",
        body: "Your document verification is complete. Happy trading!",
        timestamp: "Yesterday"
    },
    {
        id: 'n5',
        type: 'payment',
        isRead: true,
        title: "Payment processed",
        body: "Payout of ₹4,500 settled to your linked bank account.",
        timestamp: "2 days ago"
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// Custom SwipeableRow using PanResponder (since guesture-handler is missing)
// ─────────────────────────────────────────────────────────────────────────────
function SwipeableRow({ item, onDelete, onMarkRead, children }: {
    item: NotificationItem,
    onDelete: (id: string) => void,
    onMarkRead: (id: string) => void,
    children: React.ReactNode
}) {
    const scrollX = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only trigger for horizontal swipes
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                const dx = Math.min(0, gestureState.dx); // Only allow swiping left
                scrollX.setValue(dx);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < SWIPE_THRESHOLD) {
                    // Open delete action
                    Animated.spring(scrollX, {
                        toValue: SWIPE_THRESHOLD,
                        useNativeDriver: true,
                    }).start();
                } else {
                    // Close back
                    Animated.spring(scrollX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    return (
        <View style={styles.rowWrapper}>
            <Pressable
                style={styles.deleteAction}
                onPress={() => {
                    onDelete(item.id);
                    scrollX.setValue(0);
                }}
            >
                <Trash size={24} color={colors.surface} weight="bold" />
            </Pressable>

            <Animated.View
                style={[
                    styles.rowContainer,
                    { transform: [{ translateX: scrollX }] }
                ]}
                {...panResponder.panHandlers}
            >
                <Pressable
                    style={styles.row}
                    onPress={() => onMarkRead(item.id)}
                >
                    {children}
                </Pressable>
            </Animated.View>
        </View>
    );
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const deleteNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const markRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, []);

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <SwipeableRow
            item={item}
            onDelete={deleteNotification}
            onMarkRead={markRead}
        >
            <View style={styles.unreadIndicatorContainer}>
                {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.textContainer}>
                <Text
                    variant="body"
                    style={[
                        styles.title,
                        {
                            color: item.isRead ? colors.slate : colors.navy,
                            fontFamily: item.isRead ? 'DMSans-Medium' : 'DMSans-Bold'
                        }
                    ]}
                >
                    {item.title}
                </Text>
                <Text
                    variant="caption"
                    numberOfLines={2}
                    color={item.isRead ? colors.muted : colors.slate}
                    style={styles.body}
                >
                    {item.body}
                </Text>
                <Numeric
                    size={12}
                    color={colors.muted}
                    style={styles.timestamp}
                >
                    {item.timestamp}
                </Numeric>
            </View>
        </SwipeableRow>
    );

    return (
        <View style={styles.container}>
            <NavBar
                title="Notifications"
                variant="light"
                onBack={() => safeBack()}
                rightAction={
                    notifications.length > 0 && notifications.some(n => !n.isRead) ? (
                        <Pressable
                            onPress={markAllRead}
                            style={styles.markReadButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text variant="caption" color={colors.teal} style={styles.markReadText}>
                                Mark all read
                            </Text>
                        </Pressable>
                    ) : undefined
                }
            />

            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.listContent,
                    notifications.length === 0 && styles.emptyList
                ]}
                ListEmptyComponent={
                    <EmptyState
                        icon={<Bell size={64} color={colors.border} weight="thin" />}
                        heading="All caught up!"
                        body="You have no new notifications right now."
                    />
                }
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentOffset={{ x: 0, y: 0 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    listContent: {
        flexGrow: 1,
    },
    emptyList: {
        justifyContent: 'center',
    },
    rowWrapper: {
        backgroundColor: colors.red,
    },
    rowContainer: {
        backgroundColor: colors.surface,
    },
    row: {
        flexDirection: 'row',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
    },
    unreadIndicatorContainer: {
        width: 20,
        alignItems: 'center',
        paddingTop: 6,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.red,
    },
    textContainer: {
        flex: 1,
        paddingLeft: spacing.xs,
    },
    title: {
        fontSize: 15,
        marginBottom: 4,
    },
    body: {
        lineHeight: 18,
        marginBottom: 8,
    },
    timestamp: {
        opacity: 0.8,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: spacing.md,
    },
    deleteAction: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.red,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    markReadButton: {
        paddingHorizontal: spacing.sm,
    },
    markReadText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 13,
    },
});
