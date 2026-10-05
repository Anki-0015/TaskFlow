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
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
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
