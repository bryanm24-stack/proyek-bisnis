-- Migration script to add bank fields to existing users table
-- Run this if you get column errors after updating to the new version
-- mysql -u <user> -p rent_guard < sql/migration_add_bank_fields.sql

USE rent_guard;

-- Add bank columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bankName VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accountNumber VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accountHolder VARCHAR(255) DEFAULT NULL;

-- Verify the columns were added
SHOW COLUMNS FROM users LIKE 'bank%';
SHOW COLUMNS FROM users LIKE 'account%';

-- Set default values for existing users (empty string instead of NULL)
UPDATE users SET bankName = '' WHERE bankName IS NULL;
UPDATE users SET accountNumber = '' WHERE accountNumber IS NULL;
UPDATE users SET accountHolder = '' WHERE accountHolder IS NULL;

-- Show success message
SELECT 'Migration completed successfully! Bank fields have been added to users table.' AS status;
