# Panduan Implementasi: JSON to Database Sync

## 🎯 Tujuan
Dokumentasi ini menunjukkan cara kerja praktis sistem sinkronisasi JSON ke Database dengan contoh kode nyata dari aplikasi.

---

## 📍 Lokasi File Kunci

```
src/lib/
├── storage.js          ← Main sync logic (readData, writeData)
└── db.js               ← MySQL connection pool

sql/
└── proyek_bisnis.sql   ← Database schema

*.json (root)
├── users.json          ← User data source
├── deals.json          ← Deal/booking data
├── chats.json          ← Chat messages
├── invoices.json       ← Invoice records
├── services.json       ← Service listings
└── ... (13 JSON files total)
```

---

## 🔄 Use Case 1: Reading User Data

### **Scenario: User opens vendor dashboard**

```javascript
// API Route: /api/vendors or Component
import { readData } from '@/lib/storage';

async function loadVendors() {
  // This abstraction handles:
  // 1. If 'users' table exists → Query MySQL
  // 2. If app_data table exists → Query WHERE dataset='users'
  // 3. If no DB → Read users.json from filesystem
  
  const users = await readData('users');
  
  return users; // Always returns array
}

// Result (regardless of source):
// [
//   { id: '1', username: 'apple', email: 'apple@rentguard.com', ... },
//   { id: '2', username: 'banana', email: 'banana@rentguard.com', ... },
//   ...
// ]
```

### **What happens behind the scenes:**

#### **If MySQL Database exists:**
```sql
-- Direct query (FAST)
SELECT * FROM users ORDER BY id;
-- Returns already-parsed rows
```

#### **If only app_data exists:**
```sql
-- Generic table query (MEDIUM)
SELECT data FROM app_data 
WHERE dataset = 'users' 
ORDER BY record_id;
-- Returns JSON strings that need parsing
```

#### **If no database:**
```javascript
// Filesystem read (SLOWEST)
const raw = fs.readFileSync('./users.json', 'utf-8');
// Parse JSON, cleanup BOM, handle errors
return JSON.parse(raw.replace(/^\uFEFF/, ''));
```

---

## 🔄 Use Case 2: Creating/Updating User

### **Scenario: New vendor signs up**

```javascript
// POST /api/auth/register
async function registerVendor(vendorData) {
  // New vendor object
  const newVendor = {
    id: generateId(),
    username: 'newvendor',
    password: hashedPassword,
    name: 'New Vendor Co',
    role: 'vendor',
    email: 'newvendor@rentguard.com',
    phone: '081234567890',
    createdAt: new Date().toISOString()
  };
  
  // Read current users
  let users = await readData('users');
  
  // Add new vendor
  users.push(newVendor);
  
  // Write back (handles all layers)
  await writeData('users', users);
  
  return { success: true, vendor: newVendor };
}
```

### **Write flow - Priority order:**

#### **Step 1: Try MySQL Table**
```javascript
// In writeData() function
if (await hasTable('users')) {
  await writeToTable('users', users);
  // Executes:
  // INSERT INTO users (id, username, password, ...)
  // VALUES (?, ?, ?, ...)
  // ON DUPLICATE KEY UPDATE
  //   username=VALUES(username), ...
  return true; // ✅ Done
}
```

#### **Step 2: Fallback to app_data**
```javascript
// If no 'users' table, try generic app_data
if (await hasTable('app_data')) {
  // For each user record:
  // { dataset: 'users', record_id: '1', data: {...} }
  
  await query('DELETE FROM app_data WHERE dataset = "users"');
  
  const values = [
    ['users', '1', JSON.stringify({id:'1', username:'apple', ...})],
    ['users', '2', JSON.stringify({id:'2', username:'banana', ...})],
    ...
  ];
  
  await query('INSERT INTO app_data (dataset, record_id, data) VALUES ...', values);
  return true; // ✅ Done
}
```

#### **Step 3: JSON File Fallback**
```javascript
// If no database connection
const json = JSON.stringify(users, null, 2);
fs.writeFileSync('./users.json', json);
// File is now updated
return true; // ✅ Done
```

---

## 🎭 Use Case 3: Complex Data - Deals

### **JSON Structure (deals.json)**
```json
[
  {
    "id": "deal-001",
    "chat_id": "chat-001",
    "customer_id": "5",
    "vendor_id": "1",
    "service_id": "service-001",
    "customer_accepted": true,
    "vendor_accepted": true,
    "status": "confirmed",
    "discount": {
      "type": "percentage",
      "value": 10,
      "amount": 5000
    },
    "original_price": 50000,
    "final_price": 45000,
    "created_at": "2026-06-01T10:00:00.000Z",
    "completed_at": "2026-06-08T15:30:00.000Z"
  }
]
```

### **MySQL Table**
```sql
CREATE TABLE deals (
  id VARCHAR(255) PRIMARY KEY,
  chat_id VARCHAR(255),
  customer_id VARCHAR(255),
  vendor_id VARCHAR(255),
  service_id VARCHAR(255),
  customer_accepted BOOLEAN,
  vendor_accepted BOOLEAN,
  status VARCHAR(255),
  discount JSON,                    -- ← Nested object stored as JSON
  original_price DECIMAL(18,2),
  final_price DECIMAL(18,2),
  created_at DATETIME(3),
  completed_at DATETIME(3)
);
```

### **Write Process:**
```javascript
// 1. Read from deals.json
const deals = await readData('deals');

// 2. Modify a deal
deals[0].status = 'completed';
deals[0].final_price = 45000;

// 3. Write back
await writeData('deals', deals);

// In writeToTable(), for each record:
// Extract discount object:
const discount = {
  type: 'percentage',
  value: 10,
  amount: 5000
};

// Convert to JSON string for MySQL
const discountJSON = JSON.stringify(discount);

// INSERT query:
const sql = `
  INSERT INTO deals (id, chat_id, customer_id, vendor_id, service_id,
                     customer_accepted, vendor_accepted, status, discount,
                     original_price, final_price, created_at, completed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    discount = VALUES(discount),
    final_price = VALUES(final_price),
    completed_at = VALUES(completed_at)
`;

// Values include JSON.stringify(discount)
const values = ['deal-001', 'chat-001', '5', '1', 'service-001', 
                true, true, 'completed', discountJSON,
                50000, 45000, '2026-06-01 10:00:00', '2026-06-08 15:30:00'];

await query(sql, values);
```

### **Read Process (MySQL)**
```sql
-- Query discount field
SELECT id, status, discount, final_price FROM deals WHERE id = 'deal-001';

-- Result:
-- id         | status    | discount                          | final_price
-- deal-001   | completed | {"type":"percentage",...}        | 45000.00

-- To extract nested values (MySQL 5.7.8+):
SELECT 
  id, 
  JSON_EXTRACT(discount, '$.type') as discount_type,
  JSON_EXTRACT(discount, '$.value') as discount_value
FROM deals;

-- In Node.js, receive and parse:
const row = await query(...);
const deal = row[0];
const discountObj = JSON.parse(deal.discount);
// discountObj = { type: 'percentage', value: 10, amount: 5000 }
```

---

## 🎭 Use Case 4: Generic Dataset - Favorites

### **JSON Structure (favorites.json)**
```json
[
  {
    "id": "fav-001",
    "user_id": "5",
    "service_id": "service-001",
    "created_at": "2026-05-15T12:00:00.000Z"
  },
  {
    "id": "fav-002",
    "user_id": "5",
    "service_id": "service-002",
    "created_at": "2026-05-16T14:30:00.000Z"
  }
]
```

### **Database Storage (No direct table)**
```sql
-- No 'favorites' table defined
-- Falls back to app_data table

SELECT * FROM app_data WHERE dataset = 'favorites';

-- Result:
-- id | dataset   | record_id | data
-- 1  | favorites | fav-001   | {"id":"fav-001","user_id":"5",...}
-- 2  | favorites | fav-002   | {"id":"fav-002","user_id":"5",...}
```

### **Reading Favorites:**
```javascript
const favorites = await readData('favorites');

// In storage.js:
// 1. Check if 'favorites' table exists → NO
// 2. Check if 'app_data' table exists → YES
// 3. Execute:
//    SELECT data FROM app_data
//    WHERE dataset = 'favorites'
//    ORDER BY record_id
// 4. Map results to just the `data` field
// 5. Return array

// Result:
// [
//   { id: 'fav-001', user_id: '5', service_id: 'service-001', ... },
//   { id: 'fav-002', user_id: '5', service_id: 'service-002', ... }
// ]
```

### **Writing Favorites:**
```javascript
// User adds service to favorites
const newFav = {
  id: generateId(),
  user_id: '5',
  service_id: 'service-003',
  created_at: new Date().toISOString()
};

let favorites = await readData('favorites');
favorites.push(newFav);

await writeData('favorites', favorites);

// In writeToAppData():
// 1. Create rows:
//    [
//      { dataset: 'favorites', record_id: 'fav-001', 
//        data: {...} },
//      { dataset: 'favorites', record_id: 'fav-002', 
//        data: {...} },
//      { dataset: 'favorites', record_id: (new), 
//        data: {...} }
//    ]
//
// 2. DELETE FROM app_data WHERE dataset = 'favorites'
// 3. INSERT all rows
// 4. COMMIT transaction
```

---

## 🔍 Deep Dive: Transaction Management

### **Read-Modify-Write Pattern**

```javascript
// ❌ UNSAFE - Race condition
async function unsafeUpdate() {
  const users = await readData('users');
  users[0].email = 'newemail@example.com';
  await writeData('users', users);
  // Between read & write, another instance might have modified users
}

// ✅ SAFE - Atomic transaction
async function safeUpdate() {
  await writeData('users', [
    {
      id: '1',
      username: 'apple',
      email: 'newemail@example.com', // Only changed field
      // ... other fields unchanged
    }
  ]);
  // MySQL: ON DUPLICATE KEY UPDATE handles merge
}
```

### **Transaction Wrapping:**

```javascript
// In writeToTable():
async function writeToTable(tableName, data) {
  const { query } = await import('@/lib/db');
  
  // 1. BEGIN transaction
  await query('BEGIN');
  
  try {
    // 2. Execute all updates
    for (const rec of records) {
      const sql = `INSERT INTO ... ON DUPLICATE KEY UPDATE ...`;
      await query(sql, values);
    }
    
    // 3. COMMIT if all succeed
    await query('COMMIT');
    return true;
  } catch (err) {
    // 4. ROLLBACK if any fail
    await query('ROLLBACK');
    throw err; // Re-throw error
  }
}
```

### **Transaction Semantics:**
```
BEGIN
  ↓
INSERT user-1 ✓
INSERT user-2 ✓
INSERT user-3 ✗ (violation)
  ↓
ROLLBACK (all 3 rolled back)
  ↓
Database state unchanged
```

---

## 🚀 Performance Comparison

### **Read Performance**

| Source | Query Type | Time | Pros | Cons |
|--------|-----------|------|------|------|
| MySQL Table | `SELECT * FROM users` | ~10ms | Indexed, Optimized | DB setup needed |
| app_data Table | `SELECT data FROM app_data WHERE dataset='users'` | ~50-100ms | Flexible | No indexes per-field |
| JSON File | `fs.readFile() + JSON.parse()` | ~200ms+ | No DB setup | I/O bound, slow |

**Example: 1000 records**
- MySQL: ~15ms
- app_data: ~150ms (10x slower)
- JSON: ~500ms+ (30x slower)

### **Write Performance**

| Method | Time | Why |
|--------|------|-----|
| Single INSERT ... ON DUPLICATE | ~5ms | One query, atomic |
| DELETE + batch INSERT | ~20ms | Two operations |
| Batch JSON file writes | ~200ms | Filesystem I/O |

---

## ⚙️ Configuration Examples

### **Development (JSON only)**
```bash
# .env (or no env vars)
# Database disabled by default
```

```javascript
// storage.js flow:
readData('users')
  → hasTable('users')? NO
  → hasTable('app_data')? NO
  → Read users.json ✓
```

### **Production (MySQL)**
```bash
# .env
DB_HOST=db.example.com
DB_USER=app_user
DB_PASS=secure_password
DB_NAME=rent_guard
DB_PORT=3306
```

```javascript
// storage.js flow:
readData('users')
  → hasTable('users')? YES
  → SELECT * FROM users ✓ (returns 100ms)
```

### **Staging (app_data only)**
```bash
# .env
DB_HOST=staging-db.local
DB_USER=staging_user
DB_NAME=rent_guard_staging
# Tables not yet migrated, only app_data exists
```

```javascript
// storage.js flow:
readData('users')
  → hasTable('users')? NO
  → hasTable('app_data')? YES
  → SELECT FROM app_data ✓ (returns 150ms)
```

---

## 🔧 Migration Checklist

### **From JSON to app_data**
```
[ ] 1. Create app_data table:
       CREATE TABLE app_data (
         id INT AUTO_INCREMENT PRIMARY KEY,
         dataset VARCHAR(255) NOT NULL,
         record_id VARCHAR(255) NOT NULL,
         data JSON NOT NULL,
         created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
         UNIQUE(dataset, record_id)
       );

[ ] 2. Insert JSON data:
       INSERT INTO app_data (dataset, record_id, data)
       SELECT 'users', JSON_EXTRACT(data, '$.id'), data
       FROM json_import;

[ ] 3. Verify reads return same data

[ ] 4. Restart app, verify functionality

[ ] 5. Keep JSON as backup
```

### **From app_data to Direct Tables**
```
[ ] 1. Create individual tables:
       CREATE TABLE users (
         id VARCHAR(255) PRIMARY KEY,
         username VARCHAR(255),
         ...
       );

[ ] 2. Migrate data:
       INSERT INTO users (id, username, ...)
       SELECT 
         JSON_EXTRACT(data, '$.id'),
         JSON_EXTRACT(data, '$.username'),
         ...
       FROM app_data
       WHERE dataset = 'users';

[ ] 3. Verify indexes are created

[ ] 4. Test query performance

[ ] 5. Clean up app_data entries

[ ] 6. Archive app_data table (don't drop)
```

---

## 📊 Data Consistency Scenarios

### **Scenario: App crashes mid-write**

```javascript
// Before crash:
users = [
  { id: '1', username: 'apple' },
  { id: '2', username: 'banana' }
];

// User updates username:
users[0].username = 'apple-new';

await writeData('users', users);
// Crash during query execution

// After restart:
// MySQL: 
//   - If crash before COMMIT → old data persists (transaction rolled back)
//   - If crash after COMMIT → new data saved

// app_data:
//   - Same transaction protection

// JSON:
//   - Could be partially written → corrupted
//   - Risk of data loss
```

### **Scenario: Concurrent writes**

```
// Client A                          // Client B
readData('users')      ──┐
                         ├─> Happens on server
readData('users')      ──┘

users.push(newUser)    // A
users.push(newUser)    // B

writeData('users', users)  // A
writeData('users', users)  // B (overwrites A's change!)

// Result: Only B's user is added, A's is lost
```

**Solution: Use API endpoints with locking**
```javascript
// POST /api/users with request queuing
// Don't use direct writeData in components
```

---

## 💡 Best Practices

### **✅ DO**
- Use `readData()` for all reads
- Use `writeData()` for all writes
- Set up MySQL for production
- Keep JSON as dev fallback
- Monitor query performance

### **❌ DON'T**
- Directly mutate JSON files from app code
- Mix database and JSON writes
- Assume app_data has same performance as tables
- Skip transactions for multi-record updates
- Keep app_data in production forever

---

## 📋 Troubleshooting

### **Issue: App always reads from JSON, never DB**

```javascript
// Check 1: hasTable() returns false
const hasUsers = await hasTable('users');
console.log('Has users table:', hasUsers);

// Check 2: db.js connection
const { query } = await import('@/lib/db');
const result = await query('SELECT 1'); // Should not throw

// Check 3: Environment vars
console.log(process.env.DB_HOST); // Should be set

// Fix: Restart app after .env changes
```

### **Issue: Writes fail silently**

```javascript
// Enable error logging in storage.js
try {
  await writeToTable(dataset, data);
} catch (error) {
  console.error(`SQL writeData to table failed for ${name}:`, error.message);
  // ↑ Check console for actual error
}
```

### **Issue: Data type mismatch**

```javascript
// JSON has string dates:
{ created_at: "2026-06-01T10:00:00.000Z" }

// MySQL expects DATETIME(3):
// In writeData, dates are sent as-is
// MySQL auto-converts ISO strings to DATETIME

// But custom types need manual conversion:
const data = {
  id: '1',
  amount: '100.50',     // ← MySQL DECIMAL expects number
  price: 100.50         // ✓ Correct
};
```

---

## 🎯 Summary

| Layer | Purpose | When to Use | Performance |
|-------|---------|------------|-------------|
| **MySQL Tables** | Production data | Always in prod | ⚡ 10-20ms |
| **app_data Table** | Semi-structured | Staging/transition | ⚠️ 50-150ms |
| **JSON Files** | Development | Dev/testing | 🐢 200ms+ |

**Flow:**
```
All Reads/Writes
    ↓
storage.js abstraction
    ↓
Try table → Try app_data → Try JSON file
    ↓
Return data consistently
```

This hybrid approach provides:
- ✅ Development agility (no DB setup)
- ✅ Production performance (indexed tables)
- ✅ Staged migrations (app_data transition)
- ✅ Rollback capability (JSON backup)
