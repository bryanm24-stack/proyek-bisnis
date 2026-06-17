import { query } from '../src/lib/db-es.mjs';

async function dropForeignKeys() {
  try {
    console.log('🔒 Dropping foreign key constraints...\n');

    const constraints = [
      'ALTER TABLE deals DROP FOREIGN KEY fk_deals_chat',
      'ALTER TABLE deals DROP FOREIGN KEY fk_deals_customer',
      'ALTER TABLE deals DROP FOREIGN KEY fk_deals_vendor',
      'ALTER TABLE deals DROP FOREIGN KEY fk_deals_service',
      'ALTER TABLE chats DROP FOREIGN KEY fk_chats_vendor',
      'ALTER TABLE chats DROP FOREIGN KEY fk_chats_customer',
      'ALTER TABLE chats DROP FOREIGN KEY fk_chats_service',
      'ALTER TABLE invoices DROP FOREIGN KEY fk_invoices_customer',
      'ALTER TABLE invoices DROP FOREIGN KEY fk_invoices_vendor',
      'ALTER TABLE invoices DROP FOREIGN KEY fk_invoices_deal',
      'ALTER TABLE invoices DROP FOREIGN KEY fk_invoices_transaction',
      'ALTER TABLE transactions DROP FOREIGN KEY fk_transactions_deal',
      'ALTER TABLE transactions DROP FOREIGN KEY fk_transactions_user',
      'ALTER TABLE ratings DROP FOREIGN KEY fk_ratings_service',
      'ALTER TABLE ratings DROP FOREIGN KEY fk_ratings_customer',
      'ALTER TABLE ratings DROP FOREIGN KEY fk_ratings_vendor'
    ];

    for (const sql of constraints) {
      try {
        await query(sql);
        console.log(`✓ ${sql.split(' DROP ')[1]}`);
      } catch (err) {
        if (err.message.includes('does not exist')) {
          // Ignore - constraint doesn't exist
        } else {
          console.warn(`⚠️  ${sql.split(' DROP ')[1]}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Foreign keys removed\n');
  } catch (error) {
    console.error('❌ Error dropping foreign keys:', error.message);
    process.exit(1);
  }
}

dropForeignKeys();
