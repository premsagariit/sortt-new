/**
 * Ably Realtime Provider Wrapper
 * 
 * Thin abstraction around Ably SDK to:
 * 1. Decouple route handlers from vendor SDK
 * 2. Centralize error handling and logging
 * 3. Make Day 14 provider abstraction straightforward
 */

import Ably from 'ably';
import * as Sentry from '@sentry/node';
import { getChannelHmacPrefix } from '../utils/channelHelper';

const ablyRest = new Ably.Rest({ key: process.env.ABLY_API_KEY! });

/**
 * Publish an event to an Ably channel.
 * Wraps all errors — never throws.
 * 
 * @param channel Full channel name (may include HMAC prefix)
 * @param event Event name (e.g., 'status_updated', 'message', 'new_order')
 * @param payload Event payload object
 */
export async function publishEvent(
  channel: string,
  event: string,
  payload: object
): Promise<void> {
  try {
    await ablyRest.channels.get(channel).publish(event, payload);
  } catch (err) {
    console.error(`[Ably] publish failed on channel ${channel}:`, err);
    Sentry.captureException(err, {
      tags: { operation: 'ably_publish', channel, event }
    });
    // Non-fatal — route handlers must not crash on Ably errors
  }
}

/**
 * Create a token request for Ably Token Auth.
 * Used by mobile clients with Clerk JWT to authenticate to Ably.
 * 
 * @param clientId Clerk user ID (will be the Ably client ID)
 * @returns Token request signed by Ably
 */
export async function createTokenRequest(clientId: string): Promise<Ably.TokenRequest> {
  const hmacPrefix = getChannelHmacPrefix(clientId);
  
  return ablyRest.auth.createTokenRequest({
    clientId,
    capability: {
      // Public feed channel accessible to all aggregators
      'orders:hyd:new': ['subscribe'],
      // Private channels specific to this user (pattern match)
      [`${hmacPrefix}:*`]: ['subscribe', 'publish'],
    },
    // 1-hour TTL — matches JWT refresh cadence on mobile
    ttl: 3600 * 1000,
  });
}
