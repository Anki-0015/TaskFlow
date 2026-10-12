'use client';

import { useState, FormEvent } from 'react';
import { Task, Project, ProjectMember } from '@/types';
import { TaskService } from '@/services/task.service';
import { showToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import { Select, Textarea } from '@/components/ui/index';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  initial?: Task | null;
  projects: Project[];
  defaultProjectId?: number;
  members?: ProjectMember[];
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

  const [form, setForm] = useState({
    project_id:  String(initial?.project_id || defaultProjectId || projects[0]?.id || ''),
    title:       initial?.title       || '',
    description: initial?.description || '',
    priority:    initial?.priority    || 'MEDIUM',
    status:      initial?.status      || 'TODO',
    due_date:    initial?.due_date    || '',
    assigned_to: String(initial?.assigned_to || ''),
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    if (!form.project_id)   { setError('Please select a project.'); return; }

    setLoading(true);
    try {
      const payload = {
        project_id:  Number(form.project_id),
        title:       form.title.trim(),
        description: form.description || undefined,
        priority:    form.priority as Task['priority'],
        status:      form.status as Task['status'],
        due_date:    form.due_date || undefined,
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
          onChange={(value) => handleChange('due_date', value)}
        />

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
