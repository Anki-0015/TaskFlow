import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { JwtPayload } from '../models/types';

export const AUTH_COOKIE_NAME = 'taskflow_session';

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return undefined;
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
  if (!token) {
    res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    return;
  }

  let decoded: JwtPayload;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured.');
    decoded = jwt.verify(token, secret) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    return;
  }
  if (!Number.isSafeInteger(decoded.id) || decoded.id <= 0 || !Number.isSafeInteger(decoded.session_version)) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    return;
  }

  try {
    const [users] = await pool.query<(RowDataPacket & { session_version: number; role: string })[]>(
      'SELECT session_version, role FROM users WHERE id = ?',
      [decoded.id],
    );
    if (!users.length || Number(users[0].session_version) !== decoded.session_version || users[0].role !== decoded.role) {
      res.status(401).json({ success: false, message: 'Invalid or expired token.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Administrator access is required.' });
    return;
  }
  next();
}
