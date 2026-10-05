'use client';

import { use, useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectService } from '@/services/project.service';
import { TaskService } from '@/services/task.service';
import { Project, Task, ProjectMember } from '@/types';
import { PageLoader, EmptyState } from '@/components/ui/index';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProjectForm from '@/components/projects/ProjectForm';
import TaskForm from '@/components/tasks/TaskForm';
import { ConfirmDialog } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Params { id: string }

export default function ProjectDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const router  = useRouter();
  const { user } = useAuth();

  const [project,  setProject]  = useState<Project | null>(null);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState('');
  const [memberRole, setMemberRole] = useState<ProjectMember['role']>('MEMBER');
  const [loading,  setLoading]  = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [delProject, setDelProject] = useState(false);
  const [delTask,     setDelTask]    = useState<Task | null>(null);
  const [actionLoad,  setActionLoad] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [pRes, tRes, mRes] = await Promise.all([
        ProjectService.getById(Number(id)),
        TaskService.getAll({ projectId: id }),
        ProjectService.getMembers(Number(id)),
      ]);
      if (pRes.success) setProject(pRes.data!);
      if (tRes.success) setTasks(tRes.data || []);
      if (mRes.success) setMembers(mRes.data || []);
    } catch {
      showToast('Could not load this project. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async data fetch; its results update the page after the requests resolve.
  useEffect(() => { loadData(); }, [loadData]);

  async function handleDeleteProject() {
    if (!project) return;
    setActionLoad(true);
    try {
      await ProjectService.delete(project.id);
      showToast('Project deleted.', 'success');
      router.push('/projects');
    } catch {
      showToast('Failed to delete project.', 'error');
      setActionLoad(false);
    }
    setDelProject(false);
  }

  async function handleDeleteTask() {
    if (!delTask) return;
    setActionLoad(true);
    try {
      await TaskService.delete(delTask.id);
      setTasks((prev) => prev.filter((t) => t.id !== delTask.id));
      showToast('Task deleted.', 'success');
    } catch {
      showToast('Failed to delete task.', 'error');
    } finally {
      setActionLoad(false);
      setDelTask(null);
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
  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await ProjectService.addMember(Number(id), email, memberRole);
      if (res.success && res.data) {
        setMembers((prev) => [...prev.filter((m) => m.id !== res.data!.id), res.data!]);
        setEmail(''); showToast('Project member added.', 'success');
      }
    } catch (err) { showToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not add member.', 'error'); }
  }
  const completeCount = tasks.filter((task) => task.status === 'COMPLETED').length;
  const progress = tasks.length ? Math.round(completeCount / tasks.length * 100) : 0;
  const canManageProject = Boolean(project && user && project.created_by === user.id);
  const canEditTasks = canManageProject || Boolean(user && members.some((member) => member.id === user.id && member.role !== 'VIEWER'));

  return (
    <DashboardLayout title={project?.name || 'Project'}>
      {loading ? (
        <PageLoader />
      ) : !project ? (
        <EmptyState icon="❓" title="Project not found" action={
          <Link href="/projects"><Button variant="secondary">Back to Projects</Button></Link>
        } />
      ) : (
        <div className="animate-fade-in space-y-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{project.name}</span>
          </div>

          {/* Project header card */}
          <Card>
            <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900">{project.name}</h2>
                  <Badge label={project.status} />
                </div>
                {project.description && (
                  <p className="text-sm text-gray-500 mt-2">{project.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                  {project.start_date && <span>📅 Start: {project.start_date.slice(0, 10)}</span>}
                  {project.end_date   && <span>🏁 End: {project.end_date.slice(0, 10)}</span>}
                  <span>Tasks: {tasks.length} · Done: {tasks.filter(t => t.status === 'COMPLETED').length}</span>
                </div>
              </div>
              {canManageProject && <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setDelProject(true)}>Delete</Button>
              </div>}
            </div>
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="mb-2 flex justify-between text-xs"><span className="font-medium text-gray-600">Project progress</span><span className="font-semibold text-gray-800">{progress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} /></div>
            </div>
          </Card>

          <Card>
            <div className="px-5 py-4">
              <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-gray-900">Project team</h3><p className="text-xs text-gray-500">Add people by email and set their access role.</p></div><Badge label={`${members.length} members`} /></div>
              <div className="mb-4 flex flex-wrap gap-2">{members.map((member) => <div key={member.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{member.name.slice(0,1).toUpperCase()}</span><span><span className="block text-xs font-medium text-gray-900">{member.name}</span><span className="block text-[11px] text-gray-500">@{member.username} · {member.role.toLowerCase()}</span></span></div>)}</div>
              {canManageProject && <form onSubmit={addMember} className="flex flex-wrap gap-2"><input type="email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Add by email" required className="min-w-[170px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"/><select aria-label="Member role" value={memberRole} onChange={(e) => setMemberRole(e.target.value as ProjectMember['role'])} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"><option value="MEMBER">Member</option><option value="MANAGER">Manager</option><option value="VIEWER">Viewer</option></select><Button type="submit" size="sm">Add person</Button></form>}
            </div>
          </Card>

          {/* Tasks section */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Tasks ({tasks.length})</h3>
            {canEditTasks && <Button size="sm" onClick={() => { setEditTask(null); setShowTask(true); }}>＋ Add task</Button>}
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              icon="✓"
              title="No tasks yet"
              description="Add tasks to this project."
              action={canEditTasks ? <Button size="sm" onClick={() => setShowTask(true)}>Add task</Button> : undefined}
            />
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id} className="group">
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      disabled={!canEditTasks}
                      onClick={() => toggleStatus(task)}
                      aria-label={`${task.status === 'COMPLETED' ? 'Reopen' : 'Complete'} ${task.title}`}
                      aria-pressed={task.status === 'COMPLETED'}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
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
                      <p className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-400">
                        <Badge label={task.status} />
                        <Badge label={task.priority} />
                        {task.due_date && <span>Due: {task.due_date.slice(0, 10)}</span>}
                        {task.assignee_name && <span>→ {task.assignee_name}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    {canEditTasks && <div className="flex-shrink-0 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditTask(task); setShowTask(true); }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => setDelTask(task)}
                      >
                        ✕
                      </Button>
                    </div>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit project */}
      {project && (
        <ProjectForm
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSuccess={(p) => setProject(p)}
          initial={project}
        />
      )}

      {/* Task form */}
      {project && (
        <TaskForm
          isOpen={showTask}
          onClose={() => { setShowTask(false); setEditTask(null); }}
          onSuccess={(t) => {
            if (editTask) {
              setTasks((prev) => prev.map((tk) => (tk.id === t.id ? t : tk)));
            } else {
              setTasks((prev) => [t, ...prev]);
            }
          }}
          initial={editTask}
          projects={[project]}
          defaultProjectId={project.id}
          members={members}
        />
      )}

      {/* Confirm delete project */}
      <ConfirmDialog
        isOpen={delProject}
        onClose={() => setDelProject(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Delete "${project?.name}" and all its tasks?`}
        loading={actionLoad}
      />

      {/* Confirm delete task */}
      <ConfirmDialog
        isOpen={Boolean(delTask)}
        onClose={() => setDelTask(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Delete task "${delTask?.title}"?`}
        loading={actionLoad}
      />
    </DashboardLayout>
  );
}
