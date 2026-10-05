import api from './api';
import Cookies from 'js-cookie';
import { ApiResponse, LoginResponse, User } from '@/types';

export const AuthService = {
  async register(name: string, username: string, email: string, password: string): Promise<ApiResponse<User>> {
    const { data } = await api.post<ApiResponse<User>>('/auth/register', { name, username, email, password });
    return data;
  },

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    if (data.success && data.data?.token) {
      Cookies.set('token', data.data.token, { expires: 7 });
    }
    return data;
  },

  async getMe(): Promise<ApiResponse<User>> {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data;
  },

  async updateProfile(updates: { name?: string; password?: string }): Promise<ApiResponse<User>> {
    const { data } = await api.put<ApiResponse<User>>('/auth/profile', updates);
    return data;
  },

  logout() {
    Cookies.remove('token');
  },

  getToken(): string | undefined {
    return Cookies.get('token');
  },
};
