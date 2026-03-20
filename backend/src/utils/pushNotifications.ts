import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { query } from '../lib/db';
import * as Sentry from '@sentry/node';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

/**
 * Send push notifications to multiple users.
 * 
 * ⚠️ PII AUDIT RULE (D2):
 * The `title` and `body` strings MUST NOT contain:
 *   - User names
 *   - Phone numbers (including partial)
 *   - Addresses or locations
 *   - Rupee amounts or prices
 *   - GSTIN or business identifiers
 *   - Material types or scrap categories
 * 
 * Use generic copy only:
 *   ✅ "Your pickup has been accepted"
 *   ✅ "You have a new message"
 *   ❌ "Suresh Metals accepted your pickup"
 *   ❌ "₹5000 received"
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (userIds.length === 0) {
    console.log('[pushNotifications] No users provided, skipping push');
    return;
  }

  try {
    // Query device tokens for all users (expo tokens only)
    const deviceResult = await query(
      `
      SELECT user_id, expo_token
      FROM device_tokens
      WHERE user_id = ANY($1)
        AND expo_token IS NOT NULL
      `,
      [userIds]
    );

    const tokens = deviceResult.rows
      .map(row => row.expo_token)
      .filter(token => Expo.isExpoPushToken(token));

    if (tokens.length === 0) {
      console.log('[pushNotifications] No valid expo tokens found for users:', userIds);
      return;
    }

    // Build messages
    const messages: ExpoPushMessage[] = tokens.map(to => ({
      to,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    // Chunk messages (max 100 per batch per Expo API)
    const chunks = expo.chunkPushNotifications(messages);

    // Send all chunks
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (chunkErr) {
        console.error('[pushNotifications] Chunk send error:', chunkErr);
        Sentry.captureException(chunkErr, {
          tags: { operation: 'push_notification_chunk' }
        });
        // Continue to next chunk — partial failure is acceptable
      }
    }
  } catch (err) {
    console.error('[pushNotifications] Failed to send push:', err);
    Sentry.captureException(err, { tags: { operation: 'push_notifications' } });
    // Never throw — push is best-effort, must not crash HTTP response
  }
}
