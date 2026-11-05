import api from './api';
import { ApiResponse, ProjectMessage } from '@/types';

export const ProjectChatService = {
  async getMessages(projectId: number, afterId?: number): Promise<ApiResponse<ProjectMessage[]>> {
    const { data } = await api.get<ApiResponse<ProjectMessage[]>>(`/projects/${projectId}/messages`, {
      params: afterId ? { afterId } : undefined,
    });
    return data;
  },

  async sendMessage(projectId: number, body: string): Promise<ApiResponse<ProjectMessage>> {
    const { data } = await api.post<ApiResponse<ProjectMessage>>(`/projects/${projectId}/messages`, { body });
    return data;
  },
};
