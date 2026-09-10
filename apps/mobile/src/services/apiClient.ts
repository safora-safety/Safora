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
