import { apiClient } from './api';
import { User, UserRole } from '@safora/shared-types';

export interface UserListParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  success: boolean;
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserStats {
  total: number;
  admins: number;
  moderators: number;
  users: number;
}

export const userService = {
  async getUsers(params: UserListParams = {}): Promise<UserListResponse> {
    const res = await apiClient.get<UserListResponse>('/users', { params });
    return res.data;
  },

  async getUserStats(): Promise<UserStats> {
    const res = await apiClient.get<{ success: boolean; stats: UserStats }>('/users/stats');
    return res.data.stats;
  },

  async updateUserRole(id: string | number, role: UserRole): Promise<User> {
    const res = await apiClient.patch<{ success: boolean; user: User }>(`/users/${id}/role`, { role });
    return res.data.user;
  },

  async updateUserStatus(id: string | number, isActive: boolean): Promise<User> {
    const res = await apiClient.patch<{ success: boolean; user: User }>(`/users/${id}/status`, { isActive });
    return res.data.user;
  },

  async createUser(data: { name: string; email: string; phone?: string; password: string; role?: UserRole }): Promise<User> {
    const res = await apiClient.post<{ success: boolean; user: User; token: string }>('/auth/register', {
      name: data.name,
      email: data.email,
      phone: data.phone || '+91 98765 00000',
      password: data.password,
    });
    const createdUser = res.data.user;
    if (data.role && data.role !== 'user') {
      return await this.updateUserRole(createdUser.id, data.role);
    }
    return createdUser;
  },
};
