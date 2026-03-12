import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface PushTokenResponse {
  expoToken: string;
  rawToken: string | null;   // null in Expo Go — native token not available
}

export async function registerForPushNotificationsAsync(): Promise<PushTokenResponse | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // ── Expo Push Token (works in Expo Go + EAS builds) ──────────────
  let expoToken = '';
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('Project ID not found — add eas.projectId to app.json extra block');
    }

    expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.error('Failed to get Expo push token:', e);
    return null;   // Expo token is mandatory — bail if this fails
  }

  // ── Native Token (FCM/APNs — EAS builds only, not Expo Go) ──────
  // Wrapped in its own try/catch so Expo Go doesn't kill the whole flow.
  let rawToken: string | null = null;
  try {
    rawToken = (await Notifications.getDevicePushTokenAsync()).data;
  } catch {
    // Expected in Expo Go — native token not available. Silently continue.
    console.log('Native push token unavailable (expected in Expo Go)');
  }

  return { expoToken, rawToken };
}