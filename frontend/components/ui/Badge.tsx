'use client';

interface BadgeProps {
  label: string;
  variant?: 'status' | 'priority' | 'role';
}

const statusColors: Record<string, string> = {
  PLANNING:    'badge-warning',
  ACTIVE:      'badge-info',
  COMPLETED:   'badge-success',
  ON_HOLD:     'badge-neutral',
  TODO:        'badge-neutral',
  IN_PROGRESS: 'badge-info',
  LOW:         'badge-success',
  MEDIUM:      'badge-warning',
  HIGH:        'badge-danger',
  PENDING:     'badge-warning',
  ACCEPTED:    'badge-success',
  DECLINED:    'badge-neutral',
  MANAGER:     'badge-info',
  MEMBER:      'badge-neutral',
  VIEWER:      'badge-neutral',
  admin:       'badge-info',
  member:      'badge-neutral',
};

const statusLabels: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  MANAGER: 'Manager',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
  admin: 'Admin',
  member: 'Member',
};

export default function Badge({ label }: BadgeProps) {
  const colorClass = statusColors[label] || 'badge-neutral';
  const displayLabel = statusLabels[label] || label;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[.01em] ${colorClass}`}>
      {displayLabel}
    </span>
  );
}
