import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export type AccountRole = 'admin' | 'member';

export interface AdminManagedUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: AccountRole;
  created_at: Date;
}

interface AdminManagedUserRow extends AdminManagedUser, RowDataPacket {}

export class AdminServiceError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AdminServiceError';
  }
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function getOverview() {
  const [userRows, projectRows, taskRows] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, COALESCE(SUM(role = 'admin'), 0) AS admins,
              COALESCE(SUM(role = 'member'), 0) AS members
       FROM users`,
    ),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM projects'),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM tasks'),
  ]);

  return {
    users: toNumber(userRows[0][0].total),
    admins: toNumber(userRows[0][0].admins),
    members: toNumber(userRows[0][0].members),
    projects: toNumber(projectRows[0][0].total),
    tasks: toNumber(taskRows[0][0].total),
  };
}

export async function listUsers(options: { search: string; page: number; pageSize: number }) {
  const where = options.search
    ? `WHERE INSTR(LOWER(name), LOWER(?)) > 0
         OR INSTR(LOWER(username), LOWER(?)) > 0
         OR INSTR(LOWER(email), LOWER(?)) > 0`
    : '';
  const searchParams = options.search ? [options.search, options.search, options.search] : [];
  const offset = (options.page - 1) * options.pageSize;
  const [countRows, userRows] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users ${where}`, searchParams),
    pool.query<AdminManagedUserRow[]>(
      `SELECT id, name, username, email, role, created_at
       FROM users ${where}
       ORDER BY FIELD(role, 'admin', 'member'), name, id
       LIMIT ? OFFSET ?`,
      [...searchParams, options.pageSize, offset],
    ),
  ]);

  return {
    users: userRows[0],
    total: toNumber(countRows[0][0].total),
    page: options.page,
    page_size: options.pageSize,
  };
}

export async function updateUserRole(
  actorId: number,
  actorSessionVersion: number,
  userId: number,
  role: AccountRole,
): Promise<AdminManagedUser> {
  if (actorId === userId) {
    throw new AdminServiceError('You cannot change your own administrator role.', 400);
  }

  const connection = await pool.getConnection();
  let lockAcquired = false;
  let transactionStarted = false;

  try {
    const [lockRows] = await connection.query<RowDataPacket[]>(
      "SELECT GET_LOCK('taskflow_admin_role_change', 10) AS acquired",
    );
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) {
      throw new AdminServiceError('Administrator roles are being updated. Please try again.', 503);
    }

    await connection.beginTransaction();
    transactionStarted = true;
    const [actors] = await connection.query<(RowDataPacket & { role: AccountRole; session_version: number })[]>(
      'SELECT role, session_version FROM users WHERE id = ? FOR UPDATE',
      [actorId],
    );
    if (!actors.length || actors[0].role !== 'admin') {
      throw new AdminServiceError('Administrator access is required.', 403);
    }
    if (Number(actors[0].session_version) !== actorSessionVersion) {
      throw new AdminServiceError('Your session is no longer valid. Please sign in again.', 401);
    }

    const [users] = await connection.query<AdminManagedUserRow[]>(
      'SELECT id, name, username, email, role, created_at FROM users WHERE id = ? FOR UPDATE',
      [userId],
    );
    const target = users[0];
    if (!target) throw new AdminServiceError('Account not found.', 404);

    if (target.role !== role) {
      if (target.role === 'admin' && role === 'member') {
        const [adminCounts] = await connection.query<RowDataPacket[]>(
          "SELECT COUNT(*) AS total FROM users WHERE role = 'admin'",
        );
        if (toNumber(adminCounts[0].total) <= 1) {
          throw new AdminServiceError('TaskFlow must keep at least one administrator.', 409);
        }
      }

      await connection.query(
        'UPDATE users SET role = ?, session_version = session_version + 1 WHERE id = ?',
        [role, userId],
      );
    }

    await connection.commit();
    transactionStarted = false;
    return { ...target, role };
  } catch (error) {
    if (transactionStarted) {
      try { await connection.rollback(); } catch { /* The connection may have failed before rollback. */ }
    }
    throw error;
  } finally {
    if (lockAcquired) {
      try { await connection.query("SELECT RELEASE_LOCK('taskflow_admin_role_change')"); } catch { /* The connection may have closed. */ }
    }
    connection.release();
  }
}
