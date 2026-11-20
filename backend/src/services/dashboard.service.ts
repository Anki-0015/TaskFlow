import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { baseTaskQuery } from './task.service';

const ACCESSIBLE_PROJECT = `(p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))`;
const PRIORITY_ORDER = `FIELD(t.priority, 'HIGH', 'MEDIUM', 'LOW')`;
const TREND_DAYS = 14;

export interface DashboardOptions {
  /** The viewer's local calendar date (YYYY-MM-DD). */
  today: string;
  /** Minutes to add to UTC to get the viewer's local time (e.g. 330 for IST). */
  utcOffsetMinutes: number;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** UTC timestamp (MySQL DATETIME format) for local midnight at the start of `dateKey`. */
function localMidnightUtc(dateKey: string, utcOffsetMinutes: number): string {
  const date = new Date(Date.parse(`${dateKey}T00:00:00.000Z`) - utcOffsetMinutes * 60_000);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function getDashboard(userId: number, { today, utcOffsetMinutes }: DashboardOptions) {
  const weekAhead = addDays(today, 7);
  const trendStartKey = addDays(today, -(TREND_DAYS - 1));
  const trendStartUtc = localMidnightUtc(trendStartKey, utcOffsetMinutes);
  const weekStartUtc = localMidnightUtc(addDays(today, -6), utcOffsetMinutes);

  const [
    [[taskSummary]],
    [[projectSummary]],
    [myTasks],
    [deadlines],
    [projects],
    [trendRows],
    [activity],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*)                                                         AS total,
         SUM(t.status = 'TODO')                                           AS todo,
         SUM(t.status = 'IN_PROGRESS')                                    AS in_progress,
         SUM(t.status = 'COMPLETED')                                      AS completed,
         SUM(t.status <> 'COMPLETED' AND t.due_date < ?)                  AS overdue,
         SUM(t.status <> 'COMPLETED' AND t.due_date BETWEEN ? AND ?)      AS due_this_week,
         SUM(t.status <> 'COMPLETED' AND t.assigned_to = ?)               AS my_open,
         SUM(t.status <> 'COMPLETED' AND t.assigned_to = ? AND t.due_date < ?) AS my_overdue,
         SUM(t.status = 'COMPLETED' AND t.completed_at >= ?)              AS completed_last_7_days,
         SUM(t.status <> 'COMPLETED' AND t.assigned_to IS NULL)           AS unassigned
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE ${ACCESSIBLE_PROJECT}`,
      [today, today, weekAhead, userId, userId, today, weekStartUtc, userId, userId],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*)                    AS total,
         SUM(p.status = 'ACTIVE')    AS active,
         SUM(p.status = 'PLANNING')  AS planning,
         SUM(p.status = 'ON_HOLD')   AS on_hold,
         SUM(p.status = 'COMPLETED') AS completed
       FROM projects p
       WHERE ${ACCESSIBLE_PROJECT}`,
      [userId, userId],
    ),
    pool.query<RowDataPacket[]>(
      `${baseTaskQuery()}
       WHERE ${ACCESSIBLE_PROJECT} AND t.assigned_to = ? AND t.status <> 'COMPLETED'
       ORDER BY t.due_date IS NULL, t.due_date, ${PRIORITY_ORDER}, t.updated_at DESC
       LIMIT 6`,
      [userId, userId, userId, userId, userId],
    ),
    pool.query<RowDataPacket[]>(
      `${baseTaskQuery()}
       WHERE ${ACCESSIBLE_PROJECT} AND t.status <> 'COMPLETED' AND t.due_date IS NOT NULL AND t.due_date <= ?
       ORDER BY t.due_date, ${PRIORITY_ORDER}
       LIMIT 6`,
      [userId, userId, userId, userId, weekAhead],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT p.id, p.name, p.status, p.end_date, p.updated_at,
              COUNT(t.id)                                                  AS task_count,
              COALESCE(SUM(t.status = 'COMPLETED'), 0)                     AS completed_count,
              COALESCE(SUM(t.status <> 'COMPLETED' AND t.due_date < ?), 0) AS overdue_count,
              GREATEST(p.updated_at, COALESCE(MAX(t.updated_at), p.updated_at)) AS last_activity
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE ${ACCESSIBLE_PROJECT} AND p.status <> 'COMPLETED'
       GROUP BY p.id
       ORDER BY last_activity DESC
       LIMIT 5`,
      [today, userId, userId],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(DATE_ADD(t.completed_at, INTERVAL ? MINUTE), '%Y-%m-%d') AS day, COUNT(*) AS count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE ${ACCESSIBLE_PROJECT} AND t.status = 'COMPLETED' AND t.completed_at >= ?
       GROUP BY day`,
      [utcOffsetMinutes, userId, userId, trendStartUtc],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT t.id, t.title, t.status, t.priority, t.updated_at, t.created_at, t.project_id,
              p.name AS project_name, u.name AS assignee_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE ${ACCESSIBLE_PROJECT}
       ORDER BY t.updated_at DESC, t.id DESC
       LIMIT 6`,
      [userId, userId],
    ),
  ]);

  const trendCounts = new Map(trendRows.map((row) => [String(row.day), toNumber(row.count)]));
  const completionTrend = Array.from({ length: TREND_DAYS }, (_, index) => {
    const day = addDays(trendStartKey, index);
    return { date: day, count: trendCounts.get(day) ?? 0 };
  });

  return {
    today,
    tasks: {
      total: toNumber(taskSummary.total),
      todo: toNumber(taskSummary.todo),
      in_progress: toNumber(taskSummary.in_progress),
      completed: toNumber(taskSummary.completed),
      overdue: toNumber(taskSummary.overdue),
      due_this_week: toNumber(taskSummary.due_this_week),
      my_open: toNumber(taskSummary.my_open),
      my_overdue: toNumber(taskSummary.my_overdue),
      completed_last_7_days: toNumber(taskSummary.completed_last_7_days),
      unassigned: toNumber(taskSummary.unassigned),
    },
    projects: {
      total: toNumber(projectSummary.total),
      active: toNumber(projectSummary.active),
      planning: toNumber(projectSummary.planning),
      on_hold: toNumber(projectSummary.on_hold),
      completed: toNumber(projectSummary.completed),
    },
    my_tasks: myTasks,
    deadlines,
    project_progress: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      end_date: project.end_date,
      task_count: toNumber(project.task_count),
      completed_count: toNumber(project.completed_count),
      overdue_count: toNumber(project.overdue_count),
      last_activity: project.last_activity,
    })),
    completion_trend: completionTrend,
    recent_activity: activity,
  };
}
