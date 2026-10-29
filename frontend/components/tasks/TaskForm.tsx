'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Task, Project, ProjectMember } from '@/types';
import { TaskService } from '@/services/task.service';
import { showToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import { Select, Textarea } from '@/components/ui/index';
import { formatDate } from '@/utils/date';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  initial?: Task | null;
  projects: Project[];
  defaultProjectId?: number;
  members?: ProjectMember[];
}

function getFormValues(initial: TaskFormProps['initial'], defaultProjectId: number | undefined, projects: Project[]) {
  const projectId = String(initial?.project_id || defaultProjectId || projects[0]?.id || '');
  const project = projects.find((item) => String(item.id) === projectId);
  const projectStart = project?.start_date?.slice(0, 10);
  const projectEnd = project?.end_date?.slice(0, 10);
  let dueDate = initial?.due_date?.slice(0, 10) || '';

  if ((projectStart && dueDate < projectStart) || (projectEnd && dueDate > projectEnd)) {
    dueDate = '';
  }

  return {
    project_id: projectId,
    title: initial?.title || '',
    description: initial?.description || '',
    priority: initial?.priority || 'MEDIUM',
    status: initial?.status || 'TODO',
    due_date: dueDate,
    assigned_to: String(initial?.assigned_to || ''),
  };
}

export default function TaskForm({
  isOpen,
  onClose,
  onSuccess,
  initial,
  projects,
  defaultProjectId,
  members = [],
}: TaskFormProps) {
  const isEdit = Boolean(initial);

  const [form, setForm] = useState(() => getFormValues(initial, defaultProjectId, projects));
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const projectRangesKey = projects.map((project) => `${project.id}:${project.start_date || ''}:${project.end_date || ''}`).join('|');

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- Reset when the form opens or its task/project date ranges change; the range key avoids resets caused only by a new array identity.
  useEffect(() => {
    if (!isOpen) return;
    setForm(getFormValues(initial, defaultProjectId, projects));
    setError('');
  }, [isOpen, initial?.id, defaultProjectId, projectRangesKey]);

  const selectedProject = projects.find((project) => String(project.id) === form.project_id);
  const projectStartDate = selectedProject?.start_date?.slice(0, 10);
  const projectEndDate = selectedProject?.end_date?.slice(0, 10);

  function handleChange(key: string, value: string) {
    if (key === 'project_id') {
      const nextProject = projects.find((project) => String(project.id) === value);
      const nextStart = nextProject?.start_date?.slice(0, 10);
      const nextEnd = nextProject?.end_date?.slice(0, 10);
      setForm((prev) => ({
        ...prev,
        project_id: value,
        due_date: (nextStart && prev.due_date < nextStart) || (nextEnd && prev.due_date > nextEnd)
          ? ''
          : prev.due_date,
      }));
      setError('');
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    if (!form.project_id)   { setError('Please select a project.'); return; }
    if (form.due_date && projectStartDate && form.due_date < projectStartDate) {
      setError(`Due date must be on or after ${formatDate(projectStartDate)}.`);
      return;
    }
    if (form.due_date && projectEndDate && form.due_date > projectEndDate) {
      setError(`Due date must be on or before ${formatDate(projectEndDate)}.`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        project_id:  Number(form.project_id),
        title:       form.title.trim(),
        description: form.description || undefined,
        priority:    form.priority as Task['priority'],
        status:      form.status as Task['status'],
        due_date:    form.due_date || null,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      };

      const res = isEdit
        ? await TaskService.update(initial!.id, payload)
        : await TaskService.create(payload);

      if (res.success && res.data) {
        showToast(isEdit ? 'Task updated.' : 'Task created.', 'success');
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));
  const priorityOptions = [
    { value: 'LOW',    label: 'Low'    },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH',   label: 'High'   },
  ];
  const statusOptions = [
    { value: 'TODO',        label: 'To Do'       },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED',   label: 'Completed'   },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          id="task-project"
          label="Project *"
          value={form.project_id}
          options={projectOptions}
          onChange={(e) => handleChange('project_id', e.target.value)}
        />
        <Input
          id="task-title"
          label="Task Title *"
          placeholder="e.g. Design homepage wireframes"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
        />
        {members.length > 0 && <Select id="task-assignee" label="Assign to" value={form.assigned_to} options={[{ value: '', label: 'Unassigned' }, ...members.map((member) => ({ value: String(member.id), label: `${member.name} (@${member.username})` }))]} onChange={(e) => handleChange('assigned_to', e.target.value)} />}
        <Textarea
          id="task-desc"
          label="Description"
          placeholder="Task details..."
          value={form.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            id="task-priority"
            label="Priority"
            value={form.priority}
            options={priorityOptions}
            onChange={(e) => handleChange('priority', e.target.value)}
          />
          <Select
            id="task-status"
            label="Status"
            value={form.status}
            options={statusOptions}
            onChange={(e) => handleChange('status', e.target.value)}
          />
        </div>
        <DatePicker
          id="task-due"
          label="Due Date"
          value={form.due_date || ''}
          min={projectStartDate}
          max={projectEndDate}
          onChange={(value) => handleChange('due_date', value)}
        />
        {(projectStartDate || projectEndDate) && (
          <p className="-mt-2 text-xs text-gray-400">
            {projectStartDate && projectEndDate
              ? `Choose a date between ${formatDate(projectStartDate)} and ${formatDate(projectEndDate)}.`
              : projectStartDate
                ? `Choose ${formatDate(projectStartDate)} or later.`
                : `Choose ${formatDate(projectEndDate)} or earlier.`}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
