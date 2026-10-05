import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!name || !email || !username || !password) {
    res.status(400).json({ success: false, message: 'Name, username, email and password are required.' });
    return;
  }
  if (!/^[a-z0-9_]{3,40}$/.test(username)) {
    res.status(400).json({ success: false, message: 'Username must be 3–40 characters using letters, numbers or underscores.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    return;
  }

  try {
    const user = await AuthService.registerUser(name, email, username, password);
    res.status(201).json({ success: true, message: 'Account created successfully.', data: user });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'ER_DUP_ENTRY' || error.message === 'Email or username already in use.') {
      res.status(409).json({ success: false, message: 'Email or username already in use.' });
      return;
    }
    console.error('Registration failed:', error.code || error.message || 'Unknown error');
    res.status(500).json({ success: false, message: 'Could not create the account. Check that the API database is set up, then try again.' });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  try {
    const result = await AuthService.loginUser(email, password);
    res.status(200).json({ success: true, message: 'Login successful.', data: result });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.message === 'Invalid email or password.') {
      res.status(401).json({ success: false, message: error.message });
      return;
    }
    console.error('Login failed:', error.code || error.message || 'Unknown error');
    res.status(500).json({ success: false, message: 'Could not sign in. Check that the API database is available, then try again.' });
  }
}

// GET /api/auth/me
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await AuthService.getMe(req.user!.id);
    res.status(200).json({ success: true, data: user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch profile.';
    res.status(404).json({ success: false, message: msg });
  }
}

// PUT /api/auth/profile
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const { name, password } = req.body;
    const user = await AuthService.updateProfile(req.user!.id, { name, password });
    res.status(200).json({ success: true, message: 'Profile updated.', data: user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile.';
    res.status(400).json({ success: false, message: msg });
  }
}
