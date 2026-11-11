import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';

import authRoutes    from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes    from './routes/task.routes';
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
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use('/api', requireTrustedOrigin);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'TaskFlow API is running.' });
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks',    taskRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', error);
  res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    validateEnvironment();
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀  TaskFlow API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌  Failed to connect to the database:', error);
    process.exit(1);
  }
}

start();

export default app;
