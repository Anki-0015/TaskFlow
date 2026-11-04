import { Project, Task } from '@/types';

export function canManageTask(task: Task): boolean {
  return task.current_user_project_role === 'MANAGER' || task.current_user_project_role === 'MEMBER';
}

export function canCreateProjectTasks(project: Project): boolean {
  return project.current_user_project_role === 'MANAGER' || project.current_user_project_role === 'MEMBER';
}

export function getNextTaskStatus(task: Task): Task['status'] | null {
  if (task.current_user_project_role === 'MANAGER') {
    return task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
  }

  if (task.current_user_project_role === 'MEMBER' && task.status !== 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }

  return null;
}

export function getTaskStatusActionLabel(task: Task): string {
  if (task.current_user_project_role === 'MANAGER') {
    return task.status === 'COMPLETED' ? `Reopen ${task.title}` : `Complete ${task.title}`;
  }

  if (task.current_user_project_role === 'MEMBER') {
    return task.status === 'IN_PROGRESS'
      ? `${task.title} is in progress`
      : `Move ${task.title} to In Progress`;
  }

  return `${task.title} status is view only`;
}
