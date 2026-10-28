'use client';

import { ReactNode, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/index';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="app-canvas flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-canvas fixed inset-0 flex overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <header className="app-header sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-4 border-b px-4 backdrop-blur-sm sm:px-6 lg:px-10">
          <button
            type="button"
            className="menu-button flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors lg:hidden"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={sidebarOpen}
            aria-controls="workspace-sidebar"
          >
            {sidebarOpen ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
          {title && (
            <div className="flex-1 min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[.16em] text-gray-400 sm:block">TaskFlow workspace</p>
              <h1 className="truncate text-base font-semibold tracking-tight text-gray-900">{title}</h1>
            </div>
          )}
          {!title && <div className="flex-1" />}
          <ThemeToggle />
        </header>

        <main className="workspace-scroll-region min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-[1320px] pb-8">{children}</div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
