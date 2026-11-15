'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Task } from '@/types';
import { Select } from '@/components/ui/index';
import { formatDate } from '@/utils/date';

type TaskStatus = Task['status'];

const columns: { status: TaskStatus; label: string; color: string; dot: string }[] = [
  { status: 'TODO', label: 'To Do', color: 'border-t-slate-400', dot: 'bg-slate-400' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-t-sky-500', dot: 'bg-sky-500' },
  { status: 'COMPLETED', label: 'Completed', color: 'border-t-emerald-500', dot: 'bg-emerald-500' },
];

interface TaskBoardProps {
  tasks: Task[];
  onMoveTask: (task: Task, status: TaskStatus) => Promise<void>;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  showProject?: boolean;
}

function canMoveTo(task: Task, status: TaskStatus): boolean {
  if (status === task.status) return false;
  if (task.current_user_project_role === 'MANAGER') return true;
  return task.current_user_project_role === 'MEMBER' && status === 'IN_PROGRESS';
}

function allowedStatuses(task: Task): TaskStatus[] {
  if (task.current_user_project_role === 'MANAGER') return ['TODO', 'IN_PROGRESS', 'COMPLETED'];
  if (task.current_user_project_role === 'MEMBER') {
    return task.status === 'IN_PROGRESS' ? ['IN_PROGRESS'] : [task.status, 'IN_PROGRESS'];
  }
  return [task.status];
}

export default function TaskBoard({
  tasks,
  onMoveTask,
  onEditTask,
  onDeleteTask,
  showProject = false,
}: TaskBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<TaskStatus | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(() => new Set());

  async function moveTask(task: Task, status: TaskStatus) {
    if (!canMoveTo(task, status) || pendingTaskIds.has(task.id)) return;
    setPendingTaskIds((current) => new Set(current).add(task.id));
    try {
      await onMoveTask(task, status);
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Tasks by status">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        const canDropHere = tasks.some((task) => canMoveTo(task, column.status));

        return (
          <section
            key={column.status}
            aria-labelledby={`board-column-${column.status}`}
            onDragOver={(event) => {
              if (!canDropHere) return;
              event.preventDefault();
              setHoveredColumn(column.status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoveredColumn(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = Number(event.dataTransfer.getData('text/plain')) || draggedTaskId;
              const task = tasks.find((item) => item.id === taskId);
              setDraggedTaskId(null);
              setHoveredColumn(null);
              if (task) void moveTask(task, column.status);
            }}
            className={`min-h-56 rounded-2xl border border-gray-200 border-t-4 ${column.color} bg-slate-50/70 p-3 transition-colors ${hoveredColumn === column.status ? 'bg-sky-50 ring-2 ring-sky-200' : ''}`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 id={`board-column-${column.status}`} className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className={`h-2 w-2 rounded-full ${column.dot}`} aria-hidden="true" />
                {column.label}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task) => {
                const taskCanMove = allowedStatuses(task).some((status) => canMoveTo(task, status));
                const canEditTask = task.current_user_project_role === 'MANAGER' || task.current_user_project_role === 'MEMBER';
                const statusOptions = allowedStatuses(task).map((status) => ({
                  value: status,
                  label: columns.find((item) => item.status === status)?.label || status,
                }));

                return (
                  <article
                    key={task.id}
                    draggable={taskCanMove && !pendingTaskIds.has(task.id)}
                    onDragStart={(event) => {
                      if (!taskCanMove) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(task.id));
                      setDraggedTaskId(task.id);
                    }}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setHoveredColumn(null);
                    }}
                    className={`surface-card rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm group ${taskCanMove ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedTaskId === task.id ? 'opacity-50' : ''} ${pendingTaskIds.has(task.id) ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`min-w-0 text-sm font-semibold ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 ring-1 ring-gray-200" title={`Priority: ${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{task.description}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {showProject && task.project_name && (
                        <Link href={`/projects/${task.project_id}`} className="max-w-full truncate rounded-md bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800 hover:bg-sky-100">
                          {task.project_name}
                        </Link>
                      )}
                      {task.assignee_name && <span className="max-w-full truncate text-[11px] text-gray-500">Assigned to {task.assignee_name}</span>}
                      {task.due_date && <span className="text-[11px] text-gray-500">Due {formatDate(task.due_date)}</span>}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      <div className="min-w-0 flex-1">
                        <Select
                          id={`task-board-status-${task.id}`}
                          aria-label={`Move ${task.title}`}
                          value={task.status}
                          options={statusOptions}
                          disabled={statusOptions.length < 2 || pendingTaskIds.has(task.id)}
                          onChange={(event) => void moveTask(task, event.target.value as TaskStatus)}
                          className="!h-9 !rounded-lg !py-1 !text-xs"
                        />
                      </div>
                      {(onEditTask || onDeleteTask) && canEditTask && (
                        <div className="flex shrink-0 items-center gap-1">
                          {onEditTask && <button type="button" onClick={() => onEditTask(task)} className="rounded-lg px-2 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900">Edit</button>}
                          {onDeleteTask && <button type="button" onClick={() => onDeleteTask(task)} aria-label={`Delete ${task.title}`} className="rounded-lg px-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              {columnTasks.length === 0 && (
                <div className={`rounded-xl border border-dashed px-3 py-6 text-center text-xs text-gray-400 ${hoveredColumn === column.status ? 'border-sky-300' : 'border-gray-300'}`}>
                  {canDropHere ? 'Drop a task here' : 'No tasks yet'}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
