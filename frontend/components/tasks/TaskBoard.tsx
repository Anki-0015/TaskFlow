'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Task } from '@/types';
import { Select } from '@/components/ui/index';
import Avatar from '@/components/ui/Avatar';
import { formatDate } from '@/utils/date';
import { canManageTask } from '@/utils/taskPermissions';
import {
  BOARD_COLUMNS,
  BoardSort,
  DueState,
  SORT_OPTIONS,
  STATUS_LABELS,
  TaskStatus,
  canMoveTo,
  getDueState,
  isForward,
  moveActionLabel,
  moveTargets,
  sortTasks,
  todayKey,
} from '@/utils/taskBoard';

const COMPLETED_PREVIEW_LIMIT = 6;
const SORT_STORAGE_KEY = 'taskflow-board-sort';

type AssigneeFilter = '' | 'me' | 'unassigned' | `user:${number}`;
type DueFilter = '' | 'overdue' | 'soon';

interface TaskBoardProps {
  tasks: Task[];
  onMoveTask: (task: Task, status: TaskStatus) => Promise<void>;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  /** Shows an "Add task" action in the To Do column. */
  onAddTask?: () => void;
  showProject?: boolean;
  /** Search and priority filters. Turn off when the page already provides them. */
  showFilters?: boolean;
  currentUserId?: number;
}

function readStoredSort(): BoardSort {
  try {
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (SORT_OPTIONS.some((option) => option.value === stored)) return stored as BoardSort;
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }
  return 'priority';
}

function Icon({ path, className = 'h-3.5 w-3.5' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  left: 'M12 5l-5 5 5 5',
  right: 'M8 5l5 5-5 5',
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  edit: 'M13.5 3.5l3 3L7 16H4v-3z',
  trash: 'M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10',
  plus: 'M10 4v12M4 10h12',
  calendar: 'M4 6h12v10H4zM4 9h12M7 3v3M13 3v3',
  search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM17 17l-3.5-3.5',
};

const DUE_LABEL: Record<DueState, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  soon: 'Due',
  later: 'Due',
  none: '',
};

export default function TaskBoard({
  tasks,
  onMoveTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
  showProject = false,
  showFilters = true,
  currentUserId,
}: TaskBoardProps) {
  const [today] = useState(todayKey);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<TaskStatus | null>(null);
  const [pendingMoves, setPendingMoves] = useState<Record<number, TaskStatus>>({});
  const [announcement, setAnnouncement] = useState('');

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState<AssigneeFilter>('');
  const [dueFilter, setDueFilter] = useState<DueFilter>('');
  const [sort, setSort] = useState<BoardSort>(readStoredSort);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // Pending moves are shown immediately; the parent's state confirms or reverts them.
  const boardTasks = useMemo(
    () => tasks.map((task) => (pendingMoves[task.id] ? { ...task, status: pendingMoves[task.id] } : task)),
    [tasks, pendingMoves],
  );

  const assigneeOptions = useMemo(() => {
    const people = new Map<number, string>();
    tasks.forEach((task) => {
      if (task.assigned_to && task.assignee_name && task.assigned_to !== currentUserId) {
        people.set(task.assigned_to, task.assignee_name);
      }
    });
    return [
      { value: '', label: 'Everyone' },
      ...(currentUserId ? [{ value: 'me', label: 'Assigned to me' }] : []),
      { value: 'unassigned', label: 'Unassigned' },
      ...[...people.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ value: `user:${id}`, label: name })),
    ];
  }, [tasks, currentUserId]);

  const dueCounts = useMemo(() => {
    let overdue = 0;
    let soon = 0;
    boardTasks.forEach((task) => {
      const state = getDueState(task, today);
      if (state === 'overdue') overdue++;
      else if (state === 'today' || state === 'soon') soon++;
    });
    return { overdue, soon };
  }, [boardTasks, today]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return boardTasks.filter((task) => {
      if (query && !`${task.title} ${task.description || ''} ${task.assignee_name || ''}`.toLowerCase().includes(query)) return false;
      if (priority && task.priority !== priority) return false;
      if (assignee === 'me' && task.assigned_to !== currentUserId) return false;
      if (assignee === 'unassigned' && task.assigned_to) return false;
      if (assignee.startsWith('user:') && task.assigned_to !== Number(assignee.slice(5))) return false;
      if (dueFilter) {
        const state = getDueState(task, today);
        if (dueFilter === 'overdue' && state !== 'overdue') return false;
        if (dueFilter === 'soon' && state !== 'today' && state !== 'soon') return false;
      }
      return true;
    });
  }, [boardTasks, search, priority, assignee, dueFilter, currentUserId, today]);

  const filtersActive = Boolean(search.trim() || priority || assignee || dueFilter);
  const statusCounts = BOARD_COLUMNS.map((column) => boardTasks.filter((task) => task.status === column.status).length);

  function clearFilters() {
    setSearch('');
    setPriority('');
    setAssignee('');
    setDueFilter('');
  }

  function changeSort(next: BoardSort) {
    setSort(next);
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, next);
    } catch {
      // Ignore unavailable storage.
    }
  }

  async function moveTask(task: Task, status: TaskStatus) {
    if (!canMoveTo(task, status) || pendingMoves[task.id]) return;
    setPendingMoves((current) => ({ ...current, [task.id]: status }));
    setAnnouncement(`Moving ${task.title} to ${STATUS_LABELS[status]}.`);
    try {
      await onMoveTask(task, status);
    } finally {
      setPendingMoves((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  }

  function originalTask(id: number) {
    return tasks.find((task) => task.id === id);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="board-toolbar flex flex-col gap-3 rounded-2xl border p-3 sm:p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {showFilters && (
            <label className="board-search relative flex-1">
              <span className="sr-only">Search board</span>
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Icon path={ICONS.search} className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks or people…"
                className="field-control h-10 w-full rounded-xl border pl-9 pr-3 text-sm focus:outline-none"
              />
            </label>
          )}
          <div className={`grid grid-cols-2 gap-2 sm:flex sm:flex-wrap ${showFilters ? '' : 'lg:flex-1'}`}>
            {showFilters && (
              <Select
                id="board-filter-priority"
                aria-label="Filter by priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                options={[
                  { value: '', label: 'Any priority' },
                  { value: 'HIGH', label: 'High priority' },
                  { value: 'MEDIUM', label: 'Medium priority' },
                  { value: 'LOW', label: 'Low priority' },
                ]}
                className="!h-10 !text-xs sm:!w-40"
              />
            )}
            <Select
              id="board-filter-assignee"
              aria-label="Filter by assignee"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value as AssigneeFilter)}
              options={assigneeOptions}
              className="!h-10 !text-xs sm:!w-44"
            />
            <Select
              id="board-sort"
              aria-label="Sort tasks"
              value={sort}
              onChange={(event) => changeSort(event.target.value as BoardSort)}
              options={SORT_OPTIONS}
              className="!h-10 !text-xs sm:!w-40"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick filters">
            <button
              type="button"
              aria-pressed={dueFilter === 'overdue'}
              disabled={!dueCounts.overdue && dueFilter !== 'overdue'}
              onClick={() => setDueFilter((current) => (current === 'overdue' ? '' : 'overdue'))}
              className="board-chip board-chip-danger"
            >
              <span className="board-chip-dot" aria-hidden="true" />
              {dueCounts.overdue} overdue
            </button>
            <button
              type="button"
              aria-pressed={dueFilter === 'soon'}
              disabled={!dueCounts.soon && dueFilter !== 'soon'}
              onClick={() => setDueFilter((current) => (current === 'soon' ? '' : 'soon'))}
              className="board-chip board-chip-warning"
            >
              <span className="board-chip-dot" aria-hidden="true" />
              {dueCounts.soon} due in 3 days
            </button>
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="board-chip">
                Clear filters
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500" aria-live="polite">
            {filtersActive
              ? `Showing ${filteredTasks.length} of ${boardTasks.length} tasks`
              : `${boardTasks.length} task${boardTasks.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {boardTasks.length > 0 && (
          <div className="board-progress flex h-1.5 overflow-hidden rounded-full" role="img" aria-label={BOARD_COLUMNS.map((column, i) => `${statusCounts[i]} ${column.label}`).join(', ')}>
            {BOARD_COLUMNS.map((column, i) => statusCounts[i] > 0 && (
              <span
                key={column.status}
                className="board-progress-segment h-full transition-all duration-300"
                data-status={column.status}
                style={{ width: `${(statusCounts[i] / boardTasks.length) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="assertive">{announcement}</p>

      {/* Columns */}
      <div
        className="board-columns -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0"
        aria-label="Tasks by status"
      >
        {BOARD_COLUMNS.map((column) => {
          const columnTasks = sortTasks(filteredTasks.filter((task) => task.status === column.status), sort);
          const total = boardTasks.filter((task) => task.status === column.status).length;
          const canCollapse = column.status === 'COMPLETED' && !filtersActive && columnTasks.length > COMPLETED_PREVIEW_LIMIT;
          const visibleTasks = canCollapse && !showAllCompleted ? columnTasks.slice(0, COMPLETED_PREVIEW_LIMIT) : columnTasks;
          const dropAllowed = draggedTask ? canMoveTo(draggedTask, column.status) : false;
          const dropState = !draggedTask
            ? undefined
            : draggedTask.status === column.status
              ? 'origin'
              : dropAllowed
                ? hoveredColumn === column.status ? 'active' : 'allowed'
                : 'blocked';

          return (
            <section
              key={column.status}
              aria-labelledby={`board-column-${column.status}`}
              data-status={column.status}
              data-drop={dropState}
              onDragOver={(event) => {
                if (!dropAllowed) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (hoveredColumn !== column.status) setHoveredColumn(column.status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoveredColumn(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const task = draggedTask ?? originalTask(Number(event.dataTransfer.getData('text/plain')));
                setDraggedTask(null);
                setHoveredColumn(null);
                if (task) void moveTask(task, column.status);
              }}
              className="board-column flex w-[85%] min-w-[260px] shrink-0 snap-start flex-col rounded-2xl border p-3 transition-all duration-150 md:w-auto md:min-w-0"
            >
              <header className="mb-3 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <h3 id={`board-column-${column.status}`} className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="board-column-dot h-2.5 w-2.5 rounded-full" aria-hidden="true" />
                    {column.label}
                    <span className="board-count rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      {filtersActive && columnTasks.length !== total ? `${columnTasks.length}/${total}` : total}
                    </span>
                  </h3>
                  <p className="mt-0.5 pl-[18px] text-[11px] text-gray-500">{column.hint}</p>
                </div>
                {column.status === 'TODO' && onAddTask && (
                  <button
                    type="button"
                    onClick={onAddTask}
                    className="board-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    aria-label="Add task to To Do"
                    title="Add task"
                  >
                    <Icon path={ICONS.plus} className="h-4 w-4" />
                  </button>
                )}
              </header>

              <div className="flex flex-1 flex-col gap-2.5">
                {visibleTasks.map((task) => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    today={today}
                    pending={Boolean(pendingMoves[task.id])}
                    dragging={draggedTask?.id === task.id}
                    showProject={showProject}
                    onDragStart={() => setDraggedTask(originalTask(task.id) ?? task)}
                    onDragEnd={() => { setDraggedTask(null); setHoveredColumn(null); }}
                    onMove={(status) => void moveTask(task, status)}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))}

                {canCollapse && (
                  <button
                    type="button"
                    onClick={() => setShowAllCompleted((value) => !value)}
                    className="board-chip justify-center"
                    aria-expanded={showAllCompleted}
                  >
                    {showAllCompleted ? 'Show fewer' : `Show ${columnTasks.length - COMPLETED_PREVIEW_LIMIT} more`}
                  </button>
                )}

                {columnTasks.length === 0 && (
                  <div className="board-empty flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-8 text-center text-xs text-gray-500">
                    {dropState === 'allowed' || dropState === 'active'
                      ? 'Drop here'
                      : filtersActive && total > 0
                        ? 'No tasks match your filters'
                        : column.status === 'TODO'
                          ? 'Nothing waiting'
                          : column.status === 'IN_PROGRESS'
                            ? 'Nothing in progress'
                            : 'No completed tasks yet'}
                    {column.status === 'TODO' && onAddTask && !draggedTask && !filtersActive && (
                      <button type="button" onClick={onAddTask} className="board-chip">
                        <Icon path={ICONS.plus} /> Add task
                      </button>
                    )}
                  </div>
                )}

                {dropState === 'blocked' && (
                  <p className="board-blocked-note rounded-lg px-2 py-1.5 text-center text-[11px] font-medium">
                    You can’t move this task here
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface BoardCardProps {
  task: Task;
  today: string;
  pending: boolean;
  dragging: boolean;
  showProject: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (status: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

function BoardCard({ task, today, pending, dragging, showProject, onDragStart, onDragEnd, onMove, onEdit, onDelete }: BoardCardProps) {
  const targets = pending ? [] : moveTargets(task);
  const draggable = targets.length > 0;
  const canEdit = canManageTask(task);
  const dueState = getDueState(task, today);
  const done = task.status === 'COMPLETED';

  return (
    <article
      draggable={draggable}
      aria-busy={pending}
      data-priority={task.priority}
      onDragStart={(event) => {
        if (!draggable) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(task.id));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`board-card group relative rounded-xl border p-3.5 pl-4 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging ? 'opacity-40' : ''} ${pending ? 'board-card-pending' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {onEdit && canEdit ? (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className={`block w-full text-left text-sm font-semibold leading-snug hover:underline ${done ? 'text-gray-500 line-through' : 'text-gray-900'}`}
            >
              {task.title}
            </button>
          ) : (
            <p className={`text-sm font-semibold leading-snug ${done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.title}</p>
          )}
        </div>
        <span className="board-priority shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" title={`${task.priority.toLowerCase()} priority`}>
          {task.priority === 'MEDIUM' ? 'Med' : task.priority.toLowerCase()}
        </span>
      </div>

      {task.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500">{task.description}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {showProject && task.project_name && (
          <Link
            href={`/projects/${task.project_id}`}
            draggable={false}
            className="board-project-link max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-medium"
          >
            {task.project_name}
          </Link>
        )}
        {task.due_date && (
          <span className="board-due inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium" data-due={dueState}>
            <Icon path={ICONS.calendar} className="h-3 w-3" />
            {dueState === 'today' ? DUE_LABEL.today : `${DUE_LABEL[dueState]} ${formatDate(task.due_date)}`}
          </span>
        )}
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[11px] text-gray-500">
          {task.assignee_name ? (
            <>
              <Avatar name={task.assignee_name} size="xs" />
              <span className="truncate" title={`Assigned to ${task.assignee_name}`}>{task.assignee_name}</span>
            </>
          ) : (
            <span className="italic">Unassigned</span>
          )}
        </span>
      </div>

      {(targets.length > 0 || pending || (canEdit && (onEdit || onDelete))) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
          <div className="-ml-2 flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
            {pending && <span className="ml-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-gray-400" aria-label="Saving" />}
            {targets.map((status) => {
              const forward = isForward(task.status, status);
              const label = moveActionLabel(task.status, status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onMove(status)}
                  className={`board-move-button inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[11px] font-semibold ${forward ? 'board-move-forward' : ''}`}
                  data-target={status}
                  aria-label={`Move ${task.title} to ${STATUS_LABELS[status]}`}
                  title={`Move to ${STATUS_LABELS[status]}`}
                >
                  {!forward && <Icon path={ICONS.left} className="h-3 w-3" />}
                  {label}
                  {forward && <Icon path={status === 'COMPLETED' ? ICONS.check : ICONS.right} className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="board-icon-button flex h-7 w-7 items-center justify-center rounded-lg sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                aria-label={`Edit ${task.title}`}
                title="Edit"
              >
                <Icon path={ICONS.edit} />
              </button>
            )}
            {canEdit && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(task)}
                className="board-icon-button board-icon-danger flex h-7 w-7 items-center justify-center rounded-lg sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                aria-label={`Delete ${task.title}`}
                title="Delete"
              >
                <Icon path={ICONS.trash} />
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
