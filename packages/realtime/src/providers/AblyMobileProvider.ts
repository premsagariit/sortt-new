import Ably from 'ably';
import { IRealtimeProvider, RealtimeMessage } from '../types';

type AblyMessageShape = {
  name?: string;
  data?: object;
  timestamp?: number;
};

type AblyChannel = {
  subscribe(event: string, cb: (message: AblyMessageShape) => void): void;
  unsubscribe(event: string, cb: (message: AblyMessageShape) => void): void;
  publish(event: string, payload: object): Promise<void>;
  detach(): void | Promise<void>;
};

type AblyClient = {
  channels: {
    get(name: string): AblyChannel;
  };
  close(): void | Promise<void>;
};

type AblyAuthPayload = Record<string, unknown>;

/**
 * Mobile implementation of IRealtimeProvider using Ably with Token Auth.
 * Used in React Native apps to avoid embedding API key in client code.
 * Token obtained via GET /api/realtime/token (protected by clerkJwtMiddleware).
 */
export class AblyMobileProvider implements IRealtimeProvider {
  private client: AblyClient | null = null;
  private channels: Map<string, AblyChannel> = new Map();
  private authUrl: string;

  constructor(tokenUrl: string = '/api/realtime/token') {
    this.authUrl = tokenUrl;
    // Client initialization deferred to first use (lazy init)
  }

  private ensureClient(): AblyClient {
    if (this.client) {
      return this.client;
    }

    const authCallback = async (
      _tokenParams: unknown,
      callback: (error: unknown, tokenRequestOrToken?: AblyAuthPayload) => void
    ): Promise<void> => {
      try {
        const response = await fetch(this.authUrl);
        if (!response.ok) {
          throw new Error(`Token endpoint returned ${response.status}`);
        }
        const authPayload = (await response.json()) as AblyAuthPayload;
        callback(null, authPayload);
      } catch (error) {
        callback(error);
      }
    };

    const RealtimeCtor = (Ably as unknown as {
      Realtime: new (options: {
        authCallback: (
          tokenParams: unknown,
          callback: (error: unknown, tokenRequestOrToken?: AblyAuthPayload) => void
        ) => Promise<void>;
      }) => AblyClient;
    }).Realtime;

    this.client = new RealtimeCtor({ authCallback });
    return this.client;
  }

  subscribe(channel: string, event: string, handler: (msg: RealtimeMessage) => void): () => void {
    try {
      const client = this.ensureClient();

      const abblyChannel = client.channels.get(channel);
      this.channels.set(channel, abblyChannel);

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
      console.error('AblyMobileProvider.subscribe() failed', { channel, event, error });
      throw error;
    }
  }

  async publish(channel: string, event: string, payload: object): Promise<void> {
    try {
      const client = this.ensureClient();
      const abblyChannel = client.channels.get(channel);
      this.channels.set(channel, abblyChannel);
      await abblyChannel.publish(event, payload);
    } catch (error) {
      // Silent fail on publish (network issues are common)
      console.warn('AblyMobileProvider.publish() failed (non-fatal)', { channel, event, error });
    }
  }

  removeChannel(channel: string): void {
    try {
      const abblyChannel = this.channels.get(channel);
      if (abblyChannel) {
        abblyChannel.detach();
        this.channels.delete(channel);
      }
    } catch (error) {
      console.warn('AblyMobileProvider.removeChannel() failed', { channel, error });
    }
  }

  removeAllChannels(): void {
    try {
      for (const [, channel] of this.channels) {
        channel.detach();
      }
      this.channels.clear();
    } catch (error) {
      console.warn('AblyMobileProvider.removeAllChannels() failed', { error });
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.removeAllChannels();
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
    } catch (error) {
      console.warn('AblyMobileProvider.disconnect() failed', { error });
    }
  }
}
