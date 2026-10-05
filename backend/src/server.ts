import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';

import authRoutes    from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes    from './routes/task.routes';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  try {
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
