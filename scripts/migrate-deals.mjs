import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/lib/db-es.mjs';
import { convertTimestamp, nullIfUndefined } from './migrate-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function migrateDeals() {
  try {
    console.log('🔄 Migrating deals.json...');
    
    // 1. Read JSON
    const raw = await fs.readFile(path.join(rootDir, 'deals.json'), 'utf-8');
    const deals = JSON.parse(raw);
    
    console.log(`  📊 Found ${deals.length} records in JSON`);
    
    // 2. Backup
    await query('CREATE TABLE IF NOT EXISTS deals_backup AS SELECT * FROM deals WHERE FALSE');
    await query('DELETE FROM deals_backup');
    await query('INSERT INTO deals_backup SELECT * FROM deals');
    console.log('  ✓ Backup created');
    
    // 3. Clear table
    await query('DELETE FROM deals');
    console.log('  ✓ Table cleared');
    
    // 4. Insert each deal
    for (const deal of deals) {
      const sql = `
        INSERT INTO deals (
          id, chat_id, customer_id, vendor_id, service_id,
          customer_accepted, vendor_accepted, status, 
          created_at, agreed_at, discount, original_price, final_price,
          discount_updated_at, invoice_status, payment_confirmed_at, 
          completed_at, actual_return_date, return_status,
          vendor_confirmed, customer_confirmed, settlement_date, refund_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        deal.id,
        deal.chatId,
        deal.customerId,
        deal.vendorId,
        deal.serviceId,
        deal.customerAccepted || false,
        deal.vendorAccepted || false,
        deal.status || null,
        convertTimestamp(deal.createdAt),
        convertTimestamp(deal.agreedAt),
        deal.discount ? JSON.stringify(deal.discount) : null,
        deal.originalPrice || null,
        deal.finalPrice || null,
        convertTimestamp(deal.discountUpdatedAt),
        deal.invoiceStatus || null,
        convertTimestamp(deal.paymentConfirmedAt),
        convertTimestamp(deal.completedAt),
        deal.actualReturnDate || null,
        deal.returnStatus || null,
        deal.vendorConfirmed || false,
        deal.customerConfirmed || false,
        deal.settlementDate || null,
        deal.refundStatus || null
      ];
      
      await query(sql, values);
    }
    
    console.log(`  ✓ Inserted ${deals.length} records`);
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM deals');
    const count = result[0].count;
    
    if (count === deals.length) {
      console.log(`✅ deals migration SUCCESS: ${count} records\n`);
      return { success: true, table: 'deals', count };
    } else {
      console.error(`❌ MISMATCH: Expected ${deals.length}, got ${count}`);
      return { success: false, table: 'deals', error: 'count mismatch' };
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return { success: false, table: 'deals', error: error.message };
  }
}

export default migrateDeals;

migrateDeals();
