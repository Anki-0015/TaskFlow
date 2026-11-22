require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const LOCAL_ADMIN_PASSWORD = 'TaskFlow-Local-Admin-2026!';

function getAdminBootstrapConfig() {
  const values = {
    name: process.env.ADMIN_NAME || '',
    email: process.env.ADMIN_EMAIL || '',
    username: process.env.ADMIN_USERNAME || '',
    password: process.env.ADMIN_PASSWORD || '',
  };
  const configured = Object.values(values).filter((value) => value.trim() !== '').length;

  if (configured === 0) return null;
  if (configured !== Object.keys(values).length) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD together.');
  }

  const config = {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    username: values.username.trim().toLowerCase(),
    // Passwords are intentionally not trimmed; whitespace may be part of the credential.
    password: values.password,
  };
  const emailIsValid = config.email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email);
  const passwordBytes = Buffer.byteLength(config.password, 'utf8');

  if (!config.name || config.name.length > 100) {
    throw new Error('ADMIN_NAME must be between 1 and 100 characters.');
  }
  if (!emailIsValid || /@example\.(com|net|org)$/i.test(config.email)) {
    throw new Error('Set ADMIN_EMAIL to a real, valid email address.');
  }
  if (!/^[a-z0-9_]{3,40}$/.test(config.username)) {
    throw new Error('ADMIN_USERNAME must be 3–40 characters using lowercase letters, numbers or underscores.');
  }
  if (passwordBytes < 16 || passwordBytes > 72 || /^(replace|change|your)[-_ ]/i.test(config.password)) {
    throw new Error('ADMIN_PASSWORD must be a unique secret between 16 and 72 UTF-8 bytes.');
  }
  if (process.env.NODE_ENV === 'production' && (
    config.password === LOCAL_ADMIN_PASSWORD || config.email.endsWith('@taskflow.local')
  )) {
    throw new Error('Replace the local development admin credentials with a real email and unique password before production setup.');
  }

  return config;
}

async function ensureAdminAccount(connection, config) {
  const [accounts] = await connection.query(
    'SELECT id, email, username, role FROM users WHERE email = ? OR username = ?',
    [config.email, config.username]
  );

  if (accounts.length > 1 || (accounts.length === 1 && (
    accounts[0].email.toLowerCase() !== config.email || accounts[0].username.toLowerCase() !== config.username
  ))) {
    throw new Error('ADMIN_EMAIL and ADMIN_USERNAME must identify the same existing account, or both be unused.');
  }

  let account = accounts[0];
  if (!account) {
    const passwordHash = await bcrypt.hash(config.password, 12);
    try {
      const [result] = await connection.query(
        'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, \'admin\')',
        [config.name, config.username, config.email, passwordHash]
      );
      account = { id: result.insertId, role: 'admin' };
    } catch (error) {
      // Another backend may have bootstrapped the same account at the same time.
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      const [concurrentAccounts] = await connection.query(
        'SELECT id, email, username, role FROM users WHERE email = ? OR username = ?',
        [config.email, config.username]
      );
      if (concurrentAccounts.length !== 1 ||
          concurrentAccounts[0].email.toLowerCase() !== config.email ||
          concurrentAccounts[0].username.toLowerCase() !== config.username) {
        throw new Error('ADMIN_EMAIL or ADMIN_USERNAME conflicts with an existing account.');
      }
      account = concurrentAccounts[0];
    }
  }

  if (account.role !== 'admin') {
    await connection.query(
      'UPDATE users SET role = \'admin\', session_version = session_version + 1 WHERE id = ?',
      [account.id]
    );
    console.log('Configured account promoted to administrator; existing sessions were revoked.');
  } else {
    console.log('Administrator account is ready.');
  }
}

async function setupDatabase() {
  const adminConfig = getAdminBootstrapConfig();
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
    const [demotedSeedAdmins] = await connection.query(
      "UPDATE users SET role = 'member', session_version = session_version + 1 WHERE email IN ('alice@taskflow.dev', 'bob@taskflow.dev') AND role = 'admin'"
    );
    if (demotedSeedAdmins.affectedRows > 0) {
      console.log('Demoted legacy demo accounts from administrator and revoked their existing sessions.');
    }
    if (adminConfig) {
      await ensureAdminAccount(connection, adminConfig);
      console.log('The configured admin password is only used when the account is first created.');
    } else {
      console.log('Admin bootstrap skipped; no ADMIN_* credentials are configured.');
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
