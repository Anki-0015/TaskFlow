export type ProjectTaskRole = 'MANAGER' | 'MEMBER' | 'VIEWER' | null | undefined;

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];

export function assertCanChangeTaskStatus(role: ProjectTaskRole, nextStatus: string): void {
  if (!TASK_STATUSES.includes(nextStatus)) throw new Error('Choose a valid task status.');
  if (role === 'MANAGER') return;
  if (role === 'MEMBER' && nextStatus === 'IN_PROGRESS') return;
  if (role === 'VIEWER' || !role) throw new Error('Viewers can only view tasks.');
  if (role === 'MEMBER') throw new Error('Members can only move tasks to In Progress.');
  throw new Error('You do not have permission to change this task status.');
}
