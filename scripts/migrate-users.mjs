import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/lib/db-es.mjs';
import { convertTimestamp, nullIfUndefined } from './migrate-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function migrateUsers() {
  try {
    console.log('🔄 Migrating users.json...');
    
    // 1. Read JSON
    const raw = await fs.readFile(path.join(rootDir, 'users.json'), 'utf-8');
    const users = JSON.parse(raw);
    
    console.log(`  📊 Found ${users.length} records in JSON`);
    
    // 2. Backup existing
    await query('CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users WHERE FALSE');
    await query('DELETE FROM users_backup');
    await query('INSERT INTO users_backup SELECT * FROM users');
    console.log('  ✓ Backup created');
    
    // 3. Clear table
    await query('DELETE FROM users');
    console.log('  ✓ Table cleared');
    
    // 4. Insert each user
    for (const user of users) {
      const sql = `
        INSERT INTO users (id, username, password, name, role, email, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        user.id,
        user.username,
        user.password,
        user.name,
        user.role,
        user.email,
        user.phone,
        convertTimestamp(user.createdAt)
      ];
      
      await query(sql, values);
    }
    
    console.log(`  ✓ Inserted ${users.length} records`);
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM users');
    const count = result[0].count;
    
    if (count === users.length) {
      console.log(`✅ users migration SUCCESS: ${count} records\n`);
      return { success: true, table: 'users', count };
    } else {
      console.error(`❌ MISMATCH: Expected ${users.length}, got ${count}`);
      return { success: false, table: 'users', error: 'count mismatch' };
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return { success: false, table: 'users', error: error.message };
  }
}

export default migrateUsers;

// Run if called directly
migrateUsers();
