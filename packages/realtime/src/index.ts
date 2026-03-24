import type { IRealtimeProvider } from './types';
import { setRealtimeTokenGetter, type RealtimeTokenGetter } from './authToken';

export { IRealtimeProvider, RealtimeMessage } from './types';
export { setRealtimeTokenGetter } from './authToken';

export function configureRealtimeAuth(getter: RealtimeTokenGetter): void {
  setRealtimeTokenGetter(getter);
}

/**
 * Factory function to create realtime provider based on environment variable.
 * Platform-agnostic — caller should use AblyBackendProvider (backend) or AblyMobileProvider (mobile).
 */
export function createRealtimeProvider(platform: 'backend' | 'mobile'): IRealtimeProvider {
  const provider = process.env.REALTIME_PROVIDER || 'ably';

  if (provider === 'ably') {
    if (platform === 'mobile') {
      const { AblyMobileProvider } = require('./providers/AblyMobileProvider') as {
        AblyMobileProvider: new (tokenUrl?: string) => IRealtimeProvider;
      };

      const envAuthUrl = process.env.EXPO_PUBLIC_ABLY_AUTH_URL;
      const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

      const hasTemplateSyntax = (value?: string): boolean => {
        return !!value && /\$\{[^}]+\}/.test(value);
      };

      const normalizeBase = (value: string): string => value.replace(/\/api\/?$/, '');

      const authUrl = hasTemplateSyntax(envAuthUrl)
        ? undefined
        : envAuthUrl || (envApiUrl && !hasTemplateSyntax(envApiUrl)
            ? `${normalizeBase(envApiUrl)}/api/realtime/token`
            : undefined);

      return new AblyMobileProvider(authUrl);
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
