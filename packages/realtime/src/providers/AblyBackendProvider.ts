import Ably from 'ably';
import { IRealtimeProvider, RealtimeMessage } from '../types';

type AblyMessageShape = {
  name?: string;
  data?: object;
  timestamp?: number;
};

type AblyChannel = {
  state?: string;
  subscribe(event: string, cb: (message: AblyMessageShape) => void): void;
  unsubscribe(event: string, cb: (message: AblyMessageShape) => void): void;
  publish(event: string, payload: object): Promise<void>;
  detach(): void | Promise<void>;
};

type AblyClient = {
  channels: {
    get(name: string): AblyChannel;
  };
  auth: {
    createTokenRequest(options: {
      clientId: string;
      capability: Record<string, string[]>;
      ttl?: number;
    }): Promise<Record<string, unknown>>;
  };
  close(): void | Promise<void>;
};

/**
 * Backend implementation of IRealtimeProvider using Ably.
 * Used for server-side publish operations.
 */
export class AblyBackendProvider implements IRealtimeProvider {
  private client: AblyClient;
  private channels: Map<string, AblyChannel> = new Map();
  private disconnecting = false;

  constructor() {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('ABLY_API_KEY environment variable is required');
    }
    const RealtimeCtor = (Ably as unknown as { Realtime: new (options: { key: string }) => AblyClient }).Realtime;
    this.client = new RealtimeCtor({ key: apiKey });
  }

  subscribe(channel: string, event: string, handler: (msg: RealtimeMessage) => void): () => void {
    try {
      const abblyChannel = this.client.channels.get(channel);
      this.channels.set(channel, abblyChannel);

      const channelState = String(abblyChannel.state ?? '').toLowerCase();
      if (channelState === 'failed') {
        throw new Error(`Channel operation failed as channel state is failed: ${channel}`);
      }

      const callback = (message: AblyMessageShape) => {
        handler({
          event: message.name || 'unknown',
          data: message.data || {},
          timestamp: message.timestamp || Date.now(),
        });
      };

      abblyChannel.subscribe(event, callback);

      // Return unsubscribe function
      return () => {
        abblyChannel.unsubscribe(event, callback);
      };
    } catch (error) {
      console.error('AblyBackendProvider.subscribe() failed', { channel, event, error });
      throw error;
    }
  }

  async publish(channel: string, event: string, payload: object): Promise<void> {
    try {
      const abblyChannel = this.client.channels.get(channel);
      this.channels.set(channel, abblyChannel);
      await abblyChannel.publish(event, payload);
    } catch (error) {
      // Silently fail on publish (network issues are common for notifications)
      console.warn('AblyBackendProvider.publish() failed (non-fatal)', { channel, event, error });
    }
  }

  private isBenignDetachError(error: unknown): boolean {
    const text = String((error as any)?.message ?? error ?? '').toLowerCase();
    return (
      text.includes('state = detached') ||
      text.includes('state is failed') ||
      text.includes('state = failed') ||
      text.includes('operation failed') ||
      text.includes('unable to attach') ||
      text.includes('channel detached') ||
      text.includes('already detached')
    );
  }

  private safeDetach(channel: AblyChannel, scope: string): void {
    try {
      const detachResult = channel.detach();
      if (detachResult && typeof (detachResult as Promise<void>).catch === 'function') {
        (detachResult as Promise<void>).catch((error) => {
          if (!this.isBenignDetachError(error)) {
            console.warn(`AblyBackendProvider.${scope} detach failed`, { error });
          }
        });
      }
    } catch (error) {
      if (!this.isBenignDetachError(error)) {
        console.warn(`AblyBackendProvider.${scope} detach threw`, { error });
      }
    }
  }

  removeChannel(channel: string): void {
    try {
      const abblyChannel = this.channels.get(channel);
      if (abblyChannel) {
        this.safeDetach(abblyChannel, 'removeChannel()');
        this.channels.delete(channel);
      }
    } catch (error) {
      console.warn('AblyBackendProvider.removeChannel() failed', { channel, error });
    }
  }

  removeAllChannels(): void {
    for (const [, channel] of this.channels) {
      this.safeDetach(channel, 'removeAllChannels()');
    }
    this.channels.clear();
  }

  async disconnect(): Promise<void> {
    if (this.disconnecting) return;
    this.disconnecting = true;

    try {
      this.removeAllChannels();
      await this.client.close();
    } catch (error) {
      console.warn('AblyBackendProvider.disconnect() failed', { error });
    } finally {
      this.disconnecting = false;
    }
  }

  async createTokenRequest(
    clientId: string,
    capability: Record<string, string[]>,
    ttl?: number
  ): Promise<Record<string, unknown>> {
    return this.client.auth.createTokenRequest({
      clientId,
      capability,
      ttl,
    });
  }
}
