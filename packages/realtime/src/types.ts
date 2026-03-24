/**
 * IRealtimeProvider — Abstraction for realtime messaging (pubsub).
 * Two implementations: AblyBackendProvider (for backend publish), AblyMobileProvider (for mobile Token Auth).
 */

export interface RealtimeMessage {
  event: string;
  data: object;
  timestamp: number;
}

export interface IRealtimeProvider {
  /**
   * Subscribe to a channel + event.
   * Returns unsubscribe function.
   */
  subscribe(channel: string, event: string, handler: (msg: RealtimeMessage) => void): () => void;

  /**
   * Publish a message to a channel + event.
   */
  publish(channel: string, event: string, payload: object): Promise<void>;

  /**
   * Remove a specific channel.
   */
  removeChannel(channel: string): void;

  /**
   * Remove all channels (used in AppState background).
   */
  removeAllChannels(): void;

  /**
   * Disconnect from realtime service.
   */
  disconnect(): Promise<void>;
}
