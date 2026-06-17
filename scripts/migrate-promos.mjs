import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/lib/db-es.mjs';
import { convertTimestamp, nullIfUndefined, truncate } from './migrate-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function migratePromos() {
  try {
    console.log('🔄 Migrating promos.json...');
    
    // 1. Read JSON
    const raw = await fs.readFile(path.join(rootDir, 'promos.json'), 'utf-8');
    const promos = JSON.parse(raw);
    
    console.log(`  📊 Found ${promos.length} records in JSON`);
    
    // 2. Backup
    await query('CREATE TABLE IF NOT EXISTS promos_backup AS SELECT * FROM promos WHERE FALSE');
    await query('DELETE FROM promos_backup');
    await query('INSERT INTO promos_backup SELECT * FROM promos');
    console.log('  ✓ Backup created');
    
    // 3. Clear table
    await query('DELETE FROM promos');
    console.log('  ✓ Table cleared');
    
    // 4. Insert each promo
    for (const promo of promos) {
      const sql = `
        INSERT INTO promos (
          id, vendor_id, vendor_name, title, image, promo_price,
          description, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        promo.id,
        promo.vendorId,
        promo.vendorName,
        promo.title,
        truncate(promo.image, 65535) || null,
        promo.promoPrice || null,
        promo.description || null,
        promo.active !== undefined ? promo.active : true,
        convertTimestamp(promo.createdAt),
        convertTimestamp(promo.updatedAt) || convertTimestamp(new Date().toISOString())
      ];
      
      await query(sql, values);
    }
    
    console.log(`  ✓ Inserted ${promos.length} records`);
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM promos');
    const count = result[0].count;
    
    if (count === promos.length) {
      console.log(`✅ promos migration SUCCESS: ${count} records\n`);
      return { success: true, table: 'promos', count };
    } else {
      console.error(`❌ MISMATCH: Expected ${promos.length}, got ${count}`);
      return { success: false, table: 'promos', error: 'count mismatch' };
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return { success: false, table: 'promos', error: error.message };
  }
}

export default migratePromos;

migratePromos();
