import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/lib/db-es.mjs';
import { convertTimestamp, nullIfUndefined, truncate } from './migrate-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function migrateChats() {
  try {
    console.log('🔄 Migrating chats.json...');
    
    // 1. Read JSON
    const raw = await fs.readFile(path.join(rootDir, 'chats.json'), 'utf-8');
    const chats = JSON.parse(raw);
    
    console.log(`  📊 Found ${chats.length} records in JSON`);
    
    // 2. Backup
    await query('CREATE TABLE IF NOT EXISTS chats_backup AS SELECT * FROM chats WHERE FALSE');
    await query('DELETE FROM chats_backup');
    await query('INSERT INTO chats_backup SELECT * FROM chats');
    console.log('  ✓ Backup created');
    
    // 3. Clear table
    await query('DELETE FROM chats');
    console.log('  ✓ Table cleared');
    
    // 4. Insert each chat
    for (const chat of chats) {
      const sql = `
        INSERT INTO chats (
          id, service_id, service_title, vendor_id, vendor_name,
          customer_id, customer_name, messages, created_at, deal_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        chat.id,
        chat.serviceId,
        chat.serviceTitle,
        chat.vendorId,
        chat.vendorName,
        chat.customerId,
        chat.customerName,
        JSON.stringify(chat.messages || []),
        convertTimestamp(chat.createdAt),
        chat.dealStatus || null
      ];
      
      await query(sql, values);
    }
    
    console.log(`  ✓ Inserted ${chats.length} records`);
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM chats');
    const count = result[0].count;
    
    if (count === chats.length) {
      console.log(`✅ chats migration SUCCESS: ${count} records\n`);
      return { success: true, table: 'chats', count };
    } else {
      console.error(`❌ MISMATCH: Expected ${chats.length}, got ${count}`);
      return { success: false, table: 'chats', error: 'count mismatch' };
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return { success: false, table: 'chats', error: error.message };
  }
}

export default migrateChats;

migrateChats();
