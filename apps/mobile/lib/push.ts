import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications'; // Deferred to inside function to suppress Expo Go SDK 53+ warnings
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface PushTokenResponse {
  expoToken: string;
  rawToken: string | null; // null in Expo Go — native token not available until EAS build
}

export async function registerForPushNotificationsAsync(): Promise<PushTokenResponse | null> {
  // expo-notifications remote push support was removed from Expo Go in SDK 53.
  // Expo push tokens still work in Expo Go for local notifications,
  // but getDevicePushTokenAsync (FCM/APNs) requires an EAS dev/prod build.
  // We return what we can and skip what we can't — never throw.
  const Notifications = require('expo-notifications');

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch {
      // Non-fatal — channel setup failure does not block token registration
    }
  }

  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  // ── Permission request ────────────────────────────────────────────
  let finalStatus: string;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  } catch {
    console.log('[Push] Permission request failed — skipping push token registration');
    return null;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Notification permission denied by user');
    return null;
  }

  // ── Expo Push Token — works in Expo Go + EAS builds ──────────────
  let expoToken = '';
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('[Push] No EAS projectId in app.json — getExpoPushTokenAsync may fail');
    }

    expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('[Push] Expo push token registered');
  } catch (e) {
    // In Expo Go SDK 53 this may also fail — treat as non-fatal
    console.warn('[Push] Failed to get Expo push token (Expo Go SDK 53+ limitation):', e);
    return null;
  }

  // ── Native Token (FCM/APNs) — EAS builds only ────────────────────
  // getDevicePushTokenAsync throws in Expo Go SDK 53+.
  // Separate try/catch — failure here must not affect expoToken registration.
  let rawToken: string | null = null;
  try {
    rawToken = (await Notifications.getDevicePushTokenAsync()).data;
    console.log('[Push] Native device push token registered');
  } catch {
    // Expected in Expo Go — silently skip. Works in EAS dev/prod build.
    console.log('[Push] Native push token unavailable (expected in Expo Go SDK 53+)');
  }

  return { expoToken, rawToken };
}