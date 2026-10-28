'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TaskService } from '@/services/task.service';
import { ProjectService } from '@/services/project.service';
import { Task, Project } from '@/types';
import { PageLoader, EmptyState, Select } from '@/components/ui/index';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TaskForm from '@/components/tasks/TaskForm';
import { ConfirmDialog } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { formatDate } from '@/utils/date';

export default function TasksPage() {
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [delLoad,  setDelLoad]  = useState(false);

  // Filters
  const [search,    setSearch]    = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status,    setStatus]    = useState('');
  const [priority,  setPriority]  = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        TaskService.getAll({ status: status || undefined, priority: priority || undefined, projectId: projectId || undefined, search: debouncedSearch || undefined }),
        ProjectService.getAll(),
      ]);
      if (tRes.success) setTasks(tRes.data || []);
      if (pRes.success) setProjects(pRes.data || []);
    } catch {
      showToast('Could not load tasks. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, priority, projectId, debouncedSearch]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts async data requests; their results update the page after they resolve.
  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete() {
    if (!deleting) return;
    setDelLoad(true);
    try {
      await TaskService.delete(deleting.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleting.id));
      showToast('Task deleted.', 'success');
    } catch {
      showToast('Failed to delete task.', 'error');
    } finally {
      setDelLoad(false);
      setDeleting(null);
    }
  }

  async function toggleStatus(task: Task) {
    const next = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const res = await TaskService.updateStatus(task.id, next);
      if (res.success) setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data! : t)));
    } catch {
      showToast('Failed to update status.', 'error');
    }
  }

  const priorityDot: Record<string, string> = {
    HIGH: 'bg-red-400', MEDIUM: 'bg-yellow-400', LOW: 'bg-green-400',
  };

  const groupedTasks = [
    { status: 'TODO', label: 'To do' },
    { status: 'IN_PROGRESS', label: 'In progress' },
    { status: 'COMPLETED', label: 'Completed' },
  ].map((group) => ({ ...group, tasks: tasks.filter((task) => task.status === group.status) }));
  const completedCount = tasks.filter((task) => task.status === 'COMPLETED').length;
  const inProgressCount = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const todoCount = tasks.filter((task) => task.status === 'TODO').length;

  const statusOpts = [
    { value: '', label: 'All Statuses' },
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
  ];
  const priorityOpts = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
  ];
  const projectOpts = [
    { value: '', label: 'All Projects' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <DashboardLayout title="Tasks">
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">All tasks</h2>
            <p className="mt-1 text-sm text-gray-500">{tasks.length} matching task{tasks.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}><span aria-hidden="true">＋</span> New task</Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'To do', value: todoCount, color: 'text-gray-700' },
            { label: 'In progress', value: inProgressCount, color: 'text-blue-700' },
            { label: 'Completed', value: completedCount, color: 'text-green-700' },
          ].map((item) => (
            <Card key={item.label} className="flex min-h-[88px] flex-col justify-center px-4 py-3">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`mt-1 text-xl font-semibold ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              id="task-search"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              id="filter-status"
              value={status}
              options={statusOpts}
              onChange={(e) => setStatus(e.target.value)}
            />
            <Select
              id="filter-priority"
              value={priority}
              options={priorityOpts}
              onChange={(e) => setPriority(e.target.value)}
            />
            <Select
              id="filter-project"
              value={projectId}
              options={projectOpts}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>
        </Card>

        {/* Task list */}
        {loading ? (
          <PageLoader />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon="check"
            title="No tasks found"
            description="Create a task or adjust your filters."
            action={<Button onClick={() => setShowForm(true)}>Create Task</Button>}
          />
        ) : (
          <div className="space-y-6">
            {groupedTasks.filter((group) => group.tasks.length > 0).map((group) => (
              <section key={group.status} aria-labelledby={`task-group-${group.status}`} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 id={`task-group-${group.status}`} className="text-sm font-semibold text-gray-800">{group.label}</h3>
                  <span className="text-xs text-gray-400">{group.tasks.length}</span>
                </div>
                {group.tasks.map((task) => (
              <Card key={task.id} className="group">
                <div className="px-4 py-4 flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleStatus(task)}
                    aria-label={`${task.status === 'COMPLETED' ? 'Reopen' : 'Complete'} ${task.title}`}
                    aria-pressed={task.status === 'COMPLETED'}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      task.status === 'COMPLETED'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {task.status === 'COMPLETED' && <span className="text-[10px] font-bold">✓</span>}
                  </button>

                  {/* Priority dot */}
                  <span className={`flex-shrink-0 w-2 h-2 rounded-full ${priorityDot[task.priority]}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{task.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {task.project_name && (
                        <Link href={`/projects/${task.project_id}`} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100" onClick={(event) => event.stopPropagation()}>
                          {task.project_name} ↗
                        </Link>
                      )}
                      <Badge label={task.status} />
                      <Badge label={task.priority} />
                      {task.due_date && (
                        <span className="text-xs text-gray-400">Due: {formatDate(task.due_date)}</span>
                      )}
                      {task.assignee_name && <span className="text-xs text-gray-500">Assigned to {task.assignee_name}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditing(task); setShowForm(true); }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleting(task)}
                    >
                      <span aria-hidden="true">×</span><span className="sr-only">Delete task</span>
                    </Button>
                  </div>
                </div>
              </Card>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Task form */}
      <TaskForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSuccess={(t) => {
          if (editing) {
            setTasks((prev) => prev.map((tk) => (tk.id === t.id ? t : tk)));
          } else {
            setTasks((prev) => [t, ...prev]);
          }
        }}
        initial={editing}
        projects={projects}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Delete task "${deleting?.title}"?`}
        loading={delLoad}
      />
    </DashboardLayout>
  );
}
