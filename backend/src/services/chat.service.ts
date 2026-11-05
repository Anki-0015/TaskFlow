import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getProjectById } from './project.service';

interface ProjectMessageRow extends RowDataPacket {
  id: number;
  project_id: number;
  user_id: number;
  author_name: string;
  author_username: string;
  body: string;
  created_at: Date;
}

const messageSelect = `
  SELECT m.id, m.project_id, m.user_id, u.name AS author_name,
         u.username AS author_username, m.body, m.created_at
  FROM project_messages m
  JOIN users u ON u.id = m.user_id
`;

export async function getProjectMessages(projectId: number, userId: number, afterId?: number) {
  await getProjectById(projectId, userId);

  if (afterId && afterId > 0) {
    const [rows] = await pool.query<ProjectMessageRow[]>(
      `${messageSelect}
       WHERE m.project_id = ? AND m.id > ?
       ORDER BY m.id ASC
       LIMIT 100`,
      [projectId, afterId]
    );
    return rows;
  }

  const [rows] = await pool.query<ProjectMessageRow[]>(
    `${messageSelect}
     WHERE m.project_id = ?
     ORDER BY m.id DESC
     LIMIT 100`,
    [projectId]
  );
  return rows.reverse();
}

export async function sendProjectMessage(projectId: number, userId: number, body: string) {
  await getProjectById(projectId, userId);

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO project_messages (project_id, user_id, body) VALUES (?, ?, ?)',
    [projectId, userId, body]
  );
  const [rows] = await pool.query<ProjectMessageRow[]>(
    `${messageSelect} WHERE m.id = ? AND m.project_id = ?`,
    [result.insertId, projectId]
  );
  return rows[0];
}
