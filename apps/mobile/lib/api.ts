import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

const isPrivateOrLocalHost = (host: string): boolean => {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
};

const resolveExpoDevHost = (): string | null => {
  const candidates = [
    process.env.EXPO_PUBLIC_DEV_HOST,
    process.env.EXPO_PUBLIC_HOST,
    process.env.EXPO_PACKAGER_HOSTNAME,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const host = candidate.trim().replace(/^https?:\/\//, '').split(':')[0];
    if (host) return host;
  }

  return null;
};

/**
 * Returns the bare host URL — never includes a /api suffix.
 * All route paths passed to api.get/post/patch must include /api themselves.
 * This prevents the double /api/api/ bug when env var or fallback has /api appended.
 */
export const getBaseUrl = (): string => {
  let baseUrl: string | undefined;

  // Priority 1: Use environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    baseUrl = process.env.EXPO_PUBLIC_API_URL;

    // In Expo dev, stale LAN IPs in .env are common after router/Wi-Fi changes.
    // If we detect a mismatch against Expo's active dev host, prefer the active host.
    if (__DEV__) {
      const resolvedHost = resolveExpoDevHost();
      if (resolvedHost) {
        try {
          const parsed = new URL(baseUrl as string);
          const envHost = parsed.hostname;

          if (isPrivateOrLocalHost(envHost) && envHost !== resolvedHost) {
            const corrected = `${parsed.protocol}//${resolvedHost}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`;
            console.warn(
              `[API] EXPO_PUBLIC_API_URL host (${envHost}) differs from active Expo host (${resolvedHost}). Using ${corrected}`
            );
            baseUrl = corrected;
          }
        } catch {
          // Keep the provided value if parsing fails.
        }
      }
    }

    console.log('[API] Using EXPO_PUBLIC_API_URL:', baseUrl);
  }
  // Priority 2: Development mode — use hardcoded local IP, with Android special case
  else if (__DEV__) {
    const resolvedHost = resolveExpoDevHost();
    let host = resolvedHost || 'localhost';

    const isAndroidEmulator = Platform.OS === 'android' && !resolvedHost;
    if (isAndroidEmulator) {
      host = '10.0.2.2';
    }

    baseUrl = `http://${host}:8080`;
    console.log('[API] Dev mode, using host:', host);
  }
  // Priority 3: Production URL
  else {
    baseUrl = 'https://api.sortt.com';
    console.log('[API] Production mode');
  }

  // Strip trailing /api or /api/ defensively — prevents double /api/api/ paths
  const finalUrl = (baseUrl ?? 'https://api.sortt.com').replace(/\/api\/?$/, '');
  console.log('[API] Final baseURL:', finalUrl);
  return finalUrl;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
});

let getToken: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => Promise<void> | void) | null = null;
let getLanguage: (() => string | null) | null = null;

export const setApiTokenGetter = (getter: () => Promise<string | null>) => {
  getToken = getter;
};

export const setApiUnauthorizedHandler = (handler: (() => Promise<void> | void) | null) => {
  onUnauthorized = handler;
};

export const setApiLanguageGetter = (getter: (() => string | null) | null) => {
  getLanguage = getter;
};

// Request interceptor — attaches Clerk JWT on every request
api.interceptors.request.use(
  async (config) => {
    try {
      config.headers = config.headers ?? {};

      console.log('[API] Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullUrl: `${config.baseURL}${config.url}`,
        hasData: !!config.data,
        dataType: config.data?.constructor?.name,
      });

      const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
      if (isFormData && config.headers) {
        delete (config.headers as any)['Content-Type'];
      }

      if (getToken) {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API] Token attached:', `${token.slice(0, 20)}...`);
        } else {
          console.warn('[API] No auth token returned by token getter for request:', config.url);
        }
      }

      const language = getLanguage?.();
      if (language) {
        config.headers = config.headers ?? {};
        (config.headers as any)['Accept-Language'] = language;
      }
    } catch (error) {
      console.error('Error fetching token for API request', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — logs errors, triggers sign-out on 401
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', {
      method: response.config?.method?.toUpperCase(),
      url: response.config?.url,
      status: response.status,
    });
    return response;
  },
  (error: AxiosError) => {
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const path = error.config?.url || 'UNKNOWN';
    const status = error.response?.status;
    const errorBody = error.response?.data;

    console.log('[API] Full error details:', {
      method,
      path,
      status,
      code: error.code,
      message: error.message,
      errorBody,
      configData: error.config?.data ? `${String(error.config.data).slice(0, 50)}...` : null,
    });

    const logFn = !status || status >= 500 ? console.error : console.warn;
    logFn(`[API ERROR] ${method} ${path} | Status: ${status}`, errorBody || error.message);

    if (status === 401) {
      const authError = String((errorBody as any)?.error ?? '').toLowerCase();
      const authMessage = String((errorBody as any)?.message ?? '').toLowerCase();
      const isMissingTokenError = authError.includes('no token') || authMessage.includes('no token');
      const shouldLogout =
        !isMissingTokenError && (
        authError === 'token_expired' ||
        authError === 'invalid_token' ||
        authError.includes('unauthorized') ||
        authMessage.includes('expired token') ||
        authMessage.includes('session expired'));

      if (shouldLogout) {
        console.warn('[API] Token/session invalid or expired — clearing auth state');
        if (onUnauthorized) {
          Promise.resolve(onUnauthorized()).catch((handlerError) => {
            console.error('[API] Unauthorized handler failed', handlerError);
          });
        }
      } else if (isMissingTokenError) {
        console.warn('[API] 401 due to missing Authorization header/token, skipping forced sign-out');
      }
    }

    return Promise.reject(error);
  }
);