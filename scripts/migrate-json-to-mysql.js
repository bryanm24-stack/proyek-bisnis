const db = require('../src/lib/db.js');
const pool = db.pool;

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const fs = require('fs').promises;

function camelToSnake(key) {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

async function getColumns(pool, table) {
  const [rows] = await pool.execute(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`,
    [table]
  );
  return rows.map((r) => ({ name: r.column_name, type: r.data_type }));
}

async function migrateDataset(pool, dataset, filePath) {
  console.log(`\nMigrating ${dataset} from ${filePath} --> table ${dataset}`);
  const raw = await fs.readFile(filePath, 'utf-8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    console.error(`  Failed to parse JSON ${filePath}:`, err.message);
    return;
  }
  if (!Array.isArray(items)) items = [items];
  if (items.length === 0) {
    console.log('  No items to migrate.');
    return;
  }

  const cols = await getColumns(pool, dataset).catch((e) => {
    console.error('  Could not read table columns for', dataset, e.message);
    return null;
  });
  if (!cols || cols.length === 0) {
    console.log(`  Table ${dataset} has no columns or does not exist; skipping.`);
    return;
  }

  const colNames = cols.map(c => c.name);
  // We'll upsert each record by inserting columns that match keys
  let migrated = 0;
  for (const rec of items) {
    const keys = Object.keys(rec || {});
    if (keys.length === 0) continue;

    // Find matching columns: exact key, or snake_case variant
    const matched = [];
    const values = [];
    for (const k of keys) {
      if (colNames.includes(k)) {
        matched.push(k);
        const v = rec[k];
        values.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      } else {
        const s = camelToSnake(k);
        if (colNames.includes(s)) {
          matched.push(s);
          const v = rec[k];
          values.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
        }
      }
    }

    if (matched.length === 0) {
      // nothing to insert
      continue;
    }

    const colsEsc = matched.map(c => `\`${c}\``).join(', ');
    const placeholders = matched.map(() => '?').join(', ');
    const updates = matched.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
    const sql = `INSERT INTO \`${dataset}\` (${colsEsc}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;

    // Use a dedicated connection per-record transaction so BEGIN/COMMIT are effective
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      await conn.execute(sql, values);
      await conn.commit();
      migrated++;
    } catch (err) {
      if (conn) {
        try { await conn.rollback(); } catch (e) {}
      }
      console.error('  Failed to upsert record (skipping):', err.message);
    } finally {
      if (conn) conn.release();
    }
  }

  console.log(`  Migrated ${migrated}/${items.length} records into ${dataset}`);
}

async function main() {
  const root = process.cwd();
  // list JSON files we expect to migrate (common datasets)
  const candidates = [
    'users', 'services', 'chats', 'deals', 'transactions', 'invoices',
    'favorites', 'notifications', 'ratings', 'promos', 'vendor_registrations',
    'orders', 'returns', 'invoice_counter'
  ];

  for (const name of candidates) {
    const fp = path.join(root, `${name}.json`);
    if (await fileExists(fp)) {
      await migrateDataset(pool, name, fp);
    } else {
      // skip missing files silently
    }
  }

  console.log('\nMigration finished.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
