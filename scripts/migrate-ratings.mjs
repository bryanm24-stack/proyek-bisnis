import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/lib/db-es.mjs';
import { convertTimestamp, nullIfUndefined } from './migrate-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function migrateRatings() {
  try {
    console.log('🔄 Migrating ratings.json...');
    
    // 1. Read JSON
    const raw = await fs.readFile(path.join(rootDir, 'ratings.json'), 'utf-8');
    const ratings = JSON.parse(raw);
    
    console.log(`  📊 Found ${ratings.length} records in JSON`);
    
    // 2. Backup
    await query('CREATE TABLE IF NOT EXISTS ratings_backup AS SELECT * FROM ratings WHERE FALSE');
    await query('DELETE FROM ratings_backup');
    await query('INSERT INTO ratings_backup SELECT * FROM ratings');
    console.log('  ✓ Backup created');
    
    // 3. Clear table
    await query('DELETE FROM ratings');
    console.log('  ✓ Table cleared');
    
    // 4. Insert each rating
    for (const rating of ratings) {
      const sql = `
        INSERT INTO ratings (id, service_id, customer_id, vendor_id, rating, review, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        rating.id,
        rating.serviceId,
        rating.customerId,
        rating.vendorId,
        rating.rating,
        rating.review || null,
        convertTimestamp(rating.createdAt)
      ];
      
      await query(sql, values);
    }
    
    console.log(`  ✓ Inserted ${ratings.length} records`);
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM ratings');
    const count = result[0].count;
    
    if (count === ratings.length) {
      console.log(`✅ ratings migration SUCCESS: ${count} records\n`);
      return { success: true, table: 'ratings', count };
    } else {
      console.error(`❌ MISMATCH: Expected ${ratings.length}, got ${count}`);
      return { success: false, table: 'ratings', error: 'count mismatch' };
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return { success: false, table: 'ratings', error: error.message };
  }
}

export default migrateRatings;

migrateRatings();
