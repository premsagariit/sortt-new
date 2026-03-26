import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

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
  timeout: 10000,
});

let getToken: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => Promise<void> | void) | null = null;

export const setApiTokenGetter = (getter: () => Promise<string | null>) => {
  getToken = getter;
};

export const setApiUnauthorizedHandler = (handler: (() => Promise<void> | void) | null) => {
  onUnauthorized = handler;
};

// Request interceptor — attaches Clerk JWT on every request
api.interceptors.request.use(
  async (config) => {
    try {
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
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API] Token attached:', `${token.slice(0, 20)}...`);
        }
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
      console.warn('[API] 401 Unauthorized — clearing auth state');
      if (onUnauthorized) {
        Promise.resolve(onUnauthorized()).catch((handlerError) => {
          console.error('[API] Unauthorized handler failed', handlerError);
        });
      }
    }

    return Promise.reject(error);
  }
);