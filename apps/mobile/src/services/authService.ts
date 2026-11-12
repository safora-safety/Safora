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

  static async loginWithGoogle(
    idToken: string,
  ): Promise<{ user: User; token: string }> {
    try {
      const response = await apiClient.post<
        ApiResponse<AuthResponseData> & { token: string; user: User }
      >('/auth/google', { idToken });
      return {
        user: response.data.user,
        token: response.data.token,
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Google login failed. Please check your connection and try again.';
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
    blood_group?: string;
    emergencyNotes?: string;
    emergency_notes?: string;
    allergies?: string;
    showMedicalOnLockScreen?: boolean;
    show_medical_on_lock_screen?: boolean;
    hasCompletedTestDrill?: boolean;
    has_completed_test_drill?: boolean;
    avatarUrl?: string;
    avatar_url?: string;
    age?: number;
    ageNoticeAck?: boolean;
    termsAcceptedAt?: string;
  }): Promise<{ user: User }> {
    try {
      const response = await apiClient.patch<
        ApiResponse<{ user: User }> & { user?: User }
      >('/auth/profile', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        blood_group: data.blood_group ?? data.bloodGroup,
        emergency_notes: data.emergency_notes ?? data.emergencyNotes,
        allergies: data.allergies,
        show_medical_on_lock_screen:
          data.show_medical_on_lock_screen ?? data.showMedicalOnLockScreen,
        has_completed_test_drill:
          data.has_completed_test_drill ?? data.hasCompletedTestDrill,
        avatar_url: data.avatar_url ?? data.avatarUrl,
        age: data.age,
        age_notice_ack: data.ageNoticeAck,
        terms_accepted_at: data.termsAcceptedAt,
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

  static async uploadProfilePhoto(
    uri: string,
    name: string = 'avatar.jpg',
    type: string = 'image/jpeg',
  ): Promise<{ user: User; avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri,
        name,
        type,
      } as any);

      const response = await apiClient.post<
        ApiResponse<{ user: User; avatarUrl: string }> & {
          user?: User;
          avatarUrl?: string;
        }
      >('/auth/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const user = response.data.user || (response.data as any).data?.user;
      const avatarUrl =
        response.data.avatarUrl ||
        (response.data as any).data?.avatarUrl ||
        user?.avatarUrl ||
        user?.avatar_url ||
        '';

      return { user, avatarUrl };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to upload profile photo.';
      throw new Error(message);
    }
  }

  static async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>('/auth/change-password', {
        oldPassword,
        newPassword,
        old_password: oldPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to change password. Please check your current password.';
      throw new Error(message);
    }
  }
}
