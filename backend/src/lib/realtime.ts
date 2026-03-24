/**
 * Realtime Provider Wrapper
 *
 * Thin abstraction around @sortt/realtime provider to:
 * 1. Decouple route handlers from vendor SDK
 * 2. Centralize error handling and logging
 */

import * as Sentry from '@sentry/node';
import { AblyBackendProvider, createRealtimeTokenRequest } from '@sortt/realtime';
import { getChannelHmacPrefix } from '../utils/channelHelper';

const realtimeProvider = new AblyBackendProvider();

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
    await realtimeProvider.publish(channel, event, payload);
  } catch (err) {
    console.error(`[Realtime] publish failed on channel ${channel}:`, err);
    Sentry.captureException(err, {
      tags: { operation: 'realtime_publish', channel, event }
    });
    // Non-fatal — route handlers must not crash on Ably errors
  }
}

/**
 * Create a token request for Ably Token Auth.
 * Used by mobile clients with Clerk JWT to authenticate to Ably.
 * 
 * @param clientId Clerk user ID (will be the Ably client ID)
 * @returns Token request signed by configured realtime provider
 */
export async function createTokenRequest(
  clientId: string,
  capabilityOverride?: Record<string, string[]>
): Promise<Record<string, unknown>> {
  const hmacPrefix = getChannelHmacPrefix(clientId);

  const capability = capabilityOverride || {
      // Public feed channel accessible to all aggregators
      'orders:hyd:new': ['subscribe'],
      // Private channels specific to this user (pattern match)
      [`${hmacPrefix}:*`]: ['subscribe', 'publish'],
    };

  return createRealtimeTokenRequest(clientId, capability,
    // 1-hour TTL — matches JWT refresh cadence on mobile
    3600 * 1000
  );
}
