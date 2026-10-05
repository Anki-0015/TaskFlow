'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectService } from '@/services/project.service';
import { DashboardStats, Project } from '@/types';
import { PageLoader } from '@/components/ui/index';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className="absolute right-5 top-5 h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center" aria-hidden="true">↗</div>
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-gray-500 mb-3">{label}</p>
      <p className="text-3xl font-semibold tracking-tight text-gray-900">{value ?? 0}</p>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [sRes, pRes] = await Promise.all([
        ProjectService.getDashboardStats(),
        ProjectService.getAll(),
      ]);
      if (sRes.success) setStats(sRes.data!);
      if (pRes.success) setProjects((pRes.data || []).slice(0, 5));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the page's initial data request.
  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout title="Dashboard">
      <div className="animate-fade-in space-y-8">
        {/* Welcome */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#101b36] via-[#173469] to-[#2563a8] px-6 py-8 text-white shadow-xl shadow-blue-950/10 sm:px-9 sm:py-10">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-12 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.2em] text-blue-200">Your workspace at a glance</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Good to see you, {user?.name?.split(' ')[0]}.</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-blue-100/80">Keep your projects moving and make room for the work that matters today.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/tasks" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50">View my tasks <span aria-hidden="true">→</span></Link>
              <Link href="/projects" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">Browse projects</Link>
            </div>
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : loadError ? (
          <Card className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">!</div>
            <h3 className="font-semibold text-gray-900">We couldn’t load your workspace</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">Check that the TaskFlow API is running and try again.</p>
            <Button className="mt-5" onClick={load}>Try again</Button>
          </Card>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Total Projects"   value={stats?.projects.total_projects   ?? 0} />
              <StatCard label="Active Projects"  value={stats?.projects.active_projects  ?? 0} />
              <StatCard label="Total Tasks"      value={stats?.tasks.total_tasks         ?? 0} />
              <StatCard label="Completed Tasks"  value={stats?.tasks.completed_tasks     ?? 0} />
            </div>

            {/* Second row */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              <StatCard label="Tasks To-Do"      value={stats?.tasks.todo_tasks         ?? 0} />
              <StatCard label="In Progress"      value={stats?.tasks.in_progress_tasks  ?? 0} />
              <StatCard label="Pending Projects" value={(stats?.projects.planning_projects ?? 0) + (stats?.projects.on_hold_projects ?? 0)} sub="Planning + On Hold" />
            </div>

            {/* Recent projects */}
            <Card>
              <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between sm:px-6">
                <div><h3 className="text-base font-semibold text-gray-900">Recent projects</h3><p className="mt-1 text-xs text-gray-500">A pulse check on your team’s work</p></div>
                <Link href="/projects" className="text-xs font-semibold text-blue-600 hover:underline">
                  View all →
                </Link>
              </div>
              {projects.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-500">
                  No projects yet.{' '}
                  <Link href="/projects" className="font-medium text-blue-600 hover:underline">Create your first project</Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">
                          {p.task_count ?? 0} tasks · {p.completed_count ?? 0} completed
                        </p>
                      </div>
                      <Badge label={p.status} />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
