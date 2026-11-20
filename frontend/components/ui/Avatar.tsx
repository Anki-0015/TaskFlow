'use client';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const sizes = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
};

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function getHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ((hash % 360) + 360) % 360;
}

/** Initials avatar with a stable, name-derived colour. */
export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const hue = getHue(name);
  return (
    <span
      className={`avatar flex flex-shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${className}`}
      style={{ '--avatar-hue': hue } as React.CSSProperties}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
