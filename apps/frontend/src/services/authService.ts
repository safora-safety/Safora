import { apiClient } from './api';
import { User } from '@safora/shared-types';

export interface AuthResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    if (response.data.token) {
      localStorage.setItem('safora_admin_token', response.data.token);
      localStorage.setItem('safora_admin_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
    return response.data.user;
  },

  logout(): void {
    localStorage.removeItem('safora_admin_token');
    localStorage.removeItem('safora_admin_user');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('safora_admin_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('safora_admin_token'));
  },
};
