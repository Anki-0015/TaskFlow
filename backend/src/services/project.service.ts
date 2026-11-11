import pool from '../config/database';
import { Project } from '../models/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ProjectRow extends Project, RowDataPacket {}

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD'] as const;
const INITIAL_PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD'] as const;

function normalizeDate(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fieldName} must be a valid date.`);
  }
  return value;
}

function validateDateRange(startValue: unknown, endValue: unknown): { start: string | null; end: string | null } {
  const start = normalizeDate(startValue, 'Start date');
  const end = normalizeDate(endValue, 'End date');
  if (start && end && end <= start) throw new Error('The end date must be after the start date.');
  return { start, end };
}

// ── Get All Projects for user ─────────────────────────────────────────────
export async function getProjects(userId: number): Promise<ProjectRow[]> {
  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT p.*,
            u.name  AS creator_name,
            CASE WHEN p.created_by = ? THEN 'MANAGER'
                 ELSE (SELECT pm_current.role FROM project_members pm_current WHERE pm_current.project_id = p.id AND pm_current.user_id = ?)
            END AS current_user_project_role,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id)              AS task_count,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'COMPLETED') AS completed_count
     FROM projects p
     JOIN users u ON u.id = p.created_by
     WHERE p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)
     ORDER BY p.created_at DESC`,
    [userId, userId, userId, userId]
  );
  return rows;
}

// ── Get single project ────────────────────────────────────────────────────
export async function getProjectById(id: number, userId: number): Promise<ProjectRow> {
  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT p.*,
            u.name AS creator_name,
            CASE WHEN p.created_by = ? THEN 'MANAGER'
                 ELSE (SELECT pm_current.role FROM project_members pm_current WHERE pm_current.project_id = p.id AND pm_current.user_id = ?)
            END AS current_user_project_role,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id)              AS task_count,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'COMPLETED') AS completed_count
     FROM projects p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = ? AND (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))`,
    [userId, userId, id, userId, userId]
  );
  if (rows.length === 0) throw new Error('Project not found.');
  return rows[0];
}

// ── Create project ────────────────────────────────────────────────────────
export async function createProject(
  data: Partial<Project>,
  userId: number
): Promise<ProjectRow> {
  const { name, description, start_date, end_date, status } = data;
  const dates = validateDateRange(start_date, end_date);
  if (status && !(INITIAL_PROJECT_STATUSES as readonly string[]).includes(status)) {
    throw new Error('New projects must start as Planning, Active, or On Hold.');
  }
  const connection = await pool.getConnection();
  let projectId = 0;
  try {
    await connection.beginTransaction();
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO projects (name, description, start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name?.trim(), description || null, dates.start, dates.end, status || 'PLANNING', userId]
    );
    projectId = result.insertId;
    await connection.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, \'MANAGER\')', [projectId, userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getProjectById(projectId, userId);
}

// ── Update project ────────────────────────────────────────────────────────
export async function updateProject(
  id: number,
  data: Partial<Project>,
  userId: number
): Promise<ProjectRow> {
  // Managers can edit project details; only the creator can delete the project.
  const existing = await getProjectById(id, userId);
  if (existing.current_user_project_role !== 'MANAGER') throw new Error('Only a project manager can edit project details.');

  const { name, description, start_date, end_date, status } = data;
  const dates = validateDateRange(
    start_date === undefined ? existing.start_date : start_date,
    end_date === undefined ? existing.end_date : end_date,
  );
  if (status !== undefined && !(PROJECT_STATUSES as readonly string[]).includes(status)) {
    throw new Error('Choose a valid project status.');
  }
  if (start_date !== undefined || end_date !== undefined) {
    const dueDateConditions: string[] = [];
    const dueDateParams: (number | string)[] = [id];
    if (dates.start) {
      dueDateConditions.push('due_date < ?');
      dueDateParams.push(dates.start);
    }
    if (dates.end) {
      dueDateConditions.push('due_date > ?');
      dueDateParams.push(dates.end);
    }
    const [outOfRangeTasks] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM tasks WHERE project_id = ? AND due_date IS NOT NULL
       ${dueDateConditions.length ? `AND (${dueDateConditions.join(' OR ')})` : 'AND 1 = 0'} LIMIT 1`,
      dueDateParams
    );
    if (outOfRangeTasks.length) throw new Error('Project dates cannot exclude a task due date.');
  }
  await pool.query(
    `UPDATE projects
     SET name = COALESCE(?, name),
         description = CASE WHEN ? THEN ? ELSE description END,
         start_date  = CASE WHEN ? THEN ? ELSE start_date END,
         end_date    = CASE WHEN ? THEN ? ELSE end_date END,
         status      = COALESCE(?, status)
     WHERE id = ?`,
    [name?.trim(), description !== undefined ? 1 : 0, description ?? null,
      start_date !== undefined ? 1 : 0, dates.start,
      end_date !== undefined ? 1 : 0, dates.end, status, id]
  );
  return getProjectById(id, userId);
}

// ── Delete project ────────────────────────────────────────────────────────
export async function deleteProject(id: number, userId: number): Promise<void> {
  const existing = await getProjectById(id, userId);
  if (existing.created_by !== userId) throw new Error('Only the project owner can delete this project.');
  await pool.query('DELETE FROM projects WHERE id = ?', [id]);
}

// ── Dashboard stats ───────────────────────────────────────────────────────
export async function getDashboardStats(userId: number) {
  const [[projectStats]] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*)                                          AS total_projects,
       SUM(status = 'ACTIVE')                           AS active_projects,
       SUM(status = 'COMPLETED')                        AS completed_projects,
       SUM(status = 'PLANNING')                         AS planning_projects,
       SUM(status = 'ON_HOLD')                          AS on_hold_projects
     FROM projects
     WHERE created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?)`,
    [userId, userId]
  );

  const [[taskStats]] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*)                                          AS total_tasks,
       SUM(t.status = 'COMPLETED')                      AS completed_tasks,
       SUM(t.status = 'IN_PROGRESS')                    AS in_progress_tasks,
       SUM(t.status = 'TODO')                           AS todo_tasks
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)`,
    [userId, userId]
  );

  return { projects: projectStats, tasks: taskStats };
}

export async function getProjectMembers(projectId: number, userId: number) {
  await getProjectById(projectId, userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.username, 'MANAGER' AS role, TRUE AS is_owner
     FROM projects p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = ?
     UNION ALL
     SELECT u.id, u.name, u.username, pm.role, FALSE AS is_owner
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
       AND pm.user_id <> (SELECT created_by FROM projects WHERE id = ?)
     ORDER BY FIELD(role, 'MANAGER', 'MEMBER', 'VIEWER'), name`,
    [projectId, projectId, projectId]
  );
  return rows;
}

export async function addProjectMember(projectId: number, userId: number, email: string, role: 'MANAGER' | 'MEMBER' | 'VIEWER') {
  const project = await getProjectById(projectId, userId);
  if (project.current_user_project_role !== 'MANAGER') throw new Error('Only a project manager can manage members.');
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, username, email FROM users WHERE email = ?', [email]);
  if (!rows.length) throw new Error('No account found for that email.');
  if (Number(rows[0].id) === userId) throw new Error('You already own this project.');
  const [members] = await pool.query<RowDataPacket[]>('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, rows[0].id]);
  if (members.length) throw new Error('That person already has access to this project.');
  const [pending] = await pool.query<RowDataPacket[]>('SELECT id FROM project_invitations WHERE project_id = ? AND invited_user_id = ? AND status = \'PENDING\'', [projectId, rows[0].id]);
  if (pending.length) throw new Error('An invitation is already waiting for that person.');
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO project_invitations (project_id, invited_user_id, invited_by, role) VALUES (?, ?, ?, ?)',
    [projectId, rows[0].id, userId, role]
  );
  return { id: result.insertId, project_id: projectId, project_name: project.name, invited_user_id: rows[0].id, invited_by_name: (await pool.query<RowDataPacket[]>('SELECT name FROM users WHERE id = ?', [userId]))[0][0].name, role, status: 'PENDING' };
}

export async function getProjectInvitations(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.id, i.project_id, p.name AS project_name, i.role, i.status, i.created_at,
            inviter.name AS invited_by_name, inviter.username AS invited_by_username
     FROM project_invitations i
     JOIN projects p ON p.id = i.project_id
     JOIN users inviter ON inviter.id = i.invited_by
     WHERE i.invited_user_id = ?
     ORDER BY (i.status = 'PENDING') DESC, i.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function respondToProjectInvitation(invitationId: number, userId: number, accept: boolean) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT project_id, role, status FROM project_invitations WHERE id = ? AND invited_user_id = ? FOR UPDATE',
      [invitationId, userId]
    );
    if (!rows.length) throw new Error('Invitation not found.');
    if (rows[0].status !== 'PENDING') throw new Error('This invitation has already been answered.');
    if (accept) {
      await connection.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)', [rows[0].project_id, userId, rows[0].role]);
    }
    await connection.query('UPDATE project_invitations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?', [accept ? 'ACCEPTED' : 'DECLINED', invitationId]);
    await connection.commit();
    return { status: accept ? 'ACCEPTED' : 'DECLINED' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removeProjectMember(projectId: number, requesterId: number, targetUserId: number) {
  const project = await getProjectById(projectId, requesterId);
  if (project.current_user_project_role !== 'MANAGER') throw new Error('Only a project manager can remove members.');
  if (project.created_by === targetUserId) throw new Error('Cannot remove the project owner.');
  await pool.query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, targetUserId]);
}
