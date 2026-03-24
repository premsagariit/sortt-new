import type { IRealtimeProvider } from './types';

export { IRealtimeProvider, RealtimeMessage } from './types';

/**
 * Factory function to create realtime provider based on environment variable.
 * Platform-agnostic — caller should use AblyBackendProvider (backend) or AblyMobileProvider (mobile).
 */
export function createRealtimeProvider(platform: 'backend' | 'mobile'): IRealtimeProvider {
  const provider = process.env.REALTIME_PROVIDER || 'ably';

  if (provider === 'ably') {
    if (platform === 'mobile') {
      const { AblyMobileProvider } = require('./providers/AblyMobileProvider') as {
        AblyMobileProvider: new () => IRealtimeProvider;
      };
      return new AblyMobileProvider();
    } else {
      const { AblyBackendProvider } = require('./providers/AblyBackendProvider') as {
        AblyBackendProvider: new () => IRealtimeProvider;
      };
      return new AblyBackendProvider();
    }
  }

  if (provider === 'soketi') {
    const { SoketiProvider } = require('./providers/SoketiProvider') as {
      SoketiProvider: new () => IRealtimeProvider;
    };
    return new SoketiProvider();
  }

  throw new Error(`Unknown realtime provider: ${provider}`);
}

export async function createRealtimeTokenRequest(
  clientId: string,
  capability: Record<string, string[]>,
  ttl?: number
): Promise<Record<string, unknown>> {
  if ((process.env.REALTIME_PROVIDER || 'ably') !== 'ably') {
    throw new Error('Token request is only supported for Ably provider');
  }

  const { AblyBackendProvider } = require('./providers/AblyBackendProvider') as {
    AblyBackendProvider: new () => {
      createTokenRequest(
        clientId: string,
        capability: Record<string, string[]>,
        ttl?: number
      ): Promise<Record<string, unknown>>;
    };
  };

  const provider = new AblyBackendProvider();
  return provider.createTokenRequest(clientId, capability, ttl);
}
