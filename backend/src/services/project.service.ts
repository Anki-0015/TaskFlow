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
    `SELECT u.id, u.name, u.username, CASE WHEN p.created_by = u.id THEN 'OWNER' ELSE pm.role END AS role
     FROM projects p JOIN users u ON u.id = p.created_by
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = u.id WHERE p.id = ?
     UNION ALL
     SELECT u.id, u.name, u.username, pm.role FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ? AND u.id <> (SELECT created_by FROM projects WHERE id = ?) ORDER BY name`,
    [projectId, projectId, projectId]
  );
  return rows;
}

export async function addProjectMember(projectId: number, userId: number, email: string, role: 'MANAGER' | 'MEMBER' | 'VIEWER') {
  const project = await getProjectById(projectId, userId);
  if (project.created_by !== userId) throw new Error('Only the project owner can manage members.');
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, username FROM users WHERE email = ?', [email]);
  if (!rows.length) throw new Error('No account found for that email.');
  await pool.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)', [projectId, rows[0].id, role]);
  return { ...rows[0], role };
}
