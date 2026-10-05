import pool from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, JwtPayload } from '../models/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends User, RowDataPacket {}

// ── Register ──────────────────────────────────────────────────────────────
export async function registerUser(
  name: string,
  email: string,
  username: string,
  password: string
): Promise<Omit<User, 'password'>> {
  // Check duplicate
  const [existing] = await pool.query<UserRow[]>(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );
  if (existing.length > 0) {
    throw new Error('Email or username already in use.');
  }

  const hashed = await bcrypt.hash(password, 10);

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [name, username, email, hashed, 'member']
  );

  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, name, username, email, role, avatar, created_at, updated_at FROM users WHERE id = ?',
    [result.insertId]
  );

  return rows[0];
}

// ── Login ─────────────────────────────────────────────────────────────────
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: Omit<User, 'password'>; token: string }> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (rows.length === 0) {
    throw new Error('Invalid email or password.');
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password as string);

  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });

  const { password: _pw, ...safeUser } = user;
  return { user: safeUser as Omit<User, 'password'>, token };
}

// ── Get Me ────────────────────────────────────────────────────────────────
export async function getMe(id: number): Promise<Omit<User, 'password'>> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, name, username, email, role, avatar, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  if (rows.length === 0) throw new Error('User not found.');
  return rows[0];
}

// ── Update Profile ────────────────────────────────────────────────────────
export async function updateProfile(
  id: number,
  updates: { name?: string; password?: string }
): Promise<Omit<User, 'password'>> {
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
    await pool.query('UPDATE users SET name = COALESCE(?, name), password = ? WHERE id = ?', [
      updates.name,
      updates.password,
      id,
    ]);
  } else {
    await pool.query('UPDATE users SET name = COALESCE(?, name) WHERE id = ?', [updates.name, id]);
  }
  return getMe(id);
}
