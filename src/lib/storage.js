const isServer = typeof window === 'undefined';

// Avoid importing Node-only modules at top-level so this file can be bundled
// for browser client components. Use dynamic imports and runtime guards.

// `query` (database) will be dynamically imported when running on server.

const fileMap = {
  users: 'users.json',
  services: 'services.json',
  chats: 'chats.json',
  deals: 'deals.json',
  transactions: 'transactions.json',
  invoices: 'invoices.json',
  ratings: 'ratings.json',
  promos: 'promos.json',
  favorites: 'favorites.json',
  notifications: 'notifications.json',
  vendor_registrations: 'vendor_registrations.json',
  orders: 'orders.json',
  returns: 'returns.json',
  invoice_counter: 'invoice_counter.json'
};

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

function filePathFor(name) {
  if (!isServer) throw new Error('filePathFor is only available on server');
  const file = fileMap[name];
  if (!file) throw new Error(`No file mapping for ${name}`);
  // dynamic import of path to avoid bundling it into client
  // path.join is synchronous so import then call
  // eslint-disable-next-line no-undef
  const p = require('path');
  return p.join(process.cwd(), file);
}

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
    const exists = !!result.rows[0]?.exists;
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

async function readFromAppData(dataset) {
  if (!isServer) return [];
  const { query } = await import('@/lib/db');
  const res = await query(
    `SELECT data FROM ${APP_DATA_TABLE} WHERE dataset = ? ORDER BY record_id`,
    [dataset]
  );
  return res.rows.map((row) => row.data || {});
}

async function writeToAppData(dataset, data) {
  const records = Array.isArray(data) ? data : [data];
  const rows = records.map((item) => ({
    dataset,
    record_id: String(item?.id || item?.record_id || (isServer ? require('crypto').randomUUID() : `client-${Date.now()}`)),
    data: item
  }));
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
  return res.rows;
}

export async function readData(name) {
  const dataset = getDatasetName(name);

  try {
    if (isServer) {
      if (await hasTable(APP_DATA_TABLE)) {
        return await readFromAppData(dataset);
      }

      if (await hasTable(dataset)) {
        return await readFromTable(dataset);
      }
    }
  } catch {
    // DB fallback to JSON file
  }

  try {
    if (!isServer) return [];
    const p = filePathFor(dataset);
    const { readFile } = await import('fs/promises');
    const raw = await readFile(p, 'utf-8');
    return normalizeJsonData(raw);
  } catch {
    return [];
  }
}

export async function writeData(name, data) {
  const dataset = getDatasetName(name);

  try {
    if (await hasTable(APP_DATA_TABLE)) {
      return await writeToAppData(dataset, data);
    }
  } catch (error) {
    console.error(`SQL writeData failed for ${name}:`, error.message);
  }

  try {
    if (!isServer) {
      // client can't write files
      return false;
    }

    const p = filePathFor(dataset);
    const { writeFile } = await import('fs/promises');
    await writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`writeData failed for ${name}:`, err.message);
    throw err;
  }
}

export default { readData, writeData };
