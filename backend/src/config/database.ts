import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'taskflow',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'Z',
});

// mysql2 reads DATETIME values as UTC ('Z'), so the session must also write UTC.
// Without this, CURRENT_TIMESTAMP defaults use the MySQL server's zone and drift from UTC_TIMESTAMP().
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export async function testConnection(): Promise<void> {
  const connection = await pool.getConnection();
  console.log('✅  MySQL connected successfully');
  connection.release();
}

export default pool;
