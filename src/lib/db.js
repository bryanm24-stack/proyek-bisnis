const mysql = require('mysql2/promise');

const {
  DB_HOST = process.env.DB_HOST,
  DB_USER = process.env.DB_USER,
  DB_PASS = process.env.DB_PASS,
  DB_NAME = process.env.DB_NAME,
  DB_PORT = process.env.DB_PORT || 3306,
  DATABASE_URL
} = process.env;

let pool;
if (DATABASE_URL) {
  pool = mysql.createPool(DATABASE_URL);
} else {
  pool = mysql.createPool({
    host: DB_HOST || '127.0.0.1',
    user: DB_USER || 'root',
    password: DB_PASS || '',
    database: DB_NAME || 'rent_guard',
    port: Number(DB_PORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params || []);
  return rows;
}

module.exports = { pool, query };
