import api from './api';
import { ApiResponse, LoginResponse, User } from '@/types';

export const AuthService = {
  async register(name: string, username: string, email: string, password: string): Promise<ApiResponse<User>> {
    const { data } = await api.post<ApiResponse<User>>('/auth/register', { name, username, email, password });
    return data;
  },

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout').then(() => undefined).catch(() => undefined);
  },

  async requestPasswordReset(email: string): Promise<ApiResponse<{ delivery: 'gmail' | 'console' }>> {
    const { data } = await api.post<ApiResponse<{ delivery: 'gmail' | 'console' }>>('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(email: string, code: string, password: string): Promise<ApiResponse> {
    const { data } = await api.post<ApiResponse>('/auth/reset-password', { email, code, password });
    return data;
  },

  async getMe(): Promise<ApiResponse<User>> {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data;
  },

  async updateProfile(updates: { name?: string; password?: string; current_password?: string }): Promise<ApiResponse<User>> {
    const { data } = await api.put<ApiResponse<User>>('/auth/profile', updates);
    return data;
  },

};
