import type { IRealtimeProvider } from './types';
import { setRealtimeTokenGetter, type RealtimeTokenGetter } from './authToken';

export { IRealtimeProvider, RealtimeMessage } from './types';
export { setRealtimeTokenGetter } from './authToken';

export function configureRealtimeAuth(getter: RealtimeTokenGetter): void {
  setRealtimeTokenGetter(getter);
}

const hasTemplateSyntax = (value?: string): boolean => {
  return !!value && /\$\{[^}]+\}/.test(value);
};

const normalizeBase = (value: string): string => value.replace(/\/api\/?$/, '');

const isPrivateOrLocalHost = (host: string): boolean => {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
};

const isLoopbackHost = (host: string): boolean => {
  return host === 'localhost' || host === '127.0.0.1';
};

const resolveExpoRuntimeHost = (): string | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default as any;
    const candidates: Array<string | undefined> = [
      Constants?.expoConfig?.hostUri,
      Constants?.manifest2?.extra?.expoClient?.hostUri,
      Constants?.manifest?.debuggerHost,
      process.env.EXPO_PUBLIC_DEV_HOST,
      process.env.EXPO_PUBLIC_HOST,
      process.env.EXPO_PACKAGER_HOSTNAME,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const host = candidate.trim().replace(/^https?:\/\//, '').split(':')[0];
      if (host) return host;
    }
  } catch {
    // expo-constants is only available in mobile runtime
  }

  return null;
};

const resolveMobileAuthUrl = (): string | undefined => {
  const envAuthUrl = process.env.EXPO_PUBLIC_ABLY_AUTH_URL;
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envAuthUrl && !hasTemplateSyntax(envAuthUrl)) {
    return envAuthUrl;
  }

  if (!envApiUrl || hasTemplateSyntax(envApiUrl)) {
    return undefined;
  }

  let baseUrl = normalizeBase(envApiUrl);
  const isDev = (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.NODE_ENV !== 'production';

  if (isDev) {
    const runtimeHost = resolveExpoRuntimeHost();
    if (runtimeHost) {
      try {
        const parsed = new URL(baseUrl);
        const envHost = parsed.hostname;
        const shouldAvoidLoopbackDowngrade = !isLoopbackHost(envHost) && isLoopbackHost(runtimeHost);

        if (isPrivateOrLocalHost(envHost) && envHost !== runtimeHost && !shouldAvoidLoopbackDowngrade) {
          baseUrl = `${parsed.protocol}//${runtimeHost}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`;
        }
      } catch {
        // keep provided base URL if parsing fails
      }
    }
  }

  return `${baseUrl}/api/realtime/token`;
};

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

      const authUrl = resolveMobileAuthUrl();

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
