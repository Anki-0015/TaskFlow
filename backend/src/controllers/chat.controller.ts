import { Request, Response } from 'express';
import * as ChatService from '../services/chat.service';

function getProjectId(req: Request): number | null {
  const projectId = Number(req.params.id);
  return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
}

export async function getProjectMessages(req: Request, res: Response): Promise<void> {
  const projectId = getProjectId(req);
  if (!projectId) {
    res.status(400).json({ success: false, message: 'A valid project id is required.' });
    return;
  }

  const rawAfterId = req.query.afterId;
  let afterId: number | undefined;
  if (rawAfterId !== undefined) {
    if (typeof rawAfterId !== 'string' || !/^\d+$/.test(rawAfterId)) {
      res.status(400).json({ success: false, message: 'afterId must be a non-negative integer.' });
      return;
    }
    afterId = Number(rawAfterId);
  }

  try {
    const messages = await ChatService.getProjectMessages(projectId, req.user!.id, afterId);
    res.status(200).json({ success: true, data: messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not load project messages.';
    if ((err as { code?: string })?.code === 'ER_NO_SUCH_TABLE') {
      res.status(503).json({
        success: false,
        message: 'Project chat is not initialized in this database. Run `npm run db:setup` from the backend folder.',
      });
      return;
    }
    res.status(message === 'Project not found.' ? 404 : 500).json({ success: false, message });
  }
}

export async function sendProjectMessage(req: Request, res: Response): Promise<void> {
  const projectId = getProjectId(req);
  if (!projectId) {
    res.status(400).json({ success: false, message: 'A valid project id is required.' });
    return;
  }

  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body) {
    res.status(400).json({ success: false, message: 'Write a message before sending.' });
    return;
  }
  if (body.length > 2000) {
    res.status(400).json({ success: false, message: 'Messages must be 2,000 characters or fewer.' });
    return;
  }

  try {
    const message = await ChatService.sendProjectMessage(projectId, req.user!.id, body);
    res.status(201).json({ success: true, data: message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not send the message.';
    if ((err as { code?: string })?.code === 'ER_NO_SUCH_TABLE') {
      res.status(503).json({
        success: false,
        message: 'Project chat is not initialized in this database. Run `npm run db:setup` from the backend folder.',
      });
      return;
    }
    res.status(message === 'Project not found.' ? 404 : 500).json({ success: false, message });
  }
}
