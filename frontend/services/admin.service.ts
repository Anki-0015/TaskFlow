import api from './api';
import { ApiResponse, User } from '@/types';

export type AccountRole = User['role'];

export interface AdminManagedUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: AccountRole;
  created_at: string;
}

export interface AdminOverview {
  users: number;
  admins: number;
  members: number;
  projects: number;
  tasks: number;
}

export interface AdminUsersPage {
  users: AdminManagedUser[];
  total: number;
  page: number;
  page_size: number;
}

export const AdminService = {
  async getOverview(): Promise<ApiResponse<AdminOverview>> {
    const { data } = await api.get<ApiResponse<AdminOverview>>('/admin/overview');
    return data;
  },

  async getUsers(search: string, page: number, pageSize = 20): Promise<ApiResponse<AdminUsersPage>> {
    const { data } = await api.get<ApiResponse<AdminUsersPage>>('/admin/users', {
      params: { search, page, pageSize },
    });
    return data;
  },

  async updateUserRole(id: number, role: AccountRole): Promise<ApiResponse<AdminManagedUser>> {
    const { data } = await api.patch<ApiResponse<AdminManagedUser>>(`/admin/users/${id}/role`, { role });
    return data;
  },
};
