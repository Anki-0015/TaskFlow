// Shared TypeScript types across the backend

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'member';
  avatar?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  due_date?: string | null;
  created_by: number;
  assigned_to?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}
