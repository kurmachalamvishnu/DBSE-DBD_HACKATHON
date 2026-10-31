const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a high-performance connection pool for MySQL 8.0
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'healthcare_queue_db',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true
});

// Test connection on boot
pool.getConnection()
  .then((conn) => {
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_NAME}) on port ${process.env.DB_PORT || 3306}`);
    conn.release();
  })
  .catch((err) => {
    console.error(`[Database Error] Failed to connect to MySQL:`, err.message);
  });

module.exports = pool;
