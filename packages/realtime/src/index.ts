// @sortt/realtime — provider abstraction for Ably realtime
// TRD §6.2: Realtime Provider Interface

import * as Ably from 'ably';

/**
 * IRealtimeProvider - Abstraction for realtime pub/sub functionality
 * Used by both mobile (token-based) and backend (API key) clients
 */
export interface IRealtimeProvider {
  /**
   * Subscribe to a channel event
   * @param channel - Full channel name (with HMAC prefix for private channels)
   * @param event - Event name (e.g. 'message', 'status_updated', 'new_order')
   * @param handler - Callback function receiving the message payload
   * @returns Unsubscribe function; call to remove listener
   */
  subscribe(
    channel: string,
    event: string,
    handler: (payload: any) => void
  ): () => void;

  /**
   * Publish to a channel
   * @param channel - Full channel name
   * @param event - Event name
   * @param payload - Message data to publish
   */
  publish(channel: string, event: string, payload: any): Promise<void>;

  /**
   * Remove a single channel subscription
   * @param channel - Full channel name to disconnect
   */
  removeChannel(channel: string): void;

  /**
   * Remove all channel subscriptions (used on app background)
   */
  removeAllChannels(): void;
}

/**
 * AblyRealtimeProvider - Concrete Ably implementation
 * Handles both mobile (token-based auth) and backend (API key) initialization
 */
export class AblyRealtimeProvider implements IRealtimeProvider {
  private client: Ably.Realtime | null = null;
  private subscriptions = new Map<string, Ably.RealtimeChannel>();
  private listeners = new Map<string, Function[]>();

  /**
   * Initialize mobile client with token-based auth
   * @param tokenUrl - Backend endpoint returning Ably token request
   */
  async initMobile(tokenUrl: string): Promise<void> {
    this.client = new Ably.Realtime({
      authUrl: tokenUrl,
      autoConnect: true,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ably mobile connection timeout'));
      }, 5000);

      this.client?.connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client?.connection.once('failed', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Initialize backend client with API key
   */
  initBackend(): void {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('ABLY_API_KEY environment variable not set');
    }

    this.client = new Ably.Realtime({
      key: apiKey,
      autoConnect: true,
    });
  }

  /**
   * Subscribe to channel event
   */
  subscribe(
    channel: string,
    event: string,
    handler: (payload: any) => void
  ): () => void {
    if (!this.client) {
      throw new Error('Ably client not initialized');
    }

    let realtimeChannel = this.subscriptions.get(channel);
    if (!realtimeChannel) {
      realtimeChannel = this.client.channels.get(channel);
      this.subscriptions.set(channel, realtimeChannel);
    }

    // Subscribe using exact event name (no alternatives like 'new_message')
    realtimeChannel.subscribe(event, (message: Ably.Message) => {
      handler(message.data);
    });

    // Store listener reference for cleanup
    const listeners = this.listeners.get(channel) || [];
    listeners.push(handler);
    this.listeners.set(channel, listeners);

    // Return unsubscribe function
    return () => {
      realtimeChannel?.unsubscribe(event, handler as any);
    };
  }

  /**
   * Publish to channel
   */
  async publish(channel: string, event: string, payload: any): Promise<void> {
    if (!this.client) {
      throw new Error('Ably client not initialized');
    }

    const realtimeChannel = this.client.channels.get(channel);
    await realtimeChannel.publish(event, payload);
  }

  /**
   * Remove single channel subscription
   */
  removeChannel(channel: string): void {
    const realtimeChannel = this.subscriptions.get(channel);
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      this.subscriptions.delete(channel);
      this.listeners.delete(channel);
    }
  }

  /**
   * Remove all channel subscriptions (on app background)
   */
  removeAllChannels(): void {
    for (const [channel] of this.subscriptions) {
      this.removeChannel(channel);
    }
  }

  /**
   * Close Ably client connection (cleanup on logout)
   */
  disconnect(): void {
    this.removeAllChannels();
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

/**
 * Global mobile realtime provider instance (initialized in mobile app root)
 */
export let mobileRealtimeProvider: AblyRealtimeProvider | null = null;

/**
 * Initialize global mobile realtime provider
 */
export function initMobileRealtime(tokenUrl: string): Promise<void> {
  if (!mobileRealtimeProvider) {
    mobileRealtimeProvider = new AblyRealtimeProvider();
  }
  return mobileRealtimeProvider.initMobile(tokenUrl);
}

/**
 * Get global mobile realtime provider
 */
export function getMobileRealtimeProvider(): AblyRealtimeProvider {
  if (!mobileRealtimeProvider) {
    throw new Error('Mobile realtime provider not initialized');
  }
  return mobileRealtimeProvider;
}

export default AblyRealtimeProvider;
