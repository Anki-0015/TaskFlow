import pool from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User, JwtPayload } from '../models/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

interface UserRow extends User, RowDataPacket {}
interface PasswordResetUserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
}
interface PasswordResetCodeRow extends RowDataPacket {
  id: number;
  code_hash: string;
  attempt_count: number;
  expired: number;
}

type ResetCodeDelivery = 'gmail' | 'console';
const RESET_CODE_ATTEMPTS = 5;
const RESET_CODE_COOLDOWN_SECONDS = 60;

function getResetCodeDelivery(): ResetCodeDelivery {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) return 'gmail';
  if (gmailUser || gmailAppPassword) {
    throw new Error('Gmail password reset email delivery is partially configured.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Gmail password reset email delivery is not configured.');
  }
  return 'console';
}

function hashResetCode(code: string): Buffer {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || 'taskflow-reset-code';
  return createHmac('sha256', secret).update(code).digest();
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

async function deliverResetCode(email: string, name: string, code: string, mode: ResetCodeDelivery): Promise<void> {
  if (mode === 'console') {
    console.info(`[TaskFlow development password reset] ${email}: ${code}`);
    return;
  }

  const gmailUser = process.env.GMAIL_USER!;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, ''),
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  const safeName = escapeHtml(name);
  await transporter.sendMail({
    from: `TaskFlow <${gmailUser}>`,
    to: email,
    subject: 'Your TaskFlow password reset code',
    text: `Hi ${name}, your TaskFlow password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;color:#182a32;max-width:520px;margin:0 auto;padding:32px"><p style="color:#0b7888;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">TaskFlow</p><h1 style="font-size:24px;margin-bottom:8px">Reset your password</h1><p>Hi ${safeName}, use this one-time code to reset your TaskFlow password:</p><p style="font-size:32px;font-weight:700;letter-spacing:.3em;background:#edf8f9;border-radius:12px;padding:16px;text-align:center;color:#0a6573">${code}</p><p>This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p></div>`,
  });
}

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

// ── Password reset ───────────────────────────────────────────────────────
export async function requestPasswordReset(email: string): Promise<ResetCodeDelivery> {
  const delivery = getResetCodeDelivery();
  const connection = await pool.getConnection();
  let recipient: PasswordResetUserRow | undefined;
  let resetCode = '';

  try {
    await connection.beginTransaction();
    const [users] = await connection.query<PasswordResetUserRow[]>(
      'SELECT id, name, email FROM users WHERE email = ? FOR UPDATE',
      [email],
    );
    recipient = users[0];

    if (recipient) {
      const [recentCodes] = await connection.query<(RowDataPacket & { seconds_ago: number })[]>(
        'SELECT TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) AS seconds_ago FROM password_reset_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE',
        [recipient.id],
      );
      if (recentCodes[0] && Number(recentCodes[0].seconds_ago) < RESET_CODE_COOLDOWN_SECONDS) {
        await connection.commit();
        return delivery;
      }

      resetCode = String(randomInt(100_000, 1_000_000));
      await connection.query(
        'UPDATE password_reset_codes SET consumed_at = UTC_TIMESTAMP() WHERE user_id = ? AND consumed_at IS NULL',
        [recipient.id],
      );
      await connection.query(
        'DELETE FROM password_reset_codes WHERE user_id = ? AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)',
        [recipient.id],
      );
      await connection.query<ResultSetHeader>(
        'INSERT INTO password_reset_codes (user_id, code_hash, expires_at, created_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), UTC_TIMESTAMP())',
        [recipient.id, hashResetCode(resetCode).toString('hex')],
      );
    }

    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch { /* The connection may have failed before a transaction began. */ }
    throw error;
  } finally {
    connection.release();
  }

  if (recipient) {
    void deliverResetCode(recipient.email, recipient.name, resetCode, delivery).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown email delivery error.';
      console.error(`Password reset email delivery failed: ${message}`);
    });
  }

  return delivery;
}

export async function resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<boolean> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [users] = await connection.query<(RowDataPacket & { id: number })[]>(
      'SELECT id FROM users WHERE email = ? FOR UPDATE',
      [email],
    );
    const user = users[0];
    if (!user) {
      await connection.rollback();
      return false;
    }

    const [codes] = await connection.query<PasswordResetCodeRow[]>(
      `SELECT id, code_hash, attempt_count, (expires_at <= UTC_TIMESTAMP()) AS expired
       FROM password_reset_codes
       WHERE user_id = ? AND consumed_at IS NULL
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [user.id],
    );
    const resetCode = codes[0];
    if (!resetCode) {
      await connection.rollback();
      return false;
    }

    if (Number(resetCode.expired) === 1 || Number(resetCode.attempt_count) >= RESET_CODE_ATTEMPTS) {
      await connection.query('UPDATE password_reset_codes SET consumed_at = UTC_TIMESTAMP() WHERE id = ?', [resetCode.id]);
      await connection.commit();
      return false;
    }

    const providedHash = hashResetCode(code);
    const storedHash = Buffer.from(resetCode.code_hash, 'hex');
    if (storedHash.length !== providedHash.length || !timingSafeEqual(storedHash, providedHash)) {
      const nextAttempts = Number(resetCode.attempt_count) + 1;
      await connection.query(
        'UPDATE password_reset_codes SET attempt_count = ?, consumed_at = IF(? >= ?, UTC_TIMESTAMP(), consumed_at) WHERE id = ?',
        [nextAttempts, nextAttempts, RESET_CODE_ATTEMPTS, resetCode.id],
      );
      await connection.commit();
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    await connection.query(
      'UPDATE password_reset_codes SET consumed_at = UTC_TIMESTAMP() WHERE user_id = ? AND consumed_at IS NULL',
      [user.id],
    );
    await connection.commit();
    return true;
  } catch (error) {
    try { await connection.rollback(); } catch { /* The connection may have failed before a transaction began. */ }
    throw error;
  } finally {
    connection.release();
  }
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
