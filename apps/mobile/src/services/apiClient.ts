import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Live Render backend (works on both emulator and real devices)
export const API_BASE_URL = 'https://safora-backend.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s – Render free-tier cold-starts can take 15-30s
  headers: {
    'Content-Type': 'application/json',
  },
});

let onUnauthorizedCallback: (() => void) | null = null;
let isHandling401 = false;

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorizedCallback = fn;
}

// Attach JWT Bearer token if present
apiClient.interceptors.request.use(async config => {
  try {
    const token = await AsyncStorage.getItem('@safora_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Continue without token
  }
  return config;
});

// Response interceptor: Detect expired/revoked JWT tokens
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint =
        url.includes('/auth/login') || url.includes('/auth/register');

      if (!isAuthEndpoint && !isHandling401) {
        isHandling401 = true;
        try {
          await Promise.all([
            AsyncStorage.removeItem('@safora_user'),
            AsyncStorage.removeItem('@safora_token'),
            AsyncStorage.removeItem('@safora_is_guest'),
          ]);
        } catch {
          // Fallback
        }

        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }

        setTimeout(() => {
          isHandling401 = false;
        }, 3000);
      }
    }
    return Promise.reject(error);
  },
);
