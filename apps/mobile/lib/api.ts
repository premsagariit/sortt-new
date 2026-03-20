import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

/**
 * Returns the bare host URL — never includes a /api suffix.
 * All route paths passed to api.get/post/patch must include /api themselves.
 * This prevents the double /api/api/ bug when env var or fallback has /api appended.
 */
export const getBaseUrl = (): string => {
  const raw =
    process.env.EXPO_PUBLIC_API_URL ||
    (__DEV__ ? 'http://192.168.1.100:8080' : 'https://api.sortt.com');

  // Strip trailing /api or /api/ defensively — prevents double /api/api/ paths
  // regardless of whether the env var was set with or without the suffix.
  return raw.replace(/\/api\/?$/, '');
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
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
      if (getToken) {
        const token = await getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
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
  (response) => response,
  (error: AxiosError) => {
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const path = error.config?.url || 'UNKNOWN';
    const status = error.response?.status;
    const errorBody = error.response?.data;

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