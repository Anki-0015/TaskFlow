import api from './api';
import { ApiResponse, DashboardData } from '@/types';
import { toDateInputValue } from '@/utils/date';

export const DashboardService = {
  /** Loads the dashboard using the viewer's local date and time zone. */
  async get(): Promise<ApiResponse<DashboardData>> {
    const now = new Date();
    const { data } = await api.get<ApiResponse<DashboardData>>('/dashboard', {
      params: { today: toDateInputValue(now), utcOffset: -now.getTimezoneOffset() },
    });
    return data;
  },
};
