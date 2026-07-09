const fs = require('fs');
const path = require('path');
const db = require('./src/lib/db');

// Read services.json (source of truth for this script)
const filePath = path.join(process.cwd(), 'services.json');
let data = fs.readFileSync(filePath, 'utf-8');
data = data.replace(/^\uFEFF/, ''); // Remove BOM if exists
const services = JSON.parse(data);

(async function upsertServices() {
  // ensure a simple storage table exists for services JSON
  const createSql = `CREATE TABLE IF NOT EXISTS services_json (
    id VARCHAR(255) PRIMARY KEY,
    data LONGTEXT
  )`;
  await db.query(createSql);

  let upserted = 0;
  for (const svc of services) {
    const id = svc.id || svc._id || svc.uuid || null;
    const payload = JSON.stringify(svc);
    if (!id) continue;
    const sql = `INSERT INTO services_json (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`;
    try {
      await db.query(sql, [String(id), payload]);
      upserted++;
    } catch (err) {
      console.error('Failed to upsert service', id, err.message);
    }
  }

  console.log(` Upserted ${upserted}/${services.length} services into SQL table services_json`);
})();
