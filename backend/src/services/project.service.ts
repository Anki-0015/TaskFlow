import pool from '../config/database';
import { Project } from '../models/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ProjectRow extends Project, RowDataPacket {}

// ── Get All Projects for user ─────────────────────────────────────────────
export async function getProjects(userId: number): Promise<ProjectRow[]> {
  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT p.*,
            u.name  AS creator_name,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id)              AS task_count,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'COMPLETED') AS completed_count
     FROM projects p
     JOIN users u ON u.id = p.created_by
     WHERE p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)
     ORDER BY p.created_at DESC`,
    [userId, userId]
  );
  return rows;
}

// ── Get single project ────────────────────────────────────────────────────
export async function getProjectById(id: number, userId: number): Promise<ProjectRow> {
  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT p.*,
            u.name AS creator_name,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id)              AS task_count,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'COMPLETED') AS completed_count
     FROM projects p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = ? AND (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))`,
    [id, userId, userId]
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
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO projects (name, description, start_date, end_date, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description || null, start_date || null, end_date || null, status || 'PLANNING', userId]
  );
  await pool.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, \'MANAGER\')', [result.insertId, userId]);
  return getProjectById(result.insertId, userId);
}

// ── Update project ────────────────────────────────────────────────────────
export async function updateProject(
  id: number,
  data: Partial<Project>,
  userId: number
): Promise<ProjectRow> {
  // Ensure ownership
  const existing = await getProjectById(id, userId);
  if (existing.created_by !== userId) throw new Error('Only the project owner can edit project details.');

  const { name, description, start_date, end_date, status } = data;
  await pool.query(
    `UPDATE projects
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         start_date  = COALESCE(?, start_date),
         end_date    = COALESCE(?, end_date),
         status      = COALESCE(?, status)
     WHERE id = ?`,
    [name, description, start_date, end_date, status, id]
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
    `SELECT u.id, u.name, u.username, 'OWNER' AS role
     FROM projects p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = ?
     UNION ALL
     SELECT u.id, u.name, u.username, pm.role
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
       AND pm.user_id <> (SELECT created_by FROM projects WHERE id = ?)
     ORDER BY FIELD(role, 'OWNER', 'MANAGER', 'MEMBER', 'VIEWER'), name`,
    [projectId, projectId, projectId]
  );
  return rows;
}

export async function addProjectMember(projectId: number, userId: number, email: string, role: 'MANAGER' | 'MEMBER' | 'VIEWER') {
  const project = await getProjectById(projectId, userId);
  if (project.created_by !== userId) throw new Error('Only the project owner can manage members.');
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
  if (project.created_by !== requesterId) throw new Error('Only the project owner can remove members.');
  if (project.created_by === targetUserId) throw new Error('Cannot remove the project owner.');
  await pool.query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, targetUserId]);
}
