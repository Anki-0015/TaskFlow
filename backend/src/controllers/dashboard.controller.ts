import { Request, Response } from 'express';
import * as DashboardService from '../services/dashboard.service';

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// GET /api/dashboard?today=YYYY-MM-DD&utcOffset=330
export async function getDashboard(req: Request, res: Response): Promise<void> {
  const rawToday = req.query.today;
  const rawOffset = req.query.utcOffset;
  if ((rawToday !== undefined && typeof rawToday !== 'string') || (rawOffset !== undefined && typeof rawOffset !== 'string')) {
    res.status(400).json({ success: false, message: 'Dashboard parameters must be single values.' });
    return;
  }

  const utcOffsetMinutes = rawOffset === undefined ? 0 : Number(rawOffset);
  if (!Number.isInteger(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 14 * 60) {
    res.status(400).json({ success: false, message: 'utcOffset must be a whole number of minutes between -840 and 840.' });
    return;
  }

  const serverToday = new Date(Date.now() + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
  const today = rawToday ?? serverToday;
  if (!isValidDateKey(today)) {
    res.status(400).json({ success: false, message: 'today must be a valid YYYY-MM-DD date.' });
    return;
  }

  try {
    const data = await DashboardService.getDashboard(req.user!.id, { today, utcOffsetMinutes });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard query failed:', (error as { code?: string })?.code || error);
    res.status(500).json({ success: false, message: 'Failed to load the dashboard.' });
  }
}
