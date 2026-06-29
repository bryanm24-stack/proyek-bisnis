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
  // Normalize params: convert Date objects and ISO strings to MySQL DATETIME(3) format
  const normalizeDate = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  };

  const convertedParams = (params || []).map(p => {
    if (!p && p !== 0) return p; // keep null/undefined as-is
    if (p instanceof Date) return normalizeDate(p);
    if (typeof p === 'string') {
      // match ISO-like string e.g. 2026-06-17T16:41:43.378Z
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;
      if (isoRegex.test(p)) {
        const parsed = new Date(p);
        if (!isNaN(parsed.getTime())) return normalizeDate(parsed);
      }
    }
    return p;
  });

  const [rows] = await pool.execute(sql, convertedParams);
  return rows;
}

module.exports = { pool, query };
