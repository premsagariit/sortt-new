import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Headless component that keeps the notification unread count in sync.
 * Injected at the root of the app.
 */
export function NotificationWatcher() {
  const { isOnline } = useNetworkStatus();
  const session = useAuthStore(s => s.session);
  const isSignedIn = !!session;
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);

  useEffect(() => {
    if (isOnline && isSignedIn) {
      // Fetch initial set. This also updates unreadCount.
      fetchNotifications();

      // Simple polling for now (every 30 seconds)
      // Future: Replace with WebSocket/Push notification listener
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOnline, isSignedIn, fetchNotifications]);

  return null;
}
