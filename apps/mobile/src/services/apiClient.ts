import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default to Android emulator host alias 10.0.2.2 or local port 5000
export const API_BASE_URL = 'http://10.0.2.2:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
