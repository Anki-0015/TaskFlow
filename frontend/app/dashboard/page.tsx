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
    <Card className="dashboard-stat p-5 sm:p-6">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-gray-500">{label}</p>
      <p className="text-3xl font-bold tracking-[-.04em] text-gray-900 sm:text-[34px]">{value ?? 0}</p>
      {sub && <p className="mt-2 text-xs text-gray-400">{sub}</p>}
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
      <div className="animate-fade-in space-y-7 sm:space-y-8">
        {/* Welcome */}
        <div className="dashboard-hero flex flex-col gap-6 rounded-[28px] px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-9">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Workspace overview
            </p>
            <h2 className="text-2xl font-bold tracking-[-.04em] text-gray-900 sm:text-3xl">Good to see you, {user?.name?.split(' ')[0]}.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">Review project status and pick up where you left off.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/tasks" className="button-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition">View tasks</Link>
            <Link href="/projects" className="button-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition">Browse projects</Link>
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
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard label="Total Projects"   value={stats?.projects.total_projects   ?? 0} />
              <StatCard label="Active Projects"  value={stats?.projects.active_projects  ?? 0} />
              <StatCard label="Total Tasks"      value={stats?.tasks.total_tasks         ?? 0} />
              <StatCard label="Completed Tasks"  value={stats?.tasks.completed_tasks     ?? 0} />
            </div>

            {/* Second row */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              <StatCard label="Tasks To-Do"      value={stats?.tasks.todo_tasks         ?? 0} />
              <StatCard label="In Progress"      value={stats?.tasks.in_progress_tasks  ?? 0} />
              <StatCard label="Pending Projects" value={(stats?.projects.planning_projects ?? 0) + (stats?.projects.on_hold_projects ?? 0)} sub="Planning + On Hold" />
            </div>

            {/* Recent projects */}
            <Card>
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 sm:px-6">
                <div><h3 className="text-base font-bold tracking-tight text-gray-900">Recent projects</h3><p className="mt-1 text-xs text-gray-500">Projects in your workspace</p></div>
                <Link href="/projects" className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline">
                  View all →
                </Link>
              </div>
              {projects.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-500">
                  No projects yet.{' '}
                  <Link href="/projects" className="font-medium text-blue-600 hover:underline">Create your first project</Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="dashboard-project-row flex items-center justify-between px-5 py-4 transition-colors sm:px-6"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
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
