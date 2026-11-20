import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/database';

import authRoutes    from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes    from './routes/task.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { apiRateLimit, noStore, securityHeaders } from './middleware/security';
import { requireTrustedOrigin } from './middleware/trustedOrigin';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5001;

function validateEnvironment(): void {
  const jwtSecret = process.env.JWT_SECRET;
  const resetSecret = process.env.PASSWORD_RESET_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  if (!resetSecret || resetSecret.length < 32) throw new Error('PASSWORD_RESET_SECRET must be configured with at least 32 characters.');
  if (jwtSecret === resetSecret) throw new Error('JWT_SECRET and PASSWORD_RESET_SECRET must be different.');

  if (process.env.NODE_ENV === 'production') {
    const placeholderPattern = /change[-_ ]?(?:this|in)|replace[-_ ]|your[-_ ]|example/i;
    if (placeholderPattern.test(jwtSecret) || placeholderPattern.test(resetSecret)) {
      throw new Error('Replace example JWT and password-reset secrets before running in production.');
    }
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are required in production.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.GMAIL_USER) ||
        process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '').length !== 16 ||
        placeholderPattern.test(process.env.GMAIL_USER) || placeholderPattern.test(process.env.GMAIL_APP_PASSWORD)) {
      throw new Error('Set a real Gmail address and 16-character Google App Password before running in production.');
    }
    const dbPassword = process.env.DB_PASSWORD;
    if (!dbPassword || dbPassword.length < 16 || placeholderPattern.test(dbPassword)) {
      throw new Error('Set a unique DB_PASSWORD of at least 16 characters before running in production.');
    }
    if (!process.env.DB_USER || process.env.DB_USER.toLowerCase() === 'root') {
      throw new Error('Set a dedicated non-root DB_USER before running in production.');
    }
    const frontendUrl = process.env.FRONTEND_URL || '';
    let validFrontendOrigin = false;
    try {
      const parsedFrontendUrl = new URL(frontendUrl);
      validFrontendOrigin = parsedFrontendUrl.origin === frontendUrl &&
        (parsedFrontendUrl.protocol === 'https:' ||
          (parsedFrontendUrl.protocol === 'http:' && parsedFrontendUrl.hostname === 'localhost'));
    } catch { /* Invalid origin is reported below. */ }
    if (!validFrontendOrigin) {
      throw new Error('Set FRONTEND_URL to the deployed HTTPS frontend origin.');
    }
  }
}

// ── Middleware ────────────────────────────────────────────────────────────
app.disable('x-powered-by');
// Number of reverse proxies in front of the API (needed for correct client IPs in rate limiting).
const trustProxy = Number.parseInt(process.env.TRUST_PROXY || '0', 10);
if (trustProxy > 0) app.set('trust proxy', trustProxy);

app.use(securityHeaders);
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  maxAge:      600,
}));
app.use('/api', noStore, apiRateLimit, requireTrustedOrigin);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Health checks ─────────────────────────────────────────────────────────
// Liveness: the process is up.
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'TaskFlow API is running.' });
});

// Readiness: the API can reach its database.
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ success: true, message: 'TaskFlow API is ready.' });
  } catch {
    res.status(503).json({ success: false, message: 'Database unavailable.' });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/projects',  projectRoutes);
app.use('/api/tasks',     taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const type = (error as { type?: string })?.type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Request body must be valid JSON.' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Request body is too large.' });
    return;
  }
  console.error('Unhandled API error:', error);
  res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    validateEnvironment();
    await testConnection();
  } catch (error) {
    console.error('❌  TaskFlow API failed to start:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀  TaskFlow API running on http://localhost:${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received — closing TaskFlow API.`);
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(async () => {
      await pool.end().catch(() => undefined);
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

if (require.main === module) {
  void start();
}

export default app;
