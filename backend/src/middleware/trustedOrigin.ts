import { Request, Response, NextFunction } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (!origin || origin !== allowedOrigin) {
    res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
    return;
  }
  next();
}
