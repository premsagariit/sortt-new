import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { registerForPushNotificationsAsync } from '../../lib/push';
import { api } from '../../lib/api';

/**
 * Headless component: registers the device's Expo push token with the backend
 * once per app session, immediately after the user is authenticated.
 *
 * Injected at the root layout so it runs for both seller and aggregator users.
 * Without this, device_tokens is never populated and push notifications are
 * never delivered.
 */
export function PushTokenRegistrar() {
  const { isSignedIn } = useAuth();
  const hasRegistered = useRef(false);

  useEffect(() => {
    if (!isSignedIn || hasRegistered.current) return;
    hasRegistered.current = true;

    registerForPushNotificationsAsync()
      .then((result) => {
        if (!result?.expoToken) return;
        api
          .post('/api/users/device-token', {
            deviceToken: result.expoToken,
            provider: 'expo',
          })
          .catch((err: any) => {
            console.warn('[Push] Token registration failed:', err?.message);
          });
      })
      .catch((err: any) => {
        console.warn('[Push] registerForPushNotificationsAsync failed:', err?.message);
      });
  }, [isSignedIn]);

  return null;
}
