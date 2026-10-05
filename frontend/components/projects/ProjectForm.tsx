'use client';

import { useState, FormEvent } from 'react';
import { Project } from '@/types';
import { ProjectService } from '@/services/project.service';
import { showToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/index';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  initial?: Project | null;
}

const statusOptions = [
  { value: 'PLANNING',  label: 'Planning'  },
  { value: 'ACTIVE',    label: 'Active'    },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD',   label: 'On Hold'   },
];

export default function ProjectForm({ isOpen, onClose, onSuccess, initial }: ProjectFormProps) {
  const isEdit = Boolean(initial);

  const [form, setForm] = useState({
    name:        initial?.name        || '',
    description: initial?.description || '',
    start_date:  initial?.start_date  || '',
    end_date:    initial?.end_date    || '',
    status:      initial?.status      || 'PLANNING',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Project name is required.'); return; }

    setLoading(true);
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description || undefined,
        start_date:  form.start_date  || undefined,
        end_date:    form.end_date    || undefined,
        status:      form.status as Project['status'],
      };

      const res = isEdit
        ? await ProjectService.update(initial!.id, payload)
        : await ProjectService.create(payload);

      if (res.success && res.data) {
        showToast(isEdit ? 'Project updated.' : 'Project created.', 'success');
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'New Project'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="proj-name"
          label="Project Name *"
          placeholder="e.g. Website Redesign"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
        <Textarea
          id="proj-desc"
          label="Description"
          placeholder="Brief description of this project..."
          value={form.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="proj-start"
            type="date"
            label="Start Date"
            value={form.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
          <Input
            id="proj-end"
            type="date"
            label="End Date"
            value={form.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>
        <Select
          id="proj-status"
          label="Status"
          value={form.status}
          options={statusOptions}
          onChange={(e) => handleChange('status', e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
