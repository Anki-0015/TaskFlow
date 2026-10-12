'use client';

import { useState, FormEvent } from 'react';
import { Project } from '@/types';
import { ProjectService } from '@/services/project.service';
import { showToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import { Select, Textarea } from '@/components/ui/index';
import { addDaysToDateInput, toDateInputValue } from '@/utils/date';

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

function initialFormValues(initial?: Project | null) {
  const startDate = initial?.start_date?.slice(0, 10) || (initial ? '' : toDateInputValue(new Date()));
  let endDate = initial?.end_date?.slice(0, 10) || '';
  if (!initial) endDate = addDaysToDateInput(startDate, 1);
  else if (startDate && (!endDate || endDate <= startDate)) endDate = addDaysToDateInput(startDate, 1);
  return {
    name: initial?.name || '',
    description: initial?.description || '',
    start_date: startDate,
    end_date: endDate,
    status: initial?.status || 'PLANNING',
  };
}

export default function ProjectForm({ isOpen, onClose, onSuccess, initial }: ProjectFormProps) {
  const isEdit = Boolean(initial);

  const [form, setForm] = useState(() => initialFormValues(initial));
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleChange(key: string, value: string) {
    setForm((prev) => {
      if (key === 'start_date') {
        const minimumEnd = value ? addDaysToDateInput(value, 1) : '';
        return { ...prev, start_date: value, end_date: minimumEnd && (!prev.end_date || prev.end_date <= value) ? minimumEnd : prev.end_date };
      }
      return { ...prev, [key]: value };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    if (form.start_date && form.end_date && form.end_date <= form.start_date) {
      setError('The end date must be at least one day after the start date.');
      return;
    }

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
          <DatePicker
            id="proj-start"
            label="Start Date"
            value={form.start_date || ''}
            onChange={(value) => handleChange('start_date', value)}
          />
          <DatePicker
            id="proj-end"
            label="End Date"
            value={form.end_date || ''}
            min={form.start_date ? addDaysToDateInput(form.start_date, 1) : undefined}
            align="right"
            onChange={(value) => handleChange('end_date', value)}
          />
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          {isEdit ? 'End date must be at least one day after the start date.' : 'New projects start today and end tomorrow by default.'}
        </p>
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
