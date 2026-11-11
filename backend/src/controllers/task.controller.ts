import { Request, Response } from 'express';
import * as TaskService from '../services/task.service';

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function parsePositiveId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validateTaskFields(input: unknown, creating: boolean): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Request body must be a JSON object.';
  const body = input as Record<string, unknown>;
  if (creating && !isPositiveSafeInteger(body.project_id)) return 'A valid project_id is required.';
  if (creating || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) return 'Task title is required.';
    if (body.title.trim().length > 200) return 'Task title must be 200 characters or fewer.';
  }
  if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 20_000)) {
    return 'Task description must be 20,000 characters or fewer.';
  }
  if (body.priority !== undefined && (typeof body.priority !== 'string' || !TASK_PRIORITIES.includes(body.priority))) {
    return 'Choose a valid task priority.';
  }
  if (body.status !== undefined && (typeof body.status !== 'string' || !TASK_STATUSES.includes(body.status))) {
    return `Status must be one of: ${TASK_STATUSES.join(', ')}.`;
  }
  if (creating && body.status !== undefined && body.status !== 'TODO') return 'New tasks must start as To Do.';
  if (body.project_id !== undefined && !isPositiveSafeInteger(body.project_id)) return 'A valid project_id is required.';
  if (body.assigned_to !== undefined && body.assigned_to !== null && !isPositiveSafeInteger(body.assigned_to)) {
    return 'Choose a valid task assignee.';
  }
  if (body.due_date !== undefined && body.due_date !== null && body.due_date !== '') {
    if (typeof body.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) return 'Due date must use YYYY-MM-DD format.';
    const date = new Date(`${body.due_date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== body.due_date) return 'Due date must be a valid date.';
  }
  return null;
}

function taskErrorStatus(error: unknown): number {
  if ((error as { code?: string })?.code) return 500;
  const message = error instanceof Error ? error.message : '';
  if (message === 'Task not found.' || message === 'Project not found.') return 404;
  if (/permission|viewer|member|manager|assigned to project|cannot modify/i.test(message)) return 403;
  return 400;
}

function publicTaskErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'code' in error) return fallback;
  return error instanceof Error ? error.message : fallback;
}

// GET /api/tasks
export async function getTasks(req: Request, res: Response): Promise<void> {
  try {
    const rawFilters = ['status', 'priority', 'projectId', 'search'].map((key) => req.query[key]);
    if (rawFilters.some((value) => value !== undefined && typeof value !== 'string')) {
      res.status(400).json({ success: false, message: 'Task filters must be single text values.' });
      return;
    }
    const [status, priority, projectId, search] = rawFilters.map((value) => typeof value === 'string' ? value : undefined);
    if (status && !TASK_STATUSES.includes(status)) { res.status(400).json({ success: false, message: 'Choose a valid task status.' }); return; }
    if (priority && !TASK_PRIORITIES.includes(priority)) { res.status(400).json({ success: false, message: 'Choose a valid task priority.' }); return; }
    if (projectId && !parsePositiveId(projectId)) { res.status(400).json({ success: false, message: 'A valid projectId is required.' }); return; }
    if (search && search.length > 100) { res.status(400).json({ success: false, message: 'Search must be 100 characters or fewer.' }); return; }
    const tasks = await TaskService.getTasks(req.user!.id, { status, priority, projectId, search });
    res.status(200).json({ success: true, data: tasks });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch tasks.' });
  }
}

// GET /api/tasks/:id
export async function getTaskById(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid task id is required.' }); return; }
  try {
    const task = await TaskService.getTaskById(id, req.user!.id);
    res.status(200).json({ success: true, data: task });
  } catch (err: unknown) {
    res.status(taskErrorStatus(err)).json({
      success: false,
      message: publicTaskErrorMessage(err, 'Could not load this task.'),
    });
  }
}

// POST /api/tasks
export async function createTask(req: Request, res: Response): Promise<void> {
  const fieldsError = validateTaskFields(req.body || {}, true);
  if (fieldsError) { res.status(400).json({ success: false, message: fieldsError }); return; }
  try {
    const task = await TaskService.createTask(req.body, req.user!.id);
    res.status(201).json({ success: true, message: 'Task created.', data: task });
  } catch (err: unknown) {
    res.status(taskErrorStatus(err)).json({
      success: false,
      message: publicTaskErrorMessage(err, 'Failed to create task.'),
    });
  }
}

// PUT /api/tasks/:id
export async function updateTask(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid task id is required.' }); return; }
  const fieldsError = validateTaskFields(req.body || {}, false);
  if (fieldsError) { res.status(400).json({ success: false, message: fieldsError }); return; }
  try {
    const task = await TaskService.updateTask(id, req.body, req.user!.id);
    res.status(200).json({ success: true, message: 'Task updated.', data: task });
  } catch (err: unknown) {
    res.status(taskErrorStatus(err)).json({
      success: false,
      message: publicTaskErrorMessage(err, 'Failed to update task.'),
    });
  }
}

// DELETE /api/tasks/:id
export async function deleteTask(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid task id is required.' }); return; }
  try {
    await TaskService.deleteTask(id, req.user!.id);
    res.status(200).json({ success: true, message: 'Task deleted.' });
  } catch (err: unknown) {
    res.status(taskErrorStatus(err)).json({
      success: false,
      message: publicTaskErrorMessage(err, 'Failed to delete task.'),
    });
  }
}

// PATCH /api/tasks/:id/status
export async function patchTaskStatus(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid task id is required.' }); return; }
  try {
    const status = req.body?.status;
    const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }
    const task = await TaskService.patchTaskStatus(id, status, req.user!.id);
    res.status(200).json({ success: true, message: 'Task status updated.', data: task });
  } catch (err: unknown) {
    res.status(taskErrorStatus(err)).json({
      success: false,
      message: publicTaskErrorMessage(err, 'Failed to update task status.'),
    });
  }
}
