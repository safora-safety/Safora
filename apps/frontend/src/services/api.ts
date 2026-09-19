import axios from 'axios';

// Defaults to live Render backend, or local dev if specified in .env
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://safora-backend.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s timeout to handle free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach operator's JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('safora_admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle unauthorized/expired tokens
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('safora_admin_token');
      localStorage.removeItem('safora_admin_user');
      // If not on login page, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
