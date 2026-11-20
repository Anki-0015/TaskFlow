'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CompletionTrend from '@/components/dashboard/CompletionTrend';
import ProjectForm from '@/components/projects/ProjectForm';
import TaskForm from '@/components/tasks/TaskForm';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { showToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { DashboardService } from '@/services/dashboard.service';
import { ProjectService } from '@/services/project.service';
import { TaskService } from '@/services/task.service';
import { DashboardData, Project, Task } from '@/types';
import { formatDate, formatRelativeTime } from '@/utils/date';
import { canCreateProjectTasks } from '@/utils/taskPermissions';
import { STATUS_LABELS, TaskStatus, canMoveTo, getDueState } from '@/utils/taskBoard';

function greeting(hour: number): string {
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/* ── Small building blocks ─────────────────────────────────────────────── */

function Panel({ title, description, action, children, className = '' }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-gray-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline">
      {children}
    </Link>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-[140px] items-center justify-center px-6 py-10 text-center text-sm text-gray-500">{children}</div>;
}

type Tone = 'neutral' | 'danger' | 'success' | 'accent';

function KpiTile({ label, value, detail, tone = 'neutral', href, progress }: {
  label: string;
  value: string | number;
  detail: string;
  tone?: Tone;
  href: string;
  progress?: number;
}) {
  return (
    <Link href={href} className="dash-kpi surface-card group flex min-h-[124px] flex-col justify-between rounded-[20px] border p-5 transition hover:-translate-y-0.5" data-tone={tone}>
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-gray-500">{label}</p>
      <div>
        <p className="dash-kpi-value mt-2 text-3xl font-bold tabular-nums tracking-[-.04em]">{value}</p>
        {progress !== undefined && (
          <div className="dash-meter mt-2 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
            <div className="dash-meter-fill h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}
        <p className="mt-1.5 text-xs text-gray-500">{detail}</p>
      </div>
    </Link>
  );
}

function DueLabel({ task, today }: { task: Task; today: string }) {
  if (!task.due_date) return <span className="text-[11px] text-gray-400">No due date</span>;
  const state = getDueState(task, today);
  return (
    <span className="board-due inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium" data-due={state}>
      {state === 'overdue' ? `Overdue · ${formatDate(task.due_date)}` : state === 'today' ? 'Due today' : `Due ${formatDate(task.due_date)}`}
    </span>
  );
}

function PriorityDot({ priority }: { priority: Task['priority'] }) {
  return <span className="dash-priority-dot mt-1.5 h-2 w-2 shrink-0 rounded-full" data-priority={priority} title={`${priority.toLowerCase()} priority`} aria-label={`${priority.toLowerCase()} priority`} role="img" />;
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
  const [now] = useState(() => new Date());

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setLoadError(false);
    try {
      const [dashboardRes, projectsRes] = await Promise.all([DashboardService.get(), ProjectService.getAll()]);
      if (!dashboardRes.success || !dashboardRes.data) throw new Error(dashboardRes.message);
      setData(dashboardRes.data);
      if (projectsRes.success) setProjects(projectsRes.data || []);
    } catch {
      if (mode === 'initial') setLoadError(true);
      else showToast('Could not refresh the dashboard.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the page's initial data request.
  useEffect(() => { load(); }, [load]);

  // Refresh when the user returns to the tab so numbers never go stale.
  useEffect(() => {
    let lastLoad = Date.now();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad > 60_000) {
        lastLoad = Date.now();
        void load('refresh');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const taskableProjects = useMemo(() => projects.filter(canCreateProjectTasks), [projects]);

  async function quickMove(task: Task, status: TaskStatus) {
    setMovingTaskId(task.id);
    try {
      const res = await TaskService.updateStatus(task.id, status);
      if (!res.success) throw new Error(res.message);
      showToast(`“${task.title}” moved to ${STATUS_LABELS[status]}.`, 'success');
      await load('refresh');
    } catch {
      showToast('Could not update the task.', 'error');
    } finally {
      setMovingTaskId(null);
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const today = data?.today ?? '';
  const t = data?.tasks;
  const completionRate = t && t.total ? Math.round((t.completed / t.total) * 100) : 0;
  const isNewWorkspace = data && data.projects.total === 0;

  const summary = !t
    ? ''
    : t.my_open === 0
      ? 'You have no open tasks assigned to you.'
      : `You have ${pluralize(t.my_open, 'open task')}${t.my_overdue ? `, ${t.my_overdue} overdue` : ''}.`;

  return (
    <DashboardLayout title="Dashboard">
      <div className="animate-fade-in space-y-6">
        {/* Hero */}
        <div className="dashboard-hero flex flex-col gap-5 rounded-[28px] px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold text-blue-700">
              {new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-gray-900 sm:text-3xl">
              {greeting(now.getHours())}, {firstName}.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">
              {loading ? 'Loading your workspace…' : summary || 'Here’s what’s happening across your projects.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {taskableProjects.length > 0 && (
              <Button onClick={() => setShowTaskForm(true)}><span aria-hidden="true">＋</span> New task</Button>
            )}
            <Button variant="secondary" onClick={() => setShowProjectForm(true)}>New project</Button>
            {data && (
              <span className="hidden sm:inline-flex">
              <Button variant="ghost" onClick={() => load('refresh')} loading={refreshing} aria-label="Refresh dashboard" title="Refresh">
                {!refreshing && (
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5V6h-2.5" />
                  </svg>
                )}
              </Button>
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : loadError || !data || !t ? (
          <Card className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600" aria-hidden="true">!</div>
            <h3 className="font-semibold text-gray-900">We couldn’t load your workspace</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">Check your connection and try again.</p>
            <Button className="mt-5" onClick={() => load()}>Try again</Button>
          </Card>
        ) : isNewWorkspace ? (
          <Onboarding onCreateProject={() => setShowProjectForm(true)} />
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <KpiTile
                label="My open tasks"
                value={t.my_open}
                detail={t.my_overdue ? `${t.my_overdue} overdue` : 'Nothing overdue'}
                tone={t.my_overdue ? 'danger' : 'neutral'}
                href="/tasks"
              />
              <KpiTile
                label="Overdue"
                value={t.overdue}
                detail={`${t.due_this_week} more due in 7 days`}
                tone={t.overdue ? 'danger' : 'neutral'}
                href="/tasks"
              />
              <KpiTile
                label="Done this week"
                value={t.completed_last_7_days}
                detail="Completed in the last 7 days"
                tone="success"
                href="/tasks?status=COMPLETED"
              />
              <KpiTile
                label="Completion"
                value={`${completionRate}%`}
                detail={`${t.completed} of ${pluralize(t.total, 'task')} done`}
                tone="accent"
                progress={completionRate}
                href="/projects"
              />
            </div>

            {/* Focus + deadlines */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel
                className="lg:col-span-2"
                title="My focus"
                description="Open tasks assigned to you, most urgent first"
                action={<PanelLink href="/tasks">All tasks →</PanelLink>}
              >
                {data.my_tasks.length === 0 ? (
                  <EmptyPanel>
                    <span>Nothing assigned to you right now. <Link href="/tasks" className="font-medium text-blue-600 hover:underline">Browse tasks</Link></span>
                  </EmptyPanel>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.my_tasks.map((task) => {
                      const next: TaskStatus | null = task.status === 'TODO' && canMoveTo(task, 'IN_PROGRESS')
                        ? 'IN_PROGRESS'
                        : canMoveTo(task, 'COMPLETED') ? 'COMPLETED' : null;
                      return (
                        <li key={task.id} className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                          <PriorityDot priority={task.priority} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Link href={`/projects/${task.project_id}`} className="max-w-[12rem] truncate text-[11px] font-medium text-blue-600 hover:underline">
                                {task.project_name}
                              </Link>
                              <Badge label={task.status} />
                              <DueLabel task={task} today={today} />
                            </div>
                          </div>
                          {next && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="!min-h-8 shrink-0 !px-2.5 text-xs"
                              loading={movingTaskId === task.id}
                              disabled={movingTaskId !== null}
                              onClick={() => quickMove(task, next)}
                              aria-label={`${next === 'COMPLETED' ? 'Complete' : 'Start'} ${task.title}`}
                            >
                              {next === 'COMPLETED' ? 'Complete ✓' : 'Start →'}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel title="Upcoming deadlines" description="Overdue or due in the next 7 days">
                {data.deadlines.length === 0 ? (
                  <EmptyPanel>No deadlines this week. 🎉</EmptyPanel>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.deadlines.map((task) => (
                      <li key={task.id}>
                        <Link href={`/projects/${task.project_id}`} className="dashboard-project-row flex items-start gap-3 px-5 py-3 sm:px-6">
                          <PriorityDot priority={task.priority} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                            <p className="mt-0.5 truncate text-[11px] text-gray-500">
                              {task.project_name}{task.assignee_name ? ` · ${task.assignee_name}` : ' · Unassigned'}
                            </p>
                          </div>
                          <DueLabel task={task} today={today} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {/* Trend + status */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel
                className="lg:col-span-2"
                title="Tasks completed"
                description={`Last 14 days · ${pluralize(data.completion_trend.reduce((sum, p) => sum + p.count, 0), 'task')} completed`}
              >
                <div className="px-5 pb-4 pt-6 sm:px-6">
                  <CompletionTrend data={data.completion_trend} />
                </div>
              </Panel>

              <Panel title="Task status" description={`${pluralize(t.total, 'task')} across ${pluralize(data.projects.total, 'project')}`}>
                <div className="space-y-4 px-5 py-5 sm:px-6">
                  {([
                    { key: 'TODO', label: 'To Do', value: t.todo },
                    { key: 'IN_PROGRESS', label: 'In Progress', value: t.in_progress },
                    { key: 'COMPLETED', label: 'Completed', value: t.completed },
                  ] as const).map((row) => {
                    const share = t.total ? Math.round((row.value / t.total) * 100) : 0;
                    return (
                      <div key={row.key}>
                        <div className="mb-1.5 flex items-baseline justify-between text-xs">
                          <span className="font-medium text-gray-700">{row.label}</span>
                          <span className="tabular-nums text-gray-500"><strong className="font-semibold text-gray-900">{row.value}</strong> · {share}%</span>
                        </div>
                        <div className="dash-meter h-2 overflow-hidden rounded-full" aria-hidden="true">
                          <div className="dash-status-fill h-full rounded-full transition-all duration-500" data-status={row.key} style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {t.unassigned > 0 && (
                    <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      <strong className="font-semibold text-gray-700">{t.unassigned}</strong> open {t.unassigned === 1 ? 'task has' : 'tasks have'} no assignee.
                    </p>
                  )}
                </div>
              </Panel>
            </div>

            {/* Projects + activity */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel
                className="lg:col-span-2"
                title="Project progress"
                description={`${data.projects.active} active · ${data.projects.planning} planning · ${data.projects.on_hold} on hold`}
                action={<PanelLink href="/projects">All projects →</PanelLink>}
              >
                {data.project_progress.length === 0 ? (
                  <EmptyPanel>All your projects are completed.</EmptyPanel>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.project_progress.map((project) => {
                      const pct = project.task_count ? Math.round((project.completed_count / project.task_count) * 100) : 0;
                      return (
                        <li key={project.id}>
                          <Link href={`/projects/${project.id}`} className="dashboard-project-row block px-5 py-4 sm:px-6">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate text-sm font-semibold text-gray-900">{project.name}</p>
                                <Badge label={project.status} />
                              </div>
                              <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">{pct}%</span>
                            </div>
                            <div className="dash-meter mt-2.5 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                              <div className="dash-meter-fill h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                              <span>{project.completed_count}/{pluralize(project.task_count, 'task')} done</span>
                              {project.overdue_count > 0 && <span className="font-medium text-red-600">{project.overdue_count} overdue</span>}
                              {project.end_date && <span>Ends {formatDate(project.end_date)}</span>}
                              <span>Active {formatRelativeTime(project.last_activity, now)}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel title="Recent activity" description="Latest task updates">
                {data.recent_activity.length === 0 ? (
                  <EmptyPanel>No task activity yet.</EmptyPanel>
                ) : (
                  <ul className="space-y-0.5 px-3 py-3">
                    {data.recent_activity.map((item) => (
                      <li key={item.id}>
                        <Link href={`/projects/${item.project_id}`} className="dashboard-project-row flex items-start gap-3 rounded-xl px-3 py-2.5">
                          {item.assignee_name ? <Avatar name={item.assignee_name} size="sm" /> : <span className="dash-activity-dot mt-1 h-6 w-6 shrink-0 rounded-full" aria-hidden="true" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-gray-900">{item.title}</p>
                            <p className="mt-0.5 truncate text-[11px] text-gray-500">
                              {item.created_at === item.updated_at ? 'Created' : 'Updated'} · {STATUS_LABELS[item.status]} · {item.project_name}
                            </p>
                          </div>
                          <time className="shrink-0 text-[11px] tabular-nums text-gray-400" dateTime={item.updated_at}>
                            {formatRelativeTime(item.updated_at, now)}
                          </time>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>

      {showProjectForm && (
        <ProjectForm
          isOpen={showProjectForm}
          onClose={() => setShowProjectForm(false)}
          onSuccess={() => { void load('refresh'); }}
        />
      )}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSuccess={() => { void load('refresh'); }}
        projects={taskableProjects}
      />
    </DashboardLayout>
  );
}

function Onboarding({ onCreateProject }: { onCreateProject: () => void }) {
  const steps = [
    { title: 'Create a project', text: 'Give it a name, dates and a status.' },
    { title: 'Invite your team', text: 'Add people as managers, members or viewers.' },
    { title: 'Plan on the board', text: 'Add tasks and move them from To Do to Completed.' },
  ];
  return (
    <Card className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <h3 className="text-lg font-bold tracking-tight text-gray-900">Set up your workspace</h3>
        <p className="mt-1 text-sm text-gray-500">Three steps to get your team moving.</p>
      </div>
      <ol className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{index + 1}</span>
            <p className="mt-3 text-sm font-semibold text-gray-900">{step.title}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">{step.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 text-center">
        <Button onClick={onCreateProject}>Create your first project</Button>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="dash-skeleton h-[124px] rounded-[20px]" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="dash-skeleton h-72 rounded-[20px] lg:col-span-2" />
        <div className="dash-skeleton h-72 rounded-[20px]" />
      </div>
    </div>
  );
}
