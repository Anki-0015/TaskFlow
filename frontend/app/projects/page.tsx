'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectService } from '@/services/project.service';
import { Project } from '@/types';
import { PageLoader, EmptyState } from '@/components/ui/index';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProjectForm from '@/components/projects/ProjectForm';
import { ConfirmDialog } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { formatDate } from '@/utils/date';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await ProjectService.getAll();
      if (!res.success) throw new Error(res.message || 'The project service could not return your projects.');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLoadError(responseMessage || (error instanceof Error ? error.message : 'Could not load projects.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async data fetch; its results update the list after the request resolves.
  useEffect(() => { loadProjects(); }, [loadProjects]);

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
  }

  function handleUpdated(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await ProjectService.delete(deleting.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleting.id));
      showToast('Project deleted.', 'success');
    } catch {
      showToast('Failed to delete project.', 'error');
    } finally {
      setDelLoading(false);
      setDeleting(null);
    }
  }

  const statusColor: Record<string, string> = {
    ACTIVE:    'border-l-blue-500',
    PLANNING:  'border-l-yellow-400',
    COMPLETED: 'border-l-green-500',
    ON_HOLD:   'border-l-gray-400',
  };

  return (
    <DashboardLayout title="Projects">
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Your projects</h2>
            <p className="mt-1 text-sm text-gray-500">
              {loadError ? 'Project list is unavailable right now' : `${projects.length} project${projects.length !== 1 ? 's' : ''} across your workspace`}
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}><span aria-hidden="true">＋</span> New project</Button>
        </div>

        {/* List */}
        {loading ? (
          <PageLoader />
        ) : loadError ? (
          <Card className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600" aria-hidden="true">!</div>
            <h3 className="font-semibold text-gray-900">Your projects couldn’t be loaded</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">{loadError}</p>
            <Button className="mt-5" onClick={loadProjects}>Try again</Button>
          </Card>
        ) : projects.length === 0 ? (
          <EmptyState
            icon="folder"
            title="No projects yet"
            description="Create your first project to get started."
            action={<Button onClick={() => setShowForm(true)}>Create Project</Button>}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((p) => (
              <Card
                key={p.id}
                className={`relative border-l-4 ${statusColor[p.status] || 'border-l-gray-300'} hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <Link href={`/projects/${p.id}`} aria-label={`Open ${p.name}`} className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
                <div className="pointer-events-none relative px-5 py-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">{p.name}</h3>
                      <Badge label={p.status} />
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Created by {p.creator_name || 'Unknown'}</span>
                      {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                      {p.end_date   && <span>End: {formatDate(p.end_date)}</span>}
                      <span>{p.task_count ?? 0} tasks · {p.completed_count ?? 0} done</span>
                    </div>
                    <div className="mt-4 max-w-sm"><div className="mb-1.5 flex justify-between text-[11px] text-gray-500"><span>Progress</span><span>{p.task_count ? Math.round((p.completed_count || 0) / p.task_count * 100) : 0}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${p.task_count ? Math.round((p.completed_count || 0) / p.task_count * 100) : 0}%` }} /></div></div>
                  </div>
                  <div className="pointer-events-auto relative z-10 flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditing(p); setShowForm(true); }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleting(p)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <ProjectForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={editing ? handleUpdated : handleCreated}
          initial={editing}
        />
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleting?.name}"? All tasks in this project will also be deleted.`}
        loading={delLoading}
      />
    </DashboardLayout>
  );
}
