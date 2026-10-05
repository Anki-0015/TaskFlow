import { Request, Response } from 'express';
import * as TaskService from '../services/task.service';

// GET /api/tasks
export async function getTasks(req: Request, res: Response): Promise<void> {
  try {
    const { status, priority, projectId, search } = req.query as Record<string, string>;
    const tasks = await TaskService.getTasks(req.user!.id, { status, priority, projectId, search });
    res.status(200).json({ success: true, data: tasks });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch tasks.' });
  }
}

// GET /api/tasks/:id
export async function getTaskById(req: Request, res: Response): Promise<void> {
  try {
    const task = await TaskService.getTaskById(Number(req.params.id), req.user!.id);
    res.status(200).json({ success: true, data: task });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Not found.';
    res.status(404).json({ success: false, message: msg });
  }
}

// POST /api/tasks
export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const { project_id, title } = req.body;
    if (!project_id || !title) {
      res.status(400).json({ success: false, message: 'project_id and title are required.' });
      return;
    }
    const task = await TaskService.createTask(req.body, req.user!.id);
    res.status(201).json({ success: true, message: 'Task created.', data: task });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create task.';
    res.status(500).json({ success: false, message: msg });
  }
}

// PUT /api/tasks/:id
export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await TaskService.updateTask(Number(req.params.id), req.body, req.user!.id);
    res.status(200).json({ success: true, message: 'Task updated.', data: task });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update task.';
    res.status(400).json({ success: false, message: msg });
  }
}

// DELETE /api/tasks/:id
export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    await TaskService.deleteTask(Number(req.params.id), req.user!.id);
    res.status(200).json({ success: true, message: 'Task deleted.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete task.';
    res.status(400).json({ success: false, message: msg });
  }
}

// PATCH /api/tasks/:id/status
export async function patchTaskStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.body;
    const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }
    const task = await TaskService.patchTaskStatus(Number(req.params.id), status, req.user!.id);
    res.status(200).json({ success: true, message: 'Task status updated.', data: task });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update task status.';
    res.status(400).json({ success: false, message: msg });
  }
}
