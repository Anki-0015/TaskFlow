import pool from '../config/database';
import { Task } from '../models/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface TaskRow extends Task, RowDataPacket {}

function toDateValue(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && value) return value.slice(0, 10);
  return null;
}

async function ensureDueDateWithinProject(
  projectId: number,
  dueDate: string | Date | null | undefined,
): Promise<void> {
  if (dueDate === null || dueDate === undefined || dueDate === '') return;

  const dateValue = toDateValue(dueDate);
  const parsedDate = dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T00:00:00.000Z`)
    : null;
  if (!dateValue || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateValue) {
    throw new Error('Due date must be a valid date.');
  }

  const [projects] = await pool.query<RowDataPacket[]>(
    'SELECT start_date, end_date FROM projects WHERE id = ?',
    [projectId],
  );
  if (!projects.length) throw new Error('Project not found.');

  const startDate = toDateValue(projects[0].start_date);
  const endDate = toDateValue(projects[0].end_date);
  if (startDate && dateValue < startDate) {
    throw new Error('Task due date must be on or after the project start date.');
  }
  if (endDate && dateValue > endDate) {
    throw new Error('Task due date must be on or before the project end date.');
  }
}

async function ensureCanEditTask(taskId: number, userId: number): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.created_by, pm.role FROM tasks t JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? WHERE t.id = ?`, [userId, taskId]
  );
  if (!rows.length) throw new Error('Task not found.');
  if (rows[0].created_by !== userId && rows[0].role === 'VIEWER') throw new Error('Viewers cannot modify tasks.');
}

async function ensureCanCreateTask(projectId: number, userId: number, assignedTo?: number | null): Promise<void> {
  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT p.created_by, pm.role FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? WHERE p.id = ?`, [userId, projectId]
  );
  if (!members.length || (members[0].created_by !== userId && !members[0].role)) throw new Error('Project not found.');
  if (members[0].created_by !== userId && members[0].role === 'VIEWER') throw new Error('Viewers cannot create tasks.');
  if (assignedTo) {
    const [assignees] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM projects p JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? WHERE p.id = ? UNION SELECT 1 FROM projects WHERE id = ? AND created_by = ?`,
      [assignedTo, projectId, projectId, assignedTo]
    );
    if (!assignees.length) throw new Error('Tasks can only be assigned to project members.');
  }
}

// ── Build query helper ────────────────────────────────────────────────────
function baseTaskQuery() {
  return `
    SELECT
      t.*,
      p.name       AS project_name,
      u1.name      AS creator_name,
      u2.name      AS assignee_name
    FROM tasks t
    JOIN projects p  ON p.id = t.project_id
    JOIN users   u1  ON u1.id = t.created_by
    LEFT JOIN users u2 ON u2.id = t.assigned_to
  `;
}

// ── Get all tasks ─────────────────────────────────────────────────────────
export async function getTasks(
  userId: number,
  filters: { status?: string; priority?: string; projectId?: string; search?: string }
): Promise<TaskRow[]> {
  let query = baseTaskQuery() + ' WHERE (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))';
  const params: (string | number)[] = [userId, userId];

  if (filters.status) {
    query += ' AND t.status = ?';
    params.push(filters.status);
  }
  if (filters.priority) {
    query += ' AND t.priority = ?';
    params.push(filters.priority);
  }
  if (filters.projectId) {
    query += ' AND t.project_id = ?';
    params.push(filters.projectId);
  }
  if (filters.search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  query += ' ORDER BY t.created_at DESC';

  const [rows] = await pool.query<TaskRow[]>(query, params);
  return rows;
}

// ── Get single task ───────────────────────────────────────────────────────
export async function getTaskById(id: number, userId: number): Promise<TaskRow> {
  const [rows] = await pool.query<TaskRow[]>(
    baseTaskQuery() + ' WHERE t.id = ? AND (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))',
    [id, userId, userId]
  );
  if (rows.length === 0) throw new Error('Task not found.');
  return rows[0];
}

// ── Create task ───────────────────────────────────────────────────────────
export async function createTask(data: Partial<Task>, userId: number): Promise<TaskRow> {
  const { project_id, title, description, priority, status, due_date, assigned_to } = data;
  const targetProjectId = Number(project_id);
  await ensureCanCreateTask(targetProjectId, userId, assigned_to);
  await ensureDueDateWithinProject(targetProjectId, due_date);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_by, assigned_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      project_id,
      title,
      description || null,
      priority || 'MEDIUM',
      status || 'TODO',
      due_date || null,
      userId,
      assigned_to || null,
    ]
  );

  return getTaskById(result.insertId, userId);
}

// ── Update task ───────────────────────────────────────────────────────────
export async function updateTask(
  id: number,
  data: Partial<Task>,
  userId: number
): Promise<TaskRow> {
  const currentTask = await getTaskById(id, userId);
  await ensureCanEditTask(id, userId);

  const { project_id, title, description, priority, status, due_date, assigned_to } = data;
  const targetProjectId = Number(project_id ?? currentTask.project_id);
  const targetAssignee = assigned_to === undefined ? currentTask.assigned_to : assigned_to;
  await ensureCanCreateTask(targetProjectId, userId, targetAssignee);

  const projectChanged = targetProjectId !== Number(currentTask.project_id);
  if (due_date !== undefined || projectChanged) {
    await ensureDueDateWithinProject(
      targetProjectId,
      due_date === undefined ? currentTask.due_date : due_date,
    );
  }

  await pool.query(
    `UPDATE tasks
     SET project_id  = COALESCE(?, project_id),
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         priority    = COALESCE(?, priority),
         status      = COALESCE(?, status),
         due_date    = CASE WHEN ? THEN ? ELSE due_date END,
         assigned_to = ?
     WHERE id = ?`,
    [
      project_id ?? null,
      title,
      description,
      priority,
      status,
      due_date !== undefined ? 1 : 0,
      due_date ?? null,
      targetAssignee ?? null,
      id,
    ]
  );

  return getTaskById(id, userId);
}

// ── Patch status ──────────────────────────────────────────────────────────
export async function patchTaskStatus(
  id: number,
  status: string,
  userId: number
): Promise<TaskRow> {
  await getTaskById(id, userId);
  await ensureCanEditTask(id, userId);
  await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
  return getTaskById(id, userId);
}

// ── Delete task ───────────────────────────────────────────────────────────
export async function deleteTask(id: number, userId: number): Promise<void> {
  await getTaskById(id, userId);
  await ensureCanEditTask(id, userId);
  await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
}

// ── Tasks for a specific project ──────────────────────────────────────────
export async function getTasksByProject(projectId: number, userId: number): Promise<TaskRow[]> {
  const [rows] = await pool.query<TaskRow[]>(
    baseTaskQuery() + ' WHERE t.project_id = ? AND (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)) ORDER BY t.created_at DESC',
    [projectId, userId, userId]
  );
  return rows;
}
