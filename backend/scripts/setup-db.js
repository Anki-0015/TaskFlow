require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const databaseName = process.env.DB_NAME || 'taskflow';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: databaseName,
    multipleStatements: true,
  });

  try {
    // Match the API's UTC session so timestamps written here are UTC too.
    await connection.query("SET time_zone = '+00:00'");
    const localSchemaPath = path.resolve(__dirname, '../../database/schema.sql');
    const containerSchemaPath = path.resolve(__dirname, '../database/schema.sql');
    const schemaPath = fs.existsSync(localSchemaPath) ? localSchemaPath : containerSchemaPath;
    const schema = fs.readFileSync(schemaPath, 'utf8')
      .replace(/CREATE DATABASE IF NOT EXISTS taskflow[^;]*;\s*/i, '')
      .replace(/USE taskflow;\s*/i, '');
    await connection.query(schema);
    const [usernameColumn] = await connection.query(
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'`,
      [databaseName]
    );
    if (usernameColumn.length === 0) {
      await connection.query('ALTER TABLE users ADD COLUMN username VARCHAR(40) NULL AFTER name');
      await connection.query("UPDATE users SET username = CONCAT(LEFT(REGEXP_REPLACE(SUBSTRING_INDEX(email, '@', 1), '[^a-zA-Z0-9_]', ''), 30), id) WHERE username IS NULL");
      await connection.query('ALTER TABLE users MODIFY username VARCHAR(40) NOT NULL, ADD UNIQUE INDEX uq_users_username (username)');
      console.log('Added unique usernames to existing user accounts.');
    }
    const [sessionVersionColumn] = await connection.query(
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'session_version'`,
      [databaseName]
    );
    if (sessionVersionColumn.length === 0) {
      await connection.query('ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER password');
      console.log('Added session versioning for password-change sign-outs.');
    }
    const [completedAtColumn] = await connection.query(
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'completed_at'`,
      [databaseName]
    );
    if (completedAtColumn.length === 0) {
      await connection.query('ALTER TABLE tasks ADD COLUMN completed_at DATETIME NULL DEFAULT NULL AFTER due_date, ADD INDEX idx_tasks_completed_at (completed_at)');
      await connection.query("UPDATE tasks SET completed_at = updated_at WHERE status = 'COMPLETED'");
      console.log('Added task completion timestamps for dashboard trends.');
    }
    const [projectUpdatedIndex] = await connection.query(
      `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND INDEX_NAME = 'idx_tasks_project_updated'`,
      [databaseName]
    );
    if (projectUpdatedIndex.length === 0) {
      await connection.query('ALTER TABLE tasks ADD INDEX idx_tasks_project_updated (project_id, updated_at)');
    }
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`TaskFlow schema ready. Tables: ${tables.map((row) => Object.values(row)[0]).join(', ')}`);
  } finally {
    await connection.end();
  }
}

setupDatabase().catch((error) => {
  console.error(`Database setup failed (${error.code || 'error'}): ${error.message}`);
  process.exitCode = 1;
});
