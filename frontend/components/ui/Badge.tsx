'use client';

interface BadgeProps {
  label: string;
  variant?: 'status' | 'priority' | 'role';
}

const statusColors: Record<string, string> = {
  PLANNING:    'bg-yellow-100 text-yellow-800',
  ACTIVE:      'bg-blue-100 text-blue-800',
  COMPLETED:   'bg-green-100 text-green-800',
  ON_HOLD:     'bg-gray-100 text-gray-700',
  TODO:        'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  LOW:         'bg-green-100 text-green-800',
  MEDIUM:      'bg-yellow-100 text-yellow-800',
  HIGH:        'bg-red-100 text-red-700',
  admin:       'bg-purple-100 text-purple-800',
  member:      'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  ON_HOLD:     'On Hold',
};

export default function Badge({ label }: BadgeProps) {
  const colorClass = statusColors[label] || 'bg-gray-100 text-gray-700';
  const displayLabel = statusLabels[label] || label;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {displayLabel}
    </span>
  );
}
