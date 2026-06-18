import { query } from '../src/lib/db.js';

async function addServiceIdColumn() {
  try {
    console.log('Adding service_id column to transactions table...');

    // Check if column already exists
    const result = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME='transactions' AND COLUMN_NAME='service_id' AND TABLE_SCHEMA = DATABASE()`
    );

    if (result.length > 0) {
      console.log('✓ service_id column already exists in transactions table');
      process.exit(0);
    }

    // Add the column if it doesn't exist
    await query(
      `ALTER TABLE transactions 
       ADD COLUMN service_id VARCHAR(255) AFTER deal_id`
    );

    console.log('✓ service_id column added successfully to transactions table');

    // Add foreign key constraint if not exists
    try {
      await query(
        `ALTER TABLE transactions 
         ADD CONSTRAINT fk_transactions_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL`
      );
      console.log('✓ Foreign key constraint added for service_id');
    } catch (fkError) {
      console.warn('⚠ Foreign key constraint might already exist:', fkError.message);
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding service_id column:', error);
    process.exit(1);
  }
}

addServiceIdColumn();
