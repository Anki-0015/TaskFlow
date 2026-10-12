import { Request, Response } from 'express';
import * as ProjectService from '../services/project.service';

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
  try {
    const project = await ProjectService.getProjectById(Number(req.params.id), req.user!.id);
    res.status(200).json({ success: true, data: project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Not found.';
    res.status(404).json({ success: false, message: msg });
  }
}

// POST /api/projects
export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, start_date, end_date, status } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Project name is required.' });
      return;
    }
    const project = await ProjectService.createProject(
      { name, description, start_date, end_date, status },
      req.user!.id
    );
    res.status(201).json({ success: true, message: 'Project created.', data: project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create project.';
    res.status(500).json({ success: false, message: msg });
  }
}

// PUT /api/projects/:id
export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    const project = await ProjectService.updateProject(
      Number(req.params.id),
      req.body,
      req.user!.id
    );
    res.status(200).json({ success: true, message: 'Project updated.', data: project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update project.';
    res.status(400).json({ success: false, message: msg });
  }
}

// DELETE /api/projects/:id
export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    await ProjectService.deleteProject(Number(req.params.id), req.user!.id);
    res.status(200).json({ success: true, message: 'Project deleted.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete project.';
    res.status(400).json({ success: false, message: msg });
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
  try { const data = await ProjectService.getProjectMembers(Number(req.params.id), req.user!.id); res.json({ success: true, data }); }
  catch (err) { res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Could not load members.' }); }
}

export async function addProjectMember(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = ['MANAGER', 'MEMBER', 'VIEWER'].includes(req.body?.role) ? req.body.role : 'MEMBER';
  if (!email) { res.status(400).json({ success: false, message: 'Email is required.' }); return; }
  try { const data = await ProjectService.addProjectMember(Number(req.params.id), req.user!.id, email, role); res.status(201).json({ success: true, data }); }
  catch (err) { res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Could not add member.' }); }
}

export async function removeProjectMember(req: Request, res: Response): Promise<void> {
  try {
    await ProjectService.removeProjectMember(Number(req.params.id), req.user!.id, Number(req.params.memberId));
    res.json({ success: true, message: 'Member removed.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Could not remove member.' });
  }
}
