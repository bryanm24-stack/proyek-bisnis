import migrateUsers from './migrate-users.mjs';
import migrateDeals from './migrate-deals.mjs';
import migrateChats from './migrate-chats.mjs';
import migrateInvoices from './migrate-invoices.mjs';
import migrateTransactions from './migrate-transactions.mjs';
import migrateRatings from './migrate-ratings.mjs';
import migratePromos from './migrate-promos.mjs';
import { query } from '../src/lib/db-es.mjs';

async function runAllMigrations() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 JSON to MySQL Migration - All 7 Critical Files');
  console.log('═══════════════════════════════════════════════════\n');
  
  const results = [];
  const start = Date.now();
  
  try {
    // 1. Test database connection first
    console.log('🔗 Testing database connection...');
    await query('SELECT 1');
    console.log('✓ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  try {
    // 2. Disable foreign key checks for migration
    console.log('🔒 Disabling foreign key checks...');
    await query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Foreign key checks disabled\n');
  } catch (error) {
    console.warn('⚠️  Could not disable foreign key checks:', error.message);
  }

  try {
    results.push(await migrateUsers());
  } catch (e) {
    console.error('❌ Users migration error:', e.message);
    results.push({ success: false, table: 'users', error: e.message });
  }
  
  try {
    results.push(await migrateDeals());
  } catch (e) {
    console.error('❌ Deals migration error:', e.message);
    results.push({ success: false, table: 'deals', error: e.message });
  }
  
  try {
    results.push(await migrateChats());
  } catch (e) {
    console.error('❌ Chats migration error:', e.message);
    results.push({ success: false, table: 'chats', error: e.message });
  }
  
  try {
    results.push(await migrateInvoices());
  } catch (e) {
    console.error('❌ Invoices migration error:', e.message);
    results.push({ success: false, table: 'invoices', error: e.message });
  }
  
  try {
    results.push(await migrateTransactions());
  } catch (e) {
    console.error('❌ Transactions migration error:', e.message);
    results.push({ success: false, table: 'transactions', error: e.message });
  }
  
  try {
    results.push(await migrateRatings());
  } catch (e) {
    console.error('❌ Ratings migration error:', e.message);
    results.push({ success: false, table: 'ratings', error: e.message });
  }
  
  try {
    results.push(await migratePromos());
  } catch (e) {
    console.error('❌ Promos migration error:', e.message);
    results.push({ success: false, table: 'promos', error: e.message });
  }

  try {
    // 3. Re-enable foreign key checks after migration
    console.log('🔒 Re-enabling foreign key checks...');
    await query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Foreign key checks re-enabled\n');
  } catch (error) {
    console.warn('⚠️  Could not re-enable foreign key checks:', error.message);
  }

  // Summary
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');
  
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.table.padEnd(15)} | ${result.count} records migrated`);
    } else {
      console.log(`❌ ${result.table.padEnd(15)} | ERROR: ${result.error}`);
    }
  }
  
  console.log('\n───────────────────────────────────────────────────');
  console.log(`Total tables: ${results.length}`);
  console.log(`✅ Success:   ${successful}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`⏱️  Duration:  ${duration}s`);
  console.log('═══════════════════════════════════════════════════\n');
  
  if (failed === 0) {
    console.log('🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!\n');
    const totalRecords = results.reduce((sum, r) => sum + (r.count || 0), 0);
    console.log(`📊 Total records migrated: ${totalRecords}\n`);
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} migration(s) failed. Please review the errors above.\n`);
    process.exit(1);
  }
}

runAllMigrations();
