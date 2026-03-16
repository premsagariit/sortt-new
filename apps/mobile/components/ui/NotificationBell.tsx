import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Bell } from 'phosphor-react-native';
import { colors } from '../../constants/tokens';
import { useNotificationStore } from '../../store/notificationStore';
import { IconButton } from './Button';
import { useRouter } from 'expo-router';

interface NotificationBellProps {
  color?: string;
}

/**
 * Standard notification bell icon with a red unread badge.
 * Navigates to the notifications screen on press.
 */
export function NotificationBell({ color = colors.surface }: NotificationBellProps) {
  const router = useRouter();
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <IconButton
      icon={
        <View>
          <Bell size={22} color={color} weight="regular" />
          {unreadCount > 0 && (
            <View style={styles.badge} />
          )}
        </View>
      }
      onPress={() => router.push('/(shared)/notifications' as any)}
      accessibilityLabel="Notifications"
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: colors.red,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(28, 46, 74, 1)', // colors.navy
  },
});
