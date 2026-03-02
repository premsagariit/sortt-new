import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, CurrencyInr, Star, Circle, Trash, Bell } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { safeBack } from '../../utils/navigation';
import { Text } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { EmptyState } from '../../components/ui/EmptyState';

// Mock data
type NotifType = 'order' | 'price' | 'system' | 'review';

interface NotificationMock {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
}

const MOCK_NOTIFICATIONS: NotificationMock[] = [
  {
    id: 'n1',
    type: 'order',
    title: 'Order Accepted',
    body: 'Suresh Metals & More has accepted your pickup request. ETA: 15 mins.',
    time: '2 mins ago',
    isRead: false,
  },
  {
    id: 'n2',
    type: 'price',
    title: 'Rates Updated',
    body: 'Metal rates have increased in your area. Check today’s prices.',
    time: '2 hours ago',
    isRead: false,
  },
  {
    id: 'n3',
    type: 'review',
    title: 'New Review',
    body: 'An aggregator left a positive review for your scrap quality.',
    time: 'Yesterday',
    isRead: true,
  },
  {
    id: 'n4',
    type: 'system',
    title: 'Welcome to Sortt!',
    body: 'Your seller account has been verified. You can now list scrap for pickup.',
    time: '2 days ago',
    isRead: true,
  }
];

function getIconForType(type: NotifType) {
  switch (type) {
    case 'order':
      return <Truck size={24} color={colors.navy} />;
    case 'price':
      return <CurrencyInr size={24} color={colors.teal} />;
    case 'review':
      return <Star size={24} color={colors.amber} weight="fill" />;
    case 'system':
      return <Circle size={24} color={colors.slate} weight="fill" />;
  }
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  function handleClear() {
    setNotifications([]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <NavBar
        title="Notifications"
        variant="light"
        onBack={() => safeBack()}
        rightAction={
          notifications.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Trash size={20} color={colors.red} />
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, notifications.length === 0 && styles.emptyScroll]}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length > 0 ? (
          <>
            <View style={styles.actionRow}>
              <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>
                RECENT
              </Text>
              {notifications.some(n => !n.isRead) && (
                <Pressable onPress={markAllRead} hitSlop={8}>
                  <Text variant="caption" color={colors.teal} style={{ fontWeight: '600' } as any}>
                    Mark all read
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.card}>
              {notifications.map((notif, idx) => {
                const isLast = idx === notifications.length - 1;
                return (
                  <View key={notif.id} style={!isLast && styles.divider}>
                    <Pressable
                      style={[styles.notifRow, !notif.isRead && styles.notifRowUnread]}
                      onPress={() => {
                        setNotifications(prev =>
                          prev.map(n => (n.id === notif.id ? { ...n, isRead: true } : n))
                        );
                      }}
                    >
                      <View style={styles.iconWrap}>
                        {getIconForType(notif.type)}
                      </View>
                      <View style={styles.textContent}>
                        <Text variant="body" color={colors.navy} style={!notif.isRead ? { fontWeight: '600' } as any : undefined}>
                          {notif.title}
                        </Text>
                        <Text variant="caption" color={colors.slate} style={{ marginTop: 2, lineHeight: 18 }}>
                          {notif.body}
                        </Text>
                        <Text variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                          {notif.time}
                        </Text>
                      </View>
                      {!notif.isRead && <View style={styles.unreadDot} />}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <EmptyState
            icon={<Bell size={48} color={colors.muted} weight="thin" />}
            heading="All caught up!"
            body="You have no new notifications right now."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: 'DMSans-Bold',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  notifRow: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  notifRowUnread: {
    backgroundColor: colorExtended.tealLight,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorExtended.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContent: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
    marginLeft: spacing.sm,
    marginTop: 6,
  }
});
