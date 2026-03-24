import { IRealtimeProvider, RealtimeMessage } from '../types';

/**
 * Soketi stub implementation.
 * Placeholder for self-hosted realtime stack swap.
 * All methods throw NotImplementedError in Day 14.
 * Full implementation deferred to future date.
 */
export class SoketiProvider implements IRealtimeProvider {
  subscribe(_channel: string, _event: string, _handler: (msg: RealtimeMessage) => void): () => void {
    throw new NotImplementedError('SoketiProvider.subscribe() not yet implemented');
  }

  async publish(_channel: string, _event: string, _payload: object): Promise<void> {
    throw new NotImplementedError('SoketiProvider.publish() not yet implemented');
  }

  removeChannel(_channel: string): void {
    throw new NotImplementedError('SoketiProvider.removeChannel() not yet implemented');
  }

  removeAllChannels(): void {
    throw new NotImplementedError('SoketiProvider.removeAllChannels() not yet implemented');
  }

  async disconnect(): Promise<void> {
    throw new NotImplementedError('SoketiProvider.disconnect() not yet implemented');
  }
}

/**
 * Custom error for unimplemented methods.
 */
class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
