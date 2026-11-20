import { Request, Response, NextFunction, RequestHandler } from 'express';

/** Conservative headers for a JSON-only API. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/** Prevents browsers and proxies from caching authenticated API responses. */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Requests allowed per key within the window. */
  max: number;
  message: string;
  /** Bucket name so separate limiters do not share counters. */
  name: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 * Suitable for a single API instance; use a shared store (e.g. Redis) when scaling horizontally.
 */
export function rateLimit({ windowMs, max, message, name }: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.max(windowMs, 60_000));
  sweep.unref();

  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true' && process.env.NODE_ENV !== 'production') {
      next();
      return;
    }
    const key = `${name}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ success: false, message });
      return;
    }
    next();
  };
}

export const authRateLimit = rateLimit({
  name: 'auth',
  windowMs: 15 * 60_000,
  max: 20,
  message: 'Too many attempts. Please wait a few minutes and try again.',
});

export const apiRateLimit = rateLimit({
  name: 'api',
  windowMs: 60_000,
  max: 300,
  message: 'Too many requests. Please slow down and try again shortly.',
});
