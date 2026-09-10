import { apiClient } from './apiClient';
import { User, ApiResponse } from '@safora/shared-types';

export interface AuthResponseData {
  token: string;
  user: User;
}

export class AuthService {
  static async login(
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    try {
      const response = await apiClient.post<
        ApiResponse<AuthResponseData> & { token: string; user: User }
      >('/auth/login', { email, password });
      return {
        user: response.data.user,
        token: response.data.token,
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please check your connection and try again.';
      throw new Error(message);
    }
  }

  static async register(
    name: string,
    email: string,
    phone: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    try {
      const response = await apiClient.post<
        ApiResponse<AuthResponseData> & { token: string; user: User }
      >('/auth/register', { name, email, phone, password });
      return {
        user: response.data.user,
        token: response.data.token,
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please check your connection and try again.';
      throw new Error(message);
    }
  }

  static async updateProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
    bloodGroup?: string;
    emergencyNotes?: string;
  }): Promise<{ user: User }> {
    try {
      const response = await apiClient.patch<
        ApiResponse<{ user: User }> & { user?: User }
      >('/auth/profile', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        blood_group: data.bloodGroup,
        emergency_notes: data.emergencyNotes,
      });
      const updatedUser =
        response.data.user || (response.data as any).data?.user;
      return { user: updatedUser };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Profile update failed. Please check your connection and try again.';
      throw new Error(message);
    }
  }
}
