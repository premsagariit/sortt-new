import axios from 'axios';

export type PushEvent =
  | 'new_pickup_listing'
  | 'order_accepted'
  | 'order_en_route'
  | 'order_arrived'
  | 'otp_verified'
  | 'new_chat_message'
  | 'order_cancelled';

export interface PushPayload {
  to: string; // Expo push token
  title?: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Sends an Expo push notification payload using the Expo v2 push API.
 * Enforces DPDP Act compliance by validating body length <= 60 chars.
 * All PII must be strictly excluded from the body.
 */
export async function sendPushNotification(payload: PushPayload) {
  const token = process.env.EXPO_ACCESS_TOKEN;
  if (!token) {
    console.warn('[pushHelper] EXPO_ACCESS_TOKEN not set, push bypassed.');
    return;
  }

  if (payload.body.length > 60) {
    console.warn('[pushHelper] Strict DPDP limit exceeded (body > 60). String truncated.');
    payload.body = payload.body.substring(0, 60);
  }

  try {
    const res = await axios.post(
      'https://exp.host/--/api/v2/push/send',
      {
        to: payload.to,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (res.data.errors) {
      console.error('[pushHelper] Expo returned errors:', res.data.errors);
    }
  } catch (error: any) {
    // Fire-and-don't-fail: log error gracefully
    console.warn(`[pushHelper] Error dispatching push to ${payload.to}: ${error.message}`);
  }
}
