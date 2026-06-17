# Migration Scripts: JSON to MySQL (Siap Copy-Paste)

## 📋 Persiapan

```bash
# 1. Backup data first
cp users.json users.json.backup
cp deals.json deals.json.backup
cp chats.json chats.json.backup
cp invoices.json invoices.json.backup
cp transactions.json transactions.json.backup
cp ratings.json ratings.json.backup
cp promos.json promos.json.backup

# 2. Backup database
mysqldump rent_guard > rent_guard.backup.sql

# 3. Connect ke MySQL
mysql -u root -p rent_guard
```

---

## ✅ Script 1: USERS.JSON → users table

### **Check data terlebih dahulu:**
```bash
# Linux/Mac
cat users.json | jq 'length'

# Windows PowerShell
Get-Content users.json | ConvertFrom-Json | Measure-Object | Select-Object -ExpandProperty Count
```

### **MySQL Import Script:**

```sql
-- 1. Backup existing users
CREATE TABLE users_backup AS SELECT * FROM users;

-- 2. Clear table
TRUNCATE TABLE users;

-- 3. Insert data dari JSON
-- Sesuaikan dengan struktur users.json Anda
-- Contoh structure:
-- [
--   {
--     "id": "1",
--     "username": "apple",
--     "password": "123",
--     "name": "Apple Vendor",
--     "role": "vendor",
--     "email": "apple@rentguard.com",
--     "phone": "081234567890",
--     "createdAt": "2026-04-01T00:00:00.000Z"
--   }
-- ]

-- 4. Verify count
SELECT COUNT(*) as total_users FROM users;

-- Should match count dari users.json
```

### **Node.js Migration Script:**

```javascript
// migrate-users.js
import fs from 'fs/promises';
import { query } from './src/lib/db.js';

async function migrateUsers() {
  try {
    // 1. Read JSON
    const raw = await fs.readFile('./users.json', 'utf-8');
    const users = JSON.parse(raw);
    
    console.log(`Migrating ${users.length} users...`);
    
    // 2. Backup existing
    await query('CREATE TABLE users_backup AS SELECT * FROM users');
    console.log('✓ Backup created');
    
    // 3. Clear table
    await query('TRUNCATE TABLE users');
    console.log('✓ Table cleared');
    
    // 4. Insert each user
    for (const user of users) {
      const sql = `
        INSERT INTO users (id, username, password, name, role, email, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        user.id,
        user.username,
        user.password,
        user.name,
        user.role,
        user.email,
        user.phone,
        user.createdAt  // MySQL auto-converts ISO to DATETIME
      ];
      
      await query(sql, values);
    }
    
    console.log('✓ Data inserted');
    
    // 5. Verify
    const result = await query('SELECT COUNT(*) as count FROM users');
    const count = result[0].count;
    
    if (count === users.length) {
      console.log(`✅ SUCCESS: ${count} users migrated`);
      return true;
    } else {
      console.error(`❌ MISMATCH: Expected ${users.length}, got ${count}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

migrateUsers();
```

**Run:**
```bash
node migrate-users.js
```

---

## ✅ Script 2: DEALS.JSON → deals table

```javascript
// migrate-deals.js
import fs from 'fs/promises';
import { query } from './src/lib/db.js';

async function migrateDeals() {
  try {
    const raw = await fs.readFile('./deals.json', 'utf-8');
    const deals = JSON.parse(raw);
    
    console.log(`Migrating ${deals.length} deals...`);
    
    // Backup & Clear
    await query('CREATE TABLE deals_backup AS SELECT * FROM deals');
    await query('TRUNCATE TABLE deals');
    console.log('✓ Backup & clear done');
    
    // Insert deals
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
        deal.chat_id,
        deal.customer_id,
        deal.vendor_id,
        deal.service_id,
        deal.customer_accepted,
        deal.vendor_accepted,
        deal.status,
        deal.created_at,
        deal.agreed_at,
        typeof deal.discount === 'object' ? JSON.stringify(deal.discount) : deal.discount,
        deal.original_price,
        deal.final_price,
        deal.discount_updated_at,
        deal.invoice_status,
        deal.payment_confirmed_at,
        deal.completed_at,
        deal.actual_return_date,
        deal.return_status,
        deal.vendor_confirmed,
        deal.customer_confirmed,
        deal.settlement_date,
        deal.refund_status
      ];
      
      await query(sql, values);
    }
    
    const result = await query('SELECT COUNT(*) as count FROM deals');
    console.log(`✅ SUCCESS: ${result[0].count} deals migrated`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

migrateDeals();
```

---

## ✅ Script 3: CHATS.JSON → chats table

```javascript
// migrate-chats.js
import fs from 'fs/promises';
import { query } from './src/lib/db.js';

async function migrateChats() {
  try {
    const raw = await fs.readFile('./chats.json', 'utf-8');
    const chats = JSON.parse(raw);
    
    console.log(`Migrating ${chats.length} chats...`);
    
    await query('CREATE TABLE chats_backup AS SELECT * FROM chats');
    await query('TRUNCATE TABLE chats');
    
    for (const chat of chats) {
      const sql = `
        INSERT INTO chats (
          id, service_id, service_title, vendor_id, vendor_name,
          customer_id, customer_name, messages, created_at, deal_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        chat.id,
        chat.service_id,
        chat.service_title,
        chat.vendor_id,
        chat.vendor_name,
        chat.customer_id,
        chat.customer_name,
        JSON.stringify(chat.messages), // Messages array as JSON
        chat.created_at,
        chat.deal_status
      ];
      
      await query(sql, values);
    }
    
    const result = await query('SELECT COUNT(*) as count FROM chats');
    console.log(`✅ SUCCESS: ${result[0].count} chats migrated`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

migrateChats();
```

---

## ✅ Script 4: INVOICES.JSON → invoices table

```javascript
// migrate-invoices.js
import fs from 'fs/promises';
import { query } from './src/lib/db.js';

async function migrateInvoices() {
  try {
    const raw = await fs.readFile('./invoices.json', 'utf-8');
    const invoices = JSON.parse(raw);
    
    console.log(`Migrating ${invoices.length} invoices...`);
    
    await query('CREATE TABLE invoices_backup AS SELECT * FROM invoices');
    await query('TRUNCATE TABLE invoices');
    
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
        invoice.deal_id,
        invoice.customer_id,
        invoice.vendor_id,
        invoice.service_id,
        invoice.transaction_id,
        invoice.remaining_payment,
        invoice.payment_deadline,
        invoice.payment_method,
        invoice.payment_type,
        invoice.status,
        invoice.created_at,
        invoice.paid_at,
        invoice.payment_transaction_id,
        invoice.notes
      ];
      
      await query(sql, values);
    }
    
    const result = await query('SELECT COUNT(*) as count FROM invoices');
    console.log(`✅ SUCCESS: ${result[0].count} invoices migrated`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

migrateInvoices();
```

---

## ✅ Script 5: TRANSACTIONS.JSON → transactions table

```javascript
// migrate-transactions.js
import fs from 'fs/promises';
import { query } from './src/lib/db.js';

async function migrateTransactions() {
  try {
    const raw = await fs.readFile('./transactions.json', 'utf-8');
    const transactions = JSON.parse(raw);
    
    console.log(`Migrating ${transactions.length} transactions...`);
    
    await query('CREATE TABLE transactions_backup AS SELECT * FROM transactions');
    await query('TRUNCATE TABLE transactions');
    
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
        txn.invoice_id,
        txn.deal_id,
        txn.user_id,
        txn.payment_method,
        txn.base_price,
        txn.quantity,
        txn.quantity_type,
        txn.duration_days,
        txn.notes,
        txn.start_date,
        txn.amount,
        txn.service_fee,
        txn.total_amount,
        txn.status,
        txn.timestamp,
        txn.card_details ? JSON.stringify(txn.card_details) : null,
        txn.qr_code,
        txn.identity_verification ? JSON.stringify(txn.identity_verification) : null,
        txn.created_at
      ];
      
      await query(sql, values);
    }
    
    const result = await query('SELECT COUNT(*) as count FROM transactions');
    console.log(`✅ SUCCESS: ${result[0].count} transactions migrated`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

migrateTransactions();
```

---

## ✅ Script 6: RATINGS.JSON → ratings table

```javascript
// migrate-ratings.js
import fs from 'fs/promises';
import { query } from './src/lib/db.js';

async function migrateRatings() {
  try {
    const raw = await fs.readFile('./ratings.json', 'utf-8');
    const ratings = JSON.parse(raw);
    
    console.log(`Migrating ${ratings.length} ratings...`);
    
    await query('CREATE TABLE ratings_backup AS SELECT * FROM ratings');
    await query('TRUNCATE TABLE ratings');
    
    for (const rating of ratings) {
      const sql = `
        INSERT INTO ratings (id, service_id, customer_id, vendor_id, rating, review, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        rating.id,
        rating.service_id,
        rating.customer_id,
        rating.vendor_id,
        rating.rating,
        rating.review,
        rating.created_at
      ];
      
      await query(sql, values);
    }
    
    const result = await query('SELECT COUNT(*) as count FROM ratings');
    console.log(`✅ SUCCESS: ${result[0].count} ratings migrated`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

migrateRatings();
```

---

## ✅ Script 7: PROMOS.JSON → promos table

```javascript
// migrate-promos.js
import fs from 'fs/promises';
import { query } from './src/lib/db.js';

async function migratePromos() {
  try {
    const raw = await fs.readFile('./promos.json', 'utf-8');
    const promos = JSON.parse(raw);
    
    console.log(`Migrating ${promos.length} promos...`);
    
    await query('CREATE TABLE promos_backup AS SELECT * FROM promos');
    await query('TRUNCATE TABLE promos');
    
    for (const promo of promos) {
      const sql = `
        INSERT INTO promos (
          id, vendor_id, vendor_name, title, image, promo_price,
          description, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        promo.id,
        promo.vendor_id,
        promo.vendor_name,
        promo.title,
        promo.image,
        promo.promo_price,
        promo.description,
        promo.active,
        promo.created_at,
        promo.updated_at
      ];
      
      await query(sql, values);
    }
    
    const result = await query('SELECT COUNT(*) as count FROM promos');
    console.log(`✅ SUCCESS: ${result[0].count} promos migrated`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

migratePromos();
```

---

## 🚀 Master Migration Script (Jalankan Semua Sekaligus)

```javascript
// migrate-all.js
import { migrateUsers } from './migrate-users.js';
import { migrateDeals } from './migrate-deals.js';
import { migrateChats } from './migrate-chats.js';
import { migrateInvoices } from './migrate-invoices.js';
import { migrateTransactions } from './migrate-transactions.js';
import { migrateRatings } from './migrate-ratings.js';
import { migratePromos } from './migrate-promos.js';

async function migrateAll() {
  console.log('🚀 Starting migration...\n');
  
  const start = Date.now();
  
  try {
    console.log('1️⃣  Migrating users...');
    await migrateUsers();
    
    console.log('\n2️⃣  Migrating deals...');
    await migrateDeals();
    
    console.log('\n3️⃣  Migrating chats...');
    await migrateChats();
    
    console.log('\n4️⃣  Migrating invoices...');
    await migrateInvoices();
    
    console.log('\n5️⃣  Migrating transactions...');
    await migrateTransactions();
    
    console.log('\n6️⃣  Migrating ratings...');
    await migrateRatings();
    
    console.log('\n7️⃣  Migrating promos...');
    await migratePromos();
    
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n✅ ALL MIGRATIONS COMPLETED in ${duration}s`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateAll();
```

**Run all 7 migrations sekaligus:**
```bash
node migrate-all.js
```

---

## ✅ Post-Migration Verification

```javascript
// verify-migration.js
import { query } from './src/lib/db.js';
import fs from 'fs/promises';

async function verify() {
  console.log('Verifying migration...\n');
  
  const tables = [
    { name: 'users', file: 'users.json' },
    { name: 'deals', file: 'deals.json' },
    { name: 'chats', file: 'chats.json' },
    { name: 'invoices', file: 'invoices.json' },
    { name: 'transactions', file: 'transactions.json' },
    { name: 'ratings', file: 'ratings.json' },
    { name: 'promos', file: 'promos.json' }
  ];
  
  for (const {name, file} of tables) {
    const jsonRaw = await fs.readFile(file, 'utf-8');
    const jsonData = JSON.parse(jsonRaw);
    
    const result = await query(`SELECT COUNT(*) as count FROM ${name}`);
    const dbCount = result[0].count;
    const jsonCount = jsonData.length;
    
    const status = dbCount === jsonCount ? '✅' : '❌';
    console.log(`${status} ${name.padEnd(15)} JSON: ${jsonCount} | DB: ${dbCount}`);
  }
}

verify();
```

**Run verification:**
```bash
node verify-migration.js
```

---

## 🎯 Quick Start

```bash
# 1. Buat semua script di folder project
# migrate-users.js
# migrate-deals.js
# migrate-chats.js
# migrate-invoices.js
# migrate-transactions.js
# migrate-ratings.js
# migrate-promos.js
# migrate-all.js
# verify-migration.js

# 2. Run semua migrasi sekaligus
node migrate-all.js

# 3. Verify hasilnya
node verify-migration.js

# Done! ✅
```

---

## 🔄 Jika Ada Kesalahan (Rollback)

```bash
# 1. Connect ke MySQL
mysql rent_guard

# 2. Restore dari backup yang dibuat otomatis
# Restore users dari backup:
mysql> INSERT INTO users SELECT * FROM users_backup;

# Atau restore seluruh database dari file backup:
mysql rent_guard < rent_guard.backup.sql
```

---

**Status:** Siap Digunakan ✅  
**Total waktu:** ~45 menit untuk semua 7 files
