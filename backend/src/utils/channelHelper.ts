import crypto from 'crypto';

/**
 * Computes a deterministic fixed-length HMAC prefix for channels.
 * Uses OTP_HMAC_SECRET to securely hash the user's clerk ID.
 * Returns the first 16 hex characters.
 */
export function getChannelHmacPrefix(userId: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) {
    throw new Error('OTP_HMAC_SECRET must be set for Ably channels');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(userId);
  return hmac.digest('hex').substring(0, 16);
}

/**
 * Constructs a secure Ably channel name based on the user's hashed prefix.
 * @param userId clerk user ID of the channel owner
 * @param kind 'order', 'chat', or 'feed'
 * @param resourceId orderId, aggregatorId, etc
 */
export function channelName(userId: string, kind: 'order' | 'chat' | 'feed', resourceId: string): string {
  const prefix = getChannelHmacPrefix(userId);
  return `${prefix}:${kind}:${resourceId}`;
}
