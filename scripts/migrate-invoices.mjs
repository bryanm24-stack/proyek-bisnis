import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/lib/db-es.mjs';
import { convertTimestamp, nullIfUndefined } from './migrate-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function migrateInvoices() {
  try {
    console.log('🔄 Migrating invoices.json...');
    
    // 1. Read JSON
    const raw = await fs.readFile(path.join(rootDir, 'invoices.json'), 'utf-8');
    const invoices = JSON.parse(raw);
    
    console.log(`  📊 Found ${invoices.length} records in JSON`);
    
    // 2. Backup
    await query('CREATE TABLE IF NOT EXISTS invoices_backup AS SELECT * FROM invoices WHERE FALSE');
    await query('DELETE FROM invoices_backup');
    await query('INSERT INTO invoices_backup SELECT * FROM invoices');
    console.log('  ✓ Backup created');
    
    // 3. Clear table
    await query('DELETE FROM invoices');
    console.log('  ✓ Table cleared');
    
    // 4. Insert each invoice
    for (const invoice of invoices) {
      const sql = `
        INSERT INTO invoices (
          id, deal_id, customer_id, vendor_id, service_id, transaction_id,
          remaining_payment, payment_deadline, payment_method, payment_type,
          status, created_at, paid_at, payment_transaction_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        invoice.id,
        invoice.dealId,
        invoice.customerId,
        invoice.vendorId,
        invoice.serviceId,
        invoice.transactionId || null,
        invoice.remainingPayment || null,
        convertTimestamp(invoice.paymentDeadline),
        invoice.paymentMethod,
        invoice.paymentType,
        invoice.status,
        convertTimestamp(invoice.createdAt),
        convertTimestamp(invoice.paidAt),
        invoice.paymentTransactionId || null,
        invoice.notes || null
      ];
      
      await query(sql, values);
    }
    
    console.log(`  ✓ Inserted ${invoices.length} records`);
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM invoices');
    const count = result[0].count;
    
    if (count === invoices.length) {
      console.log(`✅ invoices migration SUCCESS: ${count} records\n`);
      return { success: true, table: 'invoices', count };
    } else {
      console.error(`❌ MISMATCH: Expected ${invoices.length}, got ${count}`);
      return { success: false, table: 'invoices', error: 'count mismatch' };
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return { success: false, table: 'invoices', error: error.message };
  }
}

export default migrateInvoices;

migrateInvoices();
