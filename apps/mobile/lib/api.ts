import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

// Get base URL from environment manually, default to local if not set
const getBaseUrl = () => {
  // Try to use EXPO_PUBLIC_API_URL first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // __DEV__ is a React Native global
  if (__DEV__) {
    // For local development on physical device
    // Replace with your local machine's IP address
    return 'http://192.168.1.100:8080/api'; 
  }
  
  return 'https://api.sortt.com/api'; // Production fallback
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let getToken: (() => Promise<string | null>) | null = null;

export const setApiTokenGetter = (getter: () => Promise<string | null>) => {
  getToken = getter;
};

// Request interceptor to add Clerk token
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

// Response interceptor to handle absolute auth errors cleanly
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Automatically log user out if token is definitively invalid
    if (error.response?.status === 401) {
        // Just fail silently for now, the UI should handle triggering signout or token refresh
        console.warn('API returned 401 Unauthorized');
    }
    return Promise.reject(error);
  }
);
