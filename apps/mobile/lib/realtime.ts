type Handler = (payload: any) => void;

export interface MobileRealtimeProvider {
  subscribe(channel: string, event: string, handler: Handler): () => void;
  publish(channel: string, event: string, payload: any): Promise<void>;
  removeChannel(channel: string): void;
  removeAllChannels(): void;
}

const noopProvider: MobileRealtimeProvider = {
  subscribe: (_channel: string, _event: string, _handler: Handler) => () => {},
  publish: async (_channel: string, _event: string, _payload: any) => {},
  removeChannel: (_channel: string) => {},
  removeAllChannels: () => {},
};

export function getMobileRealtimeProvider(): MobileRealtimeProvider {
  return noopProvider;
}
