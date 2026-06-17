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
  if (dbTableCache.has(tableName)) {
    return dbTableCache.get(tableName);
  }

  try {
    const { query } = await import('@/lib/db');
    const result = await query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?) AS exists`,
      [tableName]
    );
    const exists = !!result[0]?.exists;
    dbTableCache.set(tableName, exists);
    return exists;
  } catch (error) {
    dbTableCache.set(tableName, false);
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

async function writeToTable(tableName, data) {
  if (!isServer) return false;
  const records = Array.isArray(data) ? data : [data];
  const { query } = await import('@/lib/db');

  await query('BEGIN');
  try {
    for (const rec of records) {
      const keys = Object.keys(rec || {});
      if (keys.length === 0) continue;

      const cols = keys.map((k) => `\`${k}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => {
        const v = rec[k];
        return v === undefined ? null : (typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      });
      const updates = keys.map((k) => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

      const sql = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await query(sql, values);
    }

    await query('COMMIT');
    return true;
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
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

  return [];
}

export async function writeData(name, data) {
  const dataset = getDatasetName(name);

  if (isServer) {
    try {
      if (await hasTable(dataset)) {
        return await writeToTable(dataset, data);
      }
    } catch (error) {
      console.error(`SQL writeData to table failed for ${name}:`, error.message);
    }

    try {
      if (await hasTable(APP_DATA_TABLE)) {
        return await writeToAppData(dataset, data);
      }
    } catch (error) {
      console.error(`SQL writeData failed for ${name}:`, error.message);
    }
  }

  throw new Error(`No storage target found for ${name}`);
}

export default { readData, writeData };
