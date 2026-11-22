import { Request, Response } from 'express';
import * as AdminService from '../services/admin.service';

function handleAdminError(error: unknown, res: Response, operation: string): void {
  if (error instanceof AdminService.AdminServiceError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }
  const databaseError = error as { code?: string; message?: string };
  console.error(`${operation} failed:`, databaseError.code || databaseError.message || 'Unknown error');
  res.status(500).json({ success: false, message: 'The administrator request could not be completed.' });
}

export async function getOverview(_req: Request, res: Response): Promise<void> {
  try {
    const data = await AdminService.getOverview();
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleAdminError(error, res, 'Admin overview');
  }
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  const rawSearch = req.query.search;
  const rawPage = req.query.page;
  const rawPageSize = req.query.pageSize;
  if ((rawSearch !== undefined && typeof rawSearch !== 'string') ||
      (rawPage !== undefined && typeof rawPage !== 'string') ||
      (rawPageSize !== undefined && typeof rawPageSize !== 'string')) {
    res.status(400).json({ success: false, message: 'Admin user filters must be single values.' });
    return;
  }

  const search = (rawSearch || '').trim();
  const page = rawPage === undefined ? 1 : Number(rawPage);
  const pageSize = rawPageSize === undefined ? 20 : Number(rawPageSize);
  if (search.length > 100 || !Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
      !Number.isSafeInteger((page - 1) * pageSize)) {
    res.status(400).json({ success: false, message: 'Use a search up to 100 characters, page 1 or higher, and pageSize from 1 to 100.' });
    return;
  }

  try {
    const data = await AdminService.listUsers({ search, page, pageSize });
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleAdminError(error, res, 'Admin user list');
  }
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const rawId = req.params.id;
  if (typeof rawId !== 'string' || !/^\d+$/.test(rawId)) {
    res.status(400).json({ success: false, message: 'Provide a valid account ID and role.' });
    return;
  }
  const id = Number(rawId);
  const role = req.body?.role;
  if (!Number.isSafeInteger(id) || id <= 0 || (role !== 'admin' && role !== 'member')) {
    res.status(400).json({ success: false, message: 'Provide a valid account ID and role.' });
    return;
  }

  try {
    const data = await AdminService.updateUserRole(req.user!.id, req.user!.session_version, id, role);
    res.status(200).json({
      success: true,
      message: 'Account role updated. The account must sign in again for the change to take effect.',
      data,
    });
  } catch (error) {
    handleAdminError(error, res, 'Admin role update');
  }
}
