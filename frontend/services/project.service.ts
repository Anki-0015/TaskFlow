import api from './api';
import { ApiResponse, Project, DashboardStats, ProjectMember, ProjectInvitation } from '@/types';

export const ProjectService = {
  async getAll(): Promise<ApiResponse<Project[]>> {
    const { data } = await api.get<ApiResponse<Project[]>>('/projects');
    return data;
  },

  async getById(id: number): Promise<ApiResponse<Project>> {
    const { data } = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return data;
  },

  async create(project: Partial<Project>): Promise<ApiResponse<Project>> {
    const { data } = await api.post<ApiResponse<Project>>('/projects', project);
    return data;
  },

  async update(id: number, project: Partial<Project>): Promise<ApiResponse<Project>> {
    const { data } = await api.put<ApiResponse<Project>>(`/projects/${id}`, project);
    return data;
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    const { data } = await api.delete<ApiResponse<void>>(`/projects/${id}`);
    return data;
  },

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const { data } = await api.get<ApiResponse<DashboardStats>>('/projects/stats/dashboard');
    return data;
  },
  async addMember(id: number, email: string, role: Exclude<ProjectMember['role'], 'OWNER'>): Promise<ApiResponse<{ id: number }>> {
    const { data } = await api.post<ApiResponse<{ id: number }>>(`/projects/${id}/members`, { email, role }); return data;
  },
  async getInvitations(): Promise<ApiResponse<ProjectInvitation[]>> {
    const { data } = await api.get<ApiResponse<ProjectInvitation[]>>('/projects/invitations/inbox'); return data;
  },
  async respondToInvitation(id: number, action: 'ACCEPT' | 'DECLINE'): Promise<ApiResponse<{ status: string }>> {
    const { data } = await api.patch<ApiResponse<{ status: string }>>(`/projects/invitations/${id}`, { action }); return data;
  },
  async getMembers(id: number): Promise<ApiResponse<ProjectMember[]>> {
    const { data } = await api.get<ApiResponse<ProjectMember[]>>(`/projects/${id}/members`); return data;
  },
  async removeMember(id: number, memberId: number): Promise<ApiResponse<void>> {
    const { data } = await api.delete<ApiResponse<void>>(`/projects/${id}/members/${memberId}`); return data;
  },
};
