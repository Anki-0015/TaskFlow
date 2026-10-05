'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/projects',  label: 'Projects',  icon: 'projects' },
  { href: '/tasks',     label: 'Tasks',     icon: 'tasks' },
  { href: '/profile',   label: 'Profile',   icon: 'profile' },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    projects: <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H10l2 2h7.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />,
    tasks: <><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="m8 11 2 2 5-5M8 16h8" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {open && (
        <button
          type="button"
          className="mobile-drawer-backdrop fixed inset-0 z-30 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        id="workspace-sidebar"
        aria-label="Workspace navigation"
        className={`
          app-sidebar fixed inset-y-0 left-0 z-40 flex w-[272px] shrink-0 flex-col border-r
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0
        `}
      >
        <div className="px-5 pb-7 pt-6">
          <Link href="/dashboard" onClick={onClose} className="group flex items-center gap-3 rounded-xl focus-visible:outline-none">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-[1.04]">
              <span className="text-xs font-bold tracking-tight text-white">TF</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[15px] font-semibold tracking-tight text-gray-900">TaskFlow</span>
              <span className="block text-xs text-gray-500">Your work, in flow</span>
            </div>
          </Link>
        </div>

        <div className="workspace-label px-5 pb-2 text-[10px] font-semibold uppercase tracking-[.16em]">Workspace</div>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`workspace-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ${active ? 'workspace-nav-link-active font-semibold' : ''}`}
              >
                <span className="flex w-5 items-center justify-center"><NavIcon name={item.icon} /></span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 px-3 py-4">
          {user && (
            <div className="user-chip mb-2 flex items-center gap-3 rounded-xl px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 text-sm font-semibold text-blue-700 ring-2 ring-white/80">
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                <p className="truncate text-xs text-gray-500">{user.email || user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="workspace-logout flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17l5-5-5-5M15 12H3" />
              <path d="M12 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
