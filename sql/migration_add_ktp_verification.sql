-- Migration script: Add KTP verification fields to users table
-- Use this if you already have an existing database
-- mysql -u root -p rent_guard < sql/migration_add_ktp_verification.sql

USE rent_guard;

-- Add KTP verification columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ktp_status ENUM('not_submitted', 'pending', 'approved', 'rejected', 'not_applicable') DEFAULT 'not_submitted',
ADD COLUMN IF NOT EXISTS ktp_data JSON,
ADD COLUMN IF NOT EXISTS ktp_submitted_at DATETIME(3),
ADD COLUMN IF NOT EXISTS ktp_verified_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS ktp_verified_at DATETIME(3),
ADD COLUMN IF NOT EXISTS ktp_rejection_reason VARCHAR(500);

-- Set ktp_status for vendors and admin to 'not_applicable'
UPDATE users SET ktp_status = 'not_applicable' WHERE role IN ('vendor', 'admin');

-- Set ktp_status for customers to 'not_submitted' if not already set
UPDATE users SET ktp_status = 'not_submitted' WHERE role = 'customer' AND ktp_status IS NULL;

-- Verify the changes
SELECT 'Migration completed successfully!' AS status;
SELECT 
  CONCAT(COUNT(*), ' total users') as info,
  SUM(CASE WHEN ktp_status = 'not_submitted' THEN 1 ELSE 0 END) as not_submitted,
  SUM(CASE WHEN ktp_status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN ktp_status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN ktp_status = 'rejected' THEN 1 ELSE 0 END) as rejected
FROM users WHERE role = 'customer';
