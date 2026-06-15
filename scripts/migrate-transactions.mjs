import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/lib/db-es.mjs';
import { convertTimestamp, nullIfUndefined } from './migrate-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function migrateTransactions() {
  try {
    console.log('🔄 Migrating transactions.json...');
    
    // 1. Read JSON
    const raw = await fs.readFile(path.join(rootDir, 'transactions.json'), 'utf-8');
    const transactions = JSON.parse(raw);
    
    console.log(`  📊 Found ${transactions.length} records in JSON`);
    
    // 2. Backup
    await query('CREATE TABLE IF NOT EXISTS transactions_backup AS SELECT * FROM transactions WHERE FALSE');
    await query('DELETE FROM transactions_backup');
    await query('INSERT INTO transactions_backup SELECT * FROM transactions');
    console.log('  ✓ Backup created');
    
    // 3. Clear table
    await query('DELETE FROM transactions');
    console.log('  ✓ Table cleared');
    
    // 4. Insert each transaction
    for (const txn of transactions) {
      const sql = `
        INSERT INTO transactions (
          id, invoice_id, deal_id, user_id, payment_method, base_price,
          quantity, quantity_type, duration_days, notes, start_date,
          amount, service_fee, total_amount, status, timestamp,
          card_details, qr_code, identity_verification, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        txn.id,
        txn.invoiceId || null,
        txn.dealId,
        txn.userId,
        txn.paymentMethod,
        txn.basePrice || null,
        txn.quantity || null,
        txn.quantityType || null,
        txn.durationDays || null,
        txn.notes || null,
        txn.startDate || null,
        txn.amount,
        txn.serviceFee || null,
        txn.totalAmount || null,
        txn.status,
        convertTimestamp(txn.timestamp),
        txn.cardDetails ? JSON.stringify(txn.cardDetails) : null,
        txn.qrCode || null,
        txn.identityVerification ? JSON.stringify(txn.identityVerification) : null,
        convertTimestamp(txn.createdAt)
      ];
      
      await query(sql, values);
    }
    
    console.log(`  ✓ Inserted ${transactions.length} records`);
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM transactions');
    const count = result[0].count;
    
    if (count === transactions.length) {
      console.log(`✅ transactions migration SUCCESS: ${count} records\n`);
      return { success: true, table: 'transactions', count };
    } else {
      console.error(`❌ MISMATCH: Expected ${transactions.length}, got ${count}`);
      return { success: false, table: 'transactions', error: 'count mismatch' };
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return { success: false, table: 'transactions', error: error.message };
  }
}

export default migrateTransactions;

migrateTransactions();
