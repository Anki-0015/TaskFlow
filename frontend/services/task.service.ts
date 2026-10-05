import api from './api';
import { ApiResponse, Task } from '@/types';

export interface TaskFilters {
  status?: string;
  priority?: string;
  projectId?: string;
  search?: string;
}

export const TaskService = {
  async getAll(filters?: TaskFilters): Promise<ApiResponse<Task[]>> {
    const { data } = await api.get<ApiResponse<Task[]>>('/tasks', { params: filters });
    return data;
  },

  async getById(id: number): Promise<ApiResponse<Task>> {
    const { data } = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return data;
  },

  async create(task: Partial<Task>): Promise<ApiResponse<Task>> {
    const { data } = await api.post<ApiResponse<Task>>('/tasks', task);
    return data;
  },

  async update(id: number, task: Partial<Task>): Promise<ApiResponse<Task>> {
    const { data } = await api.put<ApiResponse<Task>>(`/tasks/${id}`, task);
    return data;
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    const { data } = await api.delete<ApiResponse<void>>(`/tasks/${id}`);
    return data;
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse<Task>> {
    const { data } = await api.patch<ApiResponse<Task>>(`/tasks/${id}/status`, { status });
    return data;
  },
};
