import { createRealtimeProvider, type IRealtimeProvider } from '@sortt/realtime';

type ChannelMessage = {
  name?: string;
  data?: object;
  timestamp?: number;
};

type ChannelHandler = (msg: ChannelMessage) => void;

type ChannelCompat = {
  subscribe: (event: string, handler: ChannelHandler) => void;
  unsubscribe: () => void;
  detach: () => Promise<void>;
};

type RealtimeClientCompat = {
  channels: {
    get: (channel: string) => ChannelCompat;
  };
};

let provider: IRealtimeProvider | null = null;

function getProvider(): IRealtimeProvider {
  if (!provider) {
    provider = createRealtimeProvider('mobile');
  }
  return provider;
}

class CompatChannel implements ChannelCompat {
  private providerRef: IRealtimeProvider;
  private channel: string;
  private unsubscribers: Array<() => void> = [];

  constructor(providerRef: IRealtimeProvider, channel: string) {
    this.providerRef = providerRef;
    this.channel = channel;
  }

  subscribe(event: string, handler: ChannelHandler): void {
    const unsubscribe = this.providerRef.subscribe(this.channel, event, (msg) => {
      handler({
        name: msg.event,
        data: msg.data,
        timestamp: msg.timestamp,
      });
    });
    this.unsubscribers.push(unsubscribe);
  }

  unsubscribe(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
  }

  async detach(): Promise<void> {
    this.unsubscribe();
    this.providerRef.removeChannel(this.channel);
  }
}

export function subscribe(
  channel: string,
  event: string,
  handler: (payload: object) => void
): () => void {
  return getProvider().subscribe(channel, event, (msg) => handler(msg.data));
}

export function removeAllChannels(): void {
  getProvider().removeAllChannels();
}

export function getRealtimeClient(): RealtimeClientCompat {
  const providerRef = getProvider();
  return {
    channels: {
      get: (channel: string) => new CompatChannel(providerRef, channel),
    },
  };
}

export function disconnectRealtime(): void {
  if (provider) {
    provider.removeAllChannels();
    void provider.disconnect();
    provider = null;
  }
}
