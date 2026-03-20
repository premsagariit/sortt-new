/**
 * Ably Realtime Client Setup
 * 
 * Uses Token Auth: mobile gets a short-lived token from backend
 * (/api/realtime/token, protected by Clerk JWT).
 * 
 * CRITICAL SECURITY (V32):
 * - Never expose backend Ably secret key in mobile app
 * - All auth goes through backend Token Auth endpoint
 * - Channel names are pre-computed by backend and passed in order DTOs
 */

import Ably from 'ably';
import { api } from './api';

let client: Ably.Realtime | null = null;

/**
 * Get singleton Ably Realtime client.
 * Authenticates via Token Auth callback — backend issues token on each call.
 */
export function getRealtimeClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          // Fetch token from backend (protected by Clerk JWT via api client)
          const res = await api.get('/api/realtime/token');
          callback(null, res.data);
        } catch (err) {
          callback(err as never, null);
        }
      },
    });
  }
  return client;
}

/**
 * Disconnect Ably client and reset singleton.
 * Called on AppState -> 'background' event.
 * Also unsubscribes from all channels.
 */
export function disconnectRealtime(): void {
  if (client) {
    const c = client;
    client = null; // Clear singleton FIRST so hooks don't race with a closing client
    try {
      c.close();
    } catch {
      // Swallow — connection may already be closed or in an invalid state
    }
  }
}
