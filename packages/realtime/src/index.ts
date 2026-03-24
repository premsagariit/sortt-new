import type { IRealtimeProvider } from './types';
import { AblyBackendProvider } from './providers/AblyBackendProvider';
import { AblyMobileProvider } from './providers/AblyMobileProvider';
import { SoketiProvider } from './providers/SoketiProvider';

export { IRealtimeProvider, RealtimeMessage } from './types';
export { AblyBackendProvider } from './providers/AblyBackendProvider';
export { AblyMobileProvider } from './providers/AblyMobileProvider';
export { SoketiProvider } from './providers/SoketiProvider';

/**
 * Factory function to create realtime provider based on environment variable.
 * Platform-agnostic — caller should use AblyBackendProvider (backend) or AblyMobileProvider (mobile).
 */
export function createRealtimeProvider(platform: 'backend' | 'mobile'): IRealtimeProvider {
  const provider = process.env.REALTIME_PROVIDER || 'ably';

  if (provider === 'ably') {
    if (platform === 'mobile') {
      return new AblyMobileProvider();
    } else {
      return new AblyBackendProvider();
    }
  }

  if (provider === 'soketi') {
    return new SoketiProvider();
  }

  throw new Error(`Unknown realtime provider: ${provider}`);
}

export async function createRealtimeTokenRequest(
  clientId: string,
  capability: Record<string, string[]>,
  ttl?: number
): Promise<Record<string, unknown>> {
  const provider = createRealtimeProvider('backend');
  if (!(provider instanceof AblyBackendProvider)) {
    throw new Error('Token request is only supported for Ably backend provider');
  }
  return provider.createTokenRequest(clientId, capability, ttl);
}
