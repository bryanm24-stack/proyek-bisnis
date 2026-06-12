const fs = require('fs').promises;
const path = require('path');
const db = require('../src/lib/db.js');

async function ensureTable() {
  const sql = `CREATE TABLE IF NOT EXISTS json_store (
    \`key\` VARCHAR(191) PRIMARY KEY,
    \`value\` LONGTEXT
  )`;
  await db.query(sql);
}

async function migrateRootJson() {
  const root = process.cwd();
  const entries = await fs.readdir(root, { withFileTypes: true });
  const jsons = entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => e.name);
  if (jsons.length === 0) {
    console.log('No root JSON files found.');
    return;
  }
  try {
    await ensureTable();
  } catch (err) {
    // Try create database if missing (ER_BAD_DB_ERROR)
    if (err && err.code === 'ER_BAD_DB_ERROR') {
      console.log('Database does not exist. Attempting to create database', process.env.DB_NAME || 'proyek');
      // create a temporary connection without database
      const mysql = require('mysql2/promise');
      const host = process.env.DB_HOST || '127.0.0.1';
      const user = process.env.DB_USER || 'root';
      const password = process.env.DB_PASS || process.env.DB_PASSWORD || '';
      const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
      const dbName = process.env.DB_NAME || 'proyek';
      const tmpPool = await mysql.createPool({ host, user, password, port, waitForConnections: true, connectionLimit: 1 });
      try {
        await tmpPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log('Created database', dbName);
      } finally {
        await tmpPool.end();
      }
      // retry ensureTable
      await ensureTable();
    } else {
      throw err;
    }
  }
  let migrated = 0;
  for (const fn of jsons) {
    const fp = path.join(root, fn);
    try {
      const raw = await fs.readFile(fp, 'utf8');
      const parsed = (() => {
        try { return JSON.parse(raw); } catch { return raw; }
      })();
      const payload = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      const key = path.basename(fn, '.json');
      await db.query('INSERT INTO json_store (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, payload]);
      migrated++;
      console.log('Migrated', fn, '->', key);
    } catch (err) {
      console.error('Failed', fn, err.message);
    }
  }
  console.log(`Migrated ${migrated}/${jsons.length} files.`);
}

migrateRootJson().catch(err => { console.error(err); process.exit(1); });
