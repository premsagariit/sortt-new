import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Headless component that:
 * 1. Sets up the notification handler policy for foreground notifications
 * 2. Listens for incoming notifications (user sees alert even when app is open)
 * 3. Listens for user tapping notifications (responds to notification tap)
 * 4. Keeps the notification unread count in sync via polling
 *
 * Injected at the root of the app.
 */
export function NotificationWatcher() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const session = useAuthStore(s => s.session);
  const isSignedIn = !!session;
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);

  // ── Configure notification handler policy (show alerts + sounds in foreground)
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  // ── Listen for notifications while app is in foreground
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[NotificationWatcher] Notification received (foreground):', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });

        // Refresh notifications after a short delay to ensure UI is in sync
        setTimeout(() => {
          fetchNotifications();
        }, 500);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [fetchNotifications]);

  // ── Listen for user tapping notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        console.log('[NotificationWatcher] Notification tapped:', {
          title: response.notification.request.content.title,
          data,
        });

        // Navigate based on notification data
        if (data?.screen) {
          try {
            if (data.screen === 'order' && data.orderId) {
              router.push(`/(shared)/order-detail/${data.orderId}` as any);
            } else if (data.screen === 'orders') {
              router.push('/(seller)/orders' as any);
            } else if (data.screen === 'chat' && data.orderId) {
              router.push(`/(shared)/chat/${data.orderId}` as any);
            }
            console.log(`[NotificationWatcher] Navigated to: ${data.screen}`);
          } catch (err) {
            console.warn('[NotificationWatcher] Navigation failed:', err);
          }
        }

        // Refresh notifications
        fetchNotifications();
      }
    );

    return () => {
      subscription.remove();
    };
  }, [router, fetchNotifications]);

  // ── Poll for notifications every 30 seconds when signed in and online
  useEffect(() => {
    if (isOnline && isSignedIn) {
      // Fetch initial set
      fetchNotifications();

      // Poll every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOnline, isSignedIn, fetchNotifications]);

  return null;
}
