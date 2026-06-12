import mysql from 'mysql2/promise';

function buildDatabaseUrl() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'rent_guard';
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const databaseUrl = process.env.DATABASE_URL || buildDatabaseUrl();
const url = new URL(databaseUrl);
const pool = mysql.createPool({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username || 'root'),
  password: decodeURIComponent(url.password || ''),
  database: url.pathname?.slice(1),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(text, params) {
  const [rows] = await pool.execute(text, params);
  return { rows };
}

export default { query };
