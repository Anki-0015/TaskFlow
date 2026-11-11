import { Request, Response } from 'express';
import * as ProjectService from '../services/project.service';

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD'];
const INITIAL_PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD'];
const MAX_PROJECT_NAME_LENGTH = 150;
const MAX_PROJECT_DESCRIPTION_LENGTH = 20_000;

function validateProjectFields(input: unknown, creating: boolean): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Request body must be a JSON object.';
  const body = input as Record<string, unknown>;
  if (creating || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return 'Project name is required.';
    if (body.name.trim().length > MAX_PROJECT_NAME_LENGTH) return `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer.`;
  }
  if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > MAX_PROJECT_DESCRIPTION_LENGTH)) {
    return `Project description must be ${MAX_PROJECT_DESCRIPTION_LENGTH} characters or fewer.`;
  }
  for (const field of ['start_date', 'end_date'] as const) {
    const value = body[field];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${field === 'start_date' ? 'Start' : 'End'} date must use YYYY-MM-DD format.`;
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return `${field === 'start_date' ? 'Start' : 'End'} date must be a valid date.`;
    }
  }
  if (body.start_date && body.end_date && String(body.end_date) <= String(body.start_date)) return 'The end date must be after the start date.';
  if (body.status !== undefined) {
    const allowed = creating ? INITIAL_PROJECT_STATUSES : PROJECT_STATUSES;
    if (typeof body.status !== 'string' || !allowed.includes(body.status)) {
      return creating ? 'New projects must start as Planning, Active, or On Hold.' : 'Choose a valid project status.';
    }
  }
  return null;
}

function httpStatusForProjectError(error: unknown): number {
  if (error && typeof error === 'object' && 'code' in error) return 500;
  const message = error instanceof Error ? error.message : '';
  if (message === 'Project not found.') return 404;
  if (message.startsWith('Only a project manager') || message.startsWith('Only the project owner')) return 403;
  return 400;
}

function publicProjectErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'code' in error) return fallback;
  return error instanceof Error ? error.message : fallback;
}

function parsePositiveId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /api/projects
export async function getProjects(req: Request, res: Response): Promise<void> {
  try {
    const projects = await ProjectService.getProjects(req.user!.id);
    res.status(200).json({ success: true, data: projects });
  } catch (err: unknown) {
    console.error('Failed to fetch projects:', err);
    const code = (err as { code?: string })?.code;
    if (code === 'ER_NO_SUCH_TABLE') {
      res.status(503).json({
        success: false,
        message: 'The project database is missing a required table. Run `npm run db:setup` from the backend folder, then try again.',
      });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to fetch projects.' });
  }
}

// GET /api/projects/:id
export async function getProjectById(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid project id is required.' }); return; }
  try {
    const project = await ProjectService.getProjectById(id, req.user!.id);
    res.status(200).json({ success: true, data: project });
  } catch (err: unknown) {
    res.status(httpStatusForProjectError(err)).json({
      success: false,
      message: publicProjectErrorMessage(err, 'Could not load this project.'),
    });
  }
}

// POST /api/projects
export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    const fieldsError = validateProjectFields(req.body || {}, true);
    if (fieldsError) {
      res.status(400).json({ success: false, message: fieldsError });
      return;
    }
    const { name, description, start_date, end_date, status } = req.body;
    const project = await ProjectService.createProject(
      { name, description, start_date, end_date, status },
      req.user!.id
    );
    res.status(201).json({ success: true, message: 'Project created.', data: project });
  } catch (err: unknown) {
    const status = httpStatusForProjectError(err);
    res.status(status).json({ success: false, message: publicProjectErrorMessage(err, 'Failed to create project.') });
  }
}

// PUT /api/projects/:id
export async function updateProject(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid project id is required.' }); return; }
  const fieldsError = validateProjectFields(req.body || {}, false);
  if (fieldsError) {
    res.status(400).json({ success: false, message: fieldsError });
    return;
  }
  try {
    const project = await ProjectService.updateProject(
      id,
      req.body,
      req.user!.id
    );
    res.status(200).json({ success: true, message: 'Project updated.', data: project });
  } catch (err: unknown) {
    res.status(httpStatusForProjectError(err)).json({
      success: false,
      message: publicProjectErrorMessage(err, 'Failed to update project.'),
    });
  }
}

// DELETE /api/projects/:id
export async function deleteProject(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid project id is required.' }); return; }
  try {
    await ProjectService.deleteProject(id, req.user!.id);
    res.status(200).json({ success: true, message: 'Project deleted.' });
  } catch (err: unknown) {
    res.status(httpStatusForProjectError(err)).json({
      success: false,
      message: publicProjectErrorMessage(err, 'Failed to delete project.'),
    });
  }
}

// GET /api/projects/stats/dashboard
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await ProjectService.getDashboardStats(req.user!.id);
    res.status(200).json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
}

export async function getProjectMembers(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid project id is required.' }); return; }
  try { const data = await ProjectService.getProjectMembers(id, req.user!.id); res.json({ success: true, data }); }
  catch (err) { res.status(httpStatusForProjectError(err)).json({ success: false, message: publicProjectErrorMessage(err, 'Could not load members.') }); }
}

export async function addProjectMember(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: 'A valid project id is required.' }); return; }
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const requestedRole = req.body?.role;
  if (requestedRole !== undefined && !['MANAGER', 'MEMBER', 'VIEWER'].includes(requestedRole)) {
    res.status(400).json({ success: false, message: 'Choose a valid project role.' }); return;
  }
  const role = requestedRole || 'MEMBER';
  if (!email) { res.status(400).json({ success: false, message: 'Email is required.' }); return; }
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ success: false, message: 'Enter a valid email address.' }); return; }
  try { const data = await ProjectService.addProjectMember(id, req.user!.id, email, role); res.status(201).json({ success: true, data }); }
  catch (err) { res.status(httpStatusForProjectError(err)).json({ success: false, message: publicProjectErrorMessage(err, 'Could not add member.') }); }
}

export async function getProjectInvitations(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProjectService.getProjectInvitations(req.user!.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load project invitations.' });
  }
}

export async function respondToProjectInvitation(req: Request, res: Response): Promise<void> {
  const invitationId = parsePositiveId(req.params.invitationId);
  if (!invitationId) { res.status(400).json({ success: false, message: 'A valid invitation id is required.' }); return; }
  const action = req.body?.action;
  if (action !== 'ACCEPT' && action !== 'DECLINE') {
    res.status(400).json({ success: false, message: 'Choose whether to accept or decline this invitation.' });
    return;
  }
  try {
    const data = await ProjectService.respondToProjectInvitation(invitationId, req.user!.id, action === 'ACCEPT');
    res.json({ success: true, data });
  } catch (err) {
    res.status(err && typeof err === 'object' && 'code' in err ? 500 : 400).json({
      success: false,
      message: publicProjectErrorMessage(err, 'Could not respond to invitation.'),
    });
  }
}

export async function removeProjectMember(req: Request, res: Response): Promise<void> {
  const projectId = parsePositiveId(req.params.id);
  const memberId = parsePositiveId(req.params.memberId);
  if (!projectId || !memberId) { res.status(400).json({ success: false, message: 'Valid project and member ids are required.' }); return; }
  try {
    await ProjectService.removeProjectMember(projectId, req.user!.id, memberId);
    res.json({ success: true, message: 'Member removed.' });
  } catch (err) {
    res.status(httpStatusForProjectError(err)).json({
      success: false,
      message: publicProjectErrorMessage(err, 'Could not remove member.'),
    });
  }
}
