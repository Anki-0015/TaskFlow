// Shared TypeScript interfaces for the frontend

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  created_by: number;
  creator_name?: string;
  task_count?: number;
  completed_count?: number;
  created_at: string;
  updated_at: string;
  members?: ProjectMember[];
}

export interface ProjectMember { id: number; name: string; username: string; role: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER'; }

export interface ProjectInvitation {
  id: number;
  project_id: number;
  project_name: string;
  role: 'MANAGER' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  created_at: string;
  invited_by_name: string;
  invited_by_username: string;
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
  project_name?: string;
  creator_name?: string;
  assignee_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  projects: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    planning_projects: number;
    on_hold_projects: number;
  };
  tasks: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    todo_tasks: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginResponse {
  user: User;
  token: string;
}
