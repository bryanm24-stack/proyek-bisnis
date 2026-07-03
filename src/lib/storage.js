const isServer = typeof window === 'undefined';

const datasetMap = {
  user: 'users',
  users: 'users',
  registration: 'vendor_registrations',
  registrations: 'vendor_registrations',
  vendor_registration: 'vendor_registrations',
  vendor_registrations: 'vendor_registrations',
  transaction: 'transactions',
  transactions: 'transactions',
  deal: 'deals',
  deals: 'deals',
  chat: 'chats',
  chats: 'chats',
  c_h_a_t_s_: 'chats',
  invoice: 'invoices',
  invoices: 'invoices',
  rating: 'ratings',
  ratings: 'ratings',
  promo: 'promos',
  promos: 'promos',
  favorite: 'favorites',
  favorites: 'favorites',
  notification: 'notifications',
  notifications: 'notifications',
  service: 'services',
  services: 'services',
  order: 'orders',
  orders: 'orders',
  return: 'returns',
  returns: 'returns'
};

const APP_DATA_TABLE = 'app_data';
const dbTableCache = new Map();

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getDatasetName(name) {
  const normalized = normalizeKey(name);
  return datasetMap[normalized] || normalized;
}

// filePathFor removed to avoid top-level requires; use dynamic import('path') where needed

async function hasTable(tableName) {
  if (!isServer) return false;

  // Always check fresh without cache, to catch table creation at runtime
  try {
    const { query } = await import('@/lib/db');
    const result = await query(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );
    const exists = Number(result[0]?.cnt || 0) > 0;
    return exists;
  } catch (error) {
    console.error(`hasTable error checking ${tableName}:`, error.message);
    return false;
  }
}

function normalizeJsonData(raw) {
  if (!raw) return [];
  try {
    const sanitized = raw.replace(/^\uFEFF/, '').trim();
    return sanitized ? JSON.parse(sanitized) : [];
  } catch {
    return [];
  }
}

function toCamelCase(key) {
  return String(key || '').replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function toSnakeCase(key) {
  return String(key || '').replace(/([A-Z])/g, (_, char) => `_${char.toLowerCase()}`);
}

function normalizeRecord(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = toCamelCase(key);

    if (value === null || value === undefined) {
      normalized[normalizedKey] = value;
      continue;
    }

    if (value instanceof Date) {
      normalized[normalizedKey] = value.toISOString();
    } else if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) {
        normalized[normalizedKey] = new Date(`${value.replace(' ', 'T')}Z`).toISOString();
      } else {
        try {
          normalized[normalizedKey] = JSON.parse(value);
        } catch {
          normalized[normalizedKey] = value;
        }
      }
    } else {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

async function readFromJsonFile(dataset) {
  if (!isServer) return [];
  const fs = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const filepath = path.join(__dirname, '..', '..', `${dataset}.json`);
  try {
    const raw = await fs.readFile(filepath, 'utf-8');
    return normalizeJsonData(raw);
  } catch {
    return [];
  }
}

async function writeToJsonFile(dataset, data) {
  if (!isServer) return false;
  const fs = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const filepath = path.join(__dirname, '..', '..', `${dataset}.json`);
  try {
    await fs.writeFile(filepath, JSON.stringify(Array.isArray(data) ? data : [data], null, 2), 'utf-8');
    return true;
  } catch (error) {
    throw error;
  }
}

async function writeToAppData(dataset, data) {
  const records = Array.isArray(data) ? data : [data];
  const rows = records.map((item) => {
    const id = item?.id || item?.record_id;
    const record_id = id ? String(id) : (isServer && globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    return { dataset, record_id, data: item };
  });
  if (!isServer) {
    // No DB on client — can't write to server-side app_data
    return false;
  }

  const { query } = await import('@/lib/db');
  await query('BEGIN');
  try {
    await query(`DELETE FROM ${APP_DATA_TABLE} WHERE dataset = ?`, [dataset]);

    if (rows.length > 0) {
      const insertPlaceholders = rows
        .map(() => '(?, ?, ?)')
        .join(', ');

      const insertValues = rows.flatMap((row) => [row.dataset, row.record_id, row.data]);
      await query(
        `INSERT INTO ${APP_DATA_TABLE} (dataset, record_id, data) VALUES ${insertPlaceholders}`,
        insertValues
      );
    }

    await query('COMMIT');
    return true;
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

async function readFromTable(tableName) {
  if (!isServer) return [];
  const { query } = await import('@/lib/db');
  const res = await query(`SELECT * FROM ${tableName} ORDER BY id`);
  return res.map((row) => normalizeRecord(row));
}

async function readFromAppData(dataset) {
  if (!isServer) return [];
  const { query } = await import('@/lib/db');
  const rows = await query(
    `SELECT data FROM ${APP_DATA_TABLE} WHERE dataset = ? ORDER BY record_id`,
    [dataset]
  );
  return rows.map((row) => normalizeJsonData(row.data)).flat();
}

async function writeToTable(tableName, data) {
  if (!isServer) return false;
  const records = Array.isArray(data) ? data : [data];
  const { pool } = await import('@/lib/db');

  const conn = await pool.getConnection();
  try {
    await conn.query('BEGIN');
    for (const rec of records) {
      const keys = Object.keys(rec || {});
      if (keys.length === 0) continue;
      // Map JS camelCase keys to snake_case DB columns when inserting
      const columnNames = keys.map((k) => toSnakeCase(k));
      const cols = columnNames.map((c) => `\`${c}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      // For values: only stringify arrays and plain objects, convert ISO dates to MySQL format
      const values = keys.map((k) => {
        const v = rec[k];
        if (v === undefined || v === null) return null;
        // Convert ISO 8601 strings to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
          return v.replace('T', ' ').replace(/\.\d{3}Z?$/, '');
        }
        if (typeof v === 'object' && v !== null) {
          // Only stringify arrays and objects, not Date or other types
          if (Array.isArray(v) || v.constructor === Object) {
            return JSON.stringify(v);
          }
        }
        return v;
      });
      const updates = columnNames.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');

      const sql = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await conn.execute(sql, values);
    }

    await conn.query('COMMIT');
    return true;
  } catch (err) {
    try {
      await conn.query('ROLLBACK');
    } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteFromTable(tableName, condition) {
  if (!isServer) return false;
  const keys = Object.keys(condition || {});
  if (keys.length === 0) {
    throw new Error('deleteFromTable requires condition object');
  }

  const { pool } = await import('@/lib/db');
  const conn = await pool.getConnection();
  try {
    const whereClause = keys.map((key) => `\`${toSnakeCase(key)}\` = ?`).join(' AND ');
    const values = keys.map((key) => condition[key]);
    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    const [result] = await conn.execute(sql, values);
    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

async function deleteFromAppData(dataset, condition) {
  if (!isServer) return false;
  const { query } = await import('@/lib/db');
  const rows = await query(`SELECT record_id, data FROM ${APP_DATA_TABLE} WHERE dataset = ?`, [dataset]);
  const recordsToDelete = [];

  for (const row of rows) {
    const item = normalizeJsonData(row.data);
    if (matchesCondition(item, condition)) {
      recordsToDelete.push(row.record_id);
    }
  }

  if (recordsToDelete.length === 0) return false;
  const placeholders = recordsToDelete.map(() => '?').join(', ');
  await query(`DELETE FROM ${APP_DATA_TABLE} WHERE dataset = ? AND record_id IN (${placeholders})`, [dataset, ...recordsToDelete]);
  return true;
}

function matchesCondition(item, condition) {
  if (!item || typeof item !== 'object' || !condition || typeof condition !== 'object') return false;
  return Object.entries(condition).every(([key, value]) => String(item[key]) === String(value));
}

async function deleteFromJsonFile(dataset, condition) {
  if (!isServer) return false;
  const data = await readFromJsonFile(dataset);
  if (!Array.isArray(data)) return false;

  const filtered = data.filter((item) => !matchesCondition(item, condition));
  if (filtered.length === data.length) return false;

  await writeToJsonFile(dataset, filtered);
  return true;
}

export async function readData(name) {
  const dataset = getDatasetName(name);

  try {
    if (isServer) {
      if (await hasTable(dataset)) {
        return await readFromTable(dataset);
      }

      if (await hasTable(APP_DATA_TABLE)) {
        return await readFromAppData(dataset);
      }
    }
  } catch (error) {
    console.error(`readData SQL error for ${name}:`, error.message);
  }

  try {
    return await readFromJsonFile(dataset);
  } catch (error) {
    console.error(`readData JSON fallback failed for ${name}:`, error.message);
  }

  return [];
}

export async function writeData(name, data) {
  const dataset = getDatasetName(name);

  // Strict SQL-only for promos: no JSON fallback
  if (dataset === 'promos') {
    if (!isServer) {
      throw new Error('Cannot write promos from client');
    }
    
    try {
      if (await hasTable(dataset)) {
        console.debug(`writeData: writing promos to SQL table ${dataset}`);
        return await writeToTable(dataset, data);
      }
    } catch (error) {
      console.error(`SQL writeData to promos table failed:`, error.message);
      throw error;
    }
    
    try {
      if (await hasTable(APP_DATA_TABLE)) {
        console.debug(`writeData: writing promos to app_data`);
        return await writeToAppData(dataset, data);
      }
    } catch (error) {
      console.error(`SQL writeData to app_data failed for promos:`, error.message);
      throw error;
    }
    
    throw new Error(`Promos table does not exist`);
  }

  // Other datasets: try SQL first, then fallback
  if (isServer) {
    try {
      if (await hasTable(dataset)) {
        console.debug(`writeData: writing to SQL table ${dataset}`);
        return await writeToTable(dataset, data);
      }
    } catch (error) {
      console.error(`SQL writeData to table failed for ${name}:`, error.message);
    }

    try {
      if (await hasTable(APP_DATA_TABLE)) {
        console.debug(`writeData: writing to app_data for ${dataset}`);
        return await writeToAppData(dataset, data);
      }
    } catch (error) {
      console.error(`SQL writeData failed for ${name}:`, error.message);
    }
  }

  try {
    console.debug(`writeData: falling back to JSON file for ${dataset}`);
    return await writeToJsonFile(dataset, data);
  } catch (error) {
    console.error(`JSON writeData failed for ${name}:`, error.message);
  }

  throw new Error(`No storage target found for ${name}`);
}

export async function deleteData(name, condition) {
  const dataset = getDatasetName(name);

  if (!isServer) {
    throw new Error('Cannot delete promos from client');
  }

  if (await hasTable(dataset)) {
    console.debug(`deleteData: deleting from SQL table ${dataset}`, condition);
    return await deleteFromTable(dataset, condition);
  }

  if (await hasTable(APP_DATA_TABLE)) {
    console.debug(`deleteData: deleting from app_data ${dataset}`, condition);
    return await deleteFromAppData(dataset, condition);
  }

  console.debug(`deleteData: falling back to JSON file for ${dataset}`, condition);
  return await deleteFromJsonFile(dataset, condition);
}

export default { readData, writeData, deleteData };
