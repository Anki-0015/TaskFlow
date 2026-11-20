import { Task } from '@/types';
import { toDateInputValue, addDaysToDateInput } from '@/utils/date';

export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];

export const BOARD_COLUMNS: { status: TaskStatus; label: string; hint: string }[] = [
  { status: 'TODO', label: 'To Do', hint: 'Ready to be picked up' },
  { status: 'IN_PROGRESS', label: 'In Progress', hint: 'Actively being worked on' },
  { status: 'COMPLETED', label: 'Completed', hint: 'Done and reviewed' },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const PRIORITY_RANK: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];

/** Mirrors backend/src/services/taskPermissions.ts so the UI only offers moves the API accepts. */
export function canMoveTo(task: Task, status: TaskStatus): boolean {
  if (status === task.status) return false;
  if (task.current_user_project_role === 'MANAGER') return true;
  return task.current_user_project_role === 'MEMBER' && status === 'IN_PROGRESS';
}

export function moveTargets(task: Task): TaskStatus[] {
  return STATUS_ORDER.filter((status) => canMoveTo(task, status));
}

export function isForward(from: TaskStatus, to: TaskStatus): boolean {
  return STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(from);
}

export function moveActionLabel(from: TaskStatus, to: TaskStatus): string {
  if (to === 'COMPLETED') return 'Complete';
  if (to === 'IN_PROGRESS') return from === 'TODO' ? 'Start' : 'Reopen';
  return 'To Do';
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export function getDueState(task: Task, todayKey: string): DueState {
  const due = task.due_date?.slice(0, 10);
  if (!due) return 'none';
  if (task.status === 'COMPLETED') return 'later';
  if (due < todayKey) return 'overdue';
  if (due === todayKey) return 'today';
  if (due <= addDaysToDateInput(todayKey, 3)) return 'soon';
  return 'later';
}

export function todayKey(): string {
  return toDateInputValue(new Date());
}

export type BoardSort = 'priority' | 'due' | 'newest' | 'title';

export const SORT_OPTIONS: { value: BoardSort; label: string }[] = [
  { value: 'priority', label: 'Sort: Priority' },
  { value: 'due', label: 'Sort: Due date' },
  { value: 'newest', label: 'Sort: Newest' },
  { value: 'title', label: 'Sort: Title A–Z' },
];

function compareDue(a: Task, b: Task): number {
  const aDue = a.due_date?.slice(0, 10);
  const bDue = b.due_date?.slice(0, 10);
  if (aDue && bDue) return aDue.localeCompare(bDue);
  if (aDue) return -1;
  if (bDue) return 1;
  return 0;
}

export function sortTasks(tasks: Task[], sort: BoardSort): Task[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    let result = 0;
    if (sort === 'priority') result = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareDue(a, b);
    else if (sort === 'due') result = compareDue(a, b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    else if (sort === 'title') result = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    return result || b.created_at.localeCompare(a.created_at) || b.id - a.id;
  });
  return sorted;
}
