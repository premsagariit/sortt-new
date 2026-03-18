import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, Animated, PanResponder, Dimensions, RefreshControl } from 'react-native';
import { Bell, Trash } from 'phosphor-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';

import { colors, spacing } from '../../constants/tokens';
import { safeBack } from '../../utils/navigation';
import { Text, Numeric } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNotificationStore, NotificationItem } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = -80;

// ─────────────────────────────────────────────────────────────────────────────
// Custom SwipeableRow using PanResponder
// ─────────────────────────────────────────────────────────────────────────────
function SwipeableRow({ item, onDelete, onPress, children }: {
    item: NotificationItem,
    onDelete: (id: string) => void,
    onPress: (item: NotificationItem) => void,
    children: React.ReactNode
}) {
    const scrollX = useRef(new Animated.Value(0)).current;

    const currentOffset = useRef(0);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderGrant: () => {
                scrollX.setOffset(currentOffset.current);
                scrollX.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                let newDx = gestureState.dx;
                if (currentOffset.current + newDx > 0) {
                    newDx = -currentOffset.current;
                }
                scrollX.setValue(newDx);
            },
            onPanResponderRelease: (_, gestureState) => {
                scrollX.flattenOffset();
                const totalDx = currentOffset.current + gestureState.dx;
                
                if (totalDx < SWIPE_THRESHOLD) {
                    Animated.spring(scrollX, {
                        toValue: SWIPE_THRESHOLD,
                        useNativeDriver: true,
                    }).start();
                    currentOffset.current = SWIPE_THRESHOLD;
                } else {
                    Animated.spring(scrollX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                    currentOffset.current = 0;
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
                    onPress={() => onPress(item)}
                >
                    {children}
                </Pressable>
            </Animated.View>
        </View>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const userType = useAuthStore(s => s.userType);
    const { 
        notifications, 
        loading, 
        fetchNotifications, 
        markAsRead, 
        markAllRead, 
        deleteNotification 
    } = useNotificationStore();

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleNotificationPress = useCallback(async (item: NotificationItem) => {
        await markAsRead(item.id);

        const orderId = typeof item.data?.order_id === 'string' && item.data.order_id.trim().length > 0
            ? item.data.order_id
            : null;

        if (item.type !== 'order' || !orderId) return;

        if (userType === 'aggregator') {
            router.push({
                pathname: '/(aggregator)/order/[id]',
                params: { id: orderId }
            } as any);
            return;
        }

        router.push(`/(seller)/order/${orderId}` as any);
    }, [markAsRead, router, userType]);

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <SwipeableRow
            item={item}
            onDelete={deleteNotification}
            onPress={handleNotificationPress}
        >
            <View style={styles.unreadIndicatorContainer}>
                {!item.is_read && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.textContainer}>
                <Text
                    variant="body"
                    style={[
                        styles.title,
                        {
                            color: item.is_read ? colors.slate : colors.navy,
                            fontFamily: item.is_read ? 'DMSans-Medium' : 'DMSans-Bold'
                        }
                    ]}
                >
                    {item.title}
                </Text>
                <Text
                    variant="caption"
                    numberOfLines={2}
                    color={item.is_read ? colors.muted : colors.slate}
                    style={styles.body}
                >
                    {item.body}
                </Text>
                <Numeric
                    size={12}
                    color={colors.muted}
                    style={styles.timestamp}
                >
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
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
                    notifications.length > 0 && notifications.some(n => !n.is_read) ? (
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
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchNotifications} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <EmptyState
                            icon={<Bell size={48} color={colors.border} weight="thin" />}
                            heading="All caught up!"
                            body="You have no new notifications right now."
                        />
                    ) : null
                }
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
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

