# Analisis Perubahan Data JSON ke Database

## 📋 Ringkasan Eksekutif

Sistem aplikasi ini menggunakan **hybrid storage system** yang mengelola data dengan tiga tingkat fallback:
1. **Database MySQL** (Primary)
2. **Tabel Generic `app_data`** (Secondary)
3. **JSON Files** (Tertiary/Development)

---

## 🏗️ Arsitektur Sistem Storage

```
┌─────────────────────────────────────────────┐
│         Data Read/Write Request             │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│   storage.js (readData / writeData)         │
│                                             │
│  - readData(): Cek DB → app_data → JSON    │
│  - writeData(): Tulis ke DB → app_data     │
└─────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    ┌────────┐  ┌──────────┐  ┌──────────┐
    │ MySQL  │  │ app_data │  │ JSON     │
    │ Tables │  │  Table   │  │ Files    │
    └────────┘  └──────────┘  └──────────┘
```

---

## 📊 Data Flow: JSON ke Database

### **Fase 1: INISIALISASI (Setup Awal)**

#### Sumber Data JSON:
```
- users.json
- chats.json  
- deals.json
- transactions.json
- invoices.json
- ratings.json
- promos.json
- favorites.json
- notifications.json
- vendor_registrations.json
- orders.json
- returns.json
- invoice_counter.json
- services.json
```

#### Proses Migrasi:
```javascript
// storage.js: readData()
async function readData(name) {
  const dataset = getDatasetName(name);
  
  if (isServer) {
    // 1. Cek tabel khusus (users, deals, invoices, dll)
    if (await hasTable(dataset)) {
      return await readFromTable(dataset);  // ← Ambil dari MySQL
    }
    
    // 2. Fallback ke app_data table
    if (await hasTable('app_data')) {
      return await readFromAppData(dataset);  // ← Ambil dari app_data
    }
  }
  
  // 3. Fallback ke JSON file
  const raw = await readFile(`${dataset}.json`, 'utf-8');
  return normalizeJsonData(raw);  // ← Ambil dari JSON
}
```

### **Fase 2: TRANSFORMASI DATA**

#### Mapping Dataset JSON → Database Tables:

| JSON File | Database Table | Tujuan |
|-----------|---|---|
| users.json | users | Menyimpan user data dengan validasi PRIMARY KEY |
| deals.json | deals | Menyimpan transaksi/penawaran sewa |
| chats.json | chats | Menyimpan chat messages (JSON format) |
| invoices.json | invoices | Menyimpan tagihan dengan status pembayaran |
| transactions.json | transactions | Menyimpan record pembayaran |
| ratings.json | ratings | Menyimpan review & rating |
| promos.json | promos | Menyimpan promo vendor |
| favorites.json | app_data | Generic storage di app_data |
| notifications.json | app_data | Generic storage di app_data |
| orders.json | app_data | Generic storage di app_data |
| returns.json | app_data | Generic storage di app_data |
| services.json | services | Complex nested data dengan JSON columns |

#### Struktur MySQL untuk app_data (Generic):
```sql
CREATE TABLE app_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset VARCHAR(255) NOT NULL,      -- "favorites", "notifications", dll
  record_id VARCHAR(255) NOT NULL,    -- ID dari record JSON
  data JSON NOT NULL,                 -- Seluruh object JSON disimpan
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE(dataset, record_id)
);
```

---

## 🔄 Write Flow: Sinkronisasi ke Database

### **Skenario 1: Ketika ada Dataset Table**

```javascript
// writeData() - Jika tabel exists (users, deals, chats, dll)
async function writeToTable(tableName, data) {
  // 1. Parse data array
  const records = Array.isArray(data) ? data : [data];
  
  // 2. Generate SQL untuk setiap record
  for (const rec of records) {
    const keys = Object.keys(rec);
    const cols = ['id', 'username', 'email', ...];
    const values = [rec.id, rec.username, rec.email, ...];
    
    // 3. Gunakan INSERT ... ON DUPLICATE KEY UPDATE
    const sql = `
      INSERT INTO users (${cols}) VALUES (?, ?, ?, ...)
      ON DUPLICATE KEY UPDATE 
        username = VALUES(username),
        email = VALUES(email),
        ...
    `;
    
    await query(sql, values);
  }
}
```

**Keuntungan:**
✅ Direct table update (fast)
✅ Proper schema validation
✅ Foreign key constraints
✅ Indexed queries

### **Skenario 2: Fallback ke app_data Table**

```javascript
// writeData() - Jika hanya app_data exists
async function writeToAppData(dataset, data) {
  const records = Array.isArray(data) ? data : [data];
  
  const rows = records.map((item) => ({
    dataset: 'users',        // Kategori dataset
    record_id: item.id,      // ID dari record
    data: item               // Seluruh data JSON
  }));
  
  // DELETE existing records untuk dataset ini
  await query(`DELETE FROM app_data WHERE dataset = ?`, [dataset]);
  
  // INSERT data baru
  await query(`
    INSERT INTO app_data (dataset, record_id, data) 
    VALUES (?, ?, ?), (?, ?, ?), ...
  `, values);
}
```

**Karakteristik:**
- Semi-structured storage
- Cocok untuk data yang belum ter-normalize
- Query lebih lambat (JSON parsing di DB)
- Fleksibel untuk schema changes

### **Skenario 3: Fallback JSON Files**

```javascript
// writeData() - Final fallback
async function writeToJsonFile(dataset) {
  const file = fileMap[dataset]; // "users.json"
  const path = `${process.cwd()}/${file}`;
  
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}
```

**Penggunaan:**
- Development environment
- Data tidak tersimpan di DB
- Reload page = reset data

---

## 📝 Contoh Sinkronisasi Real: Users

### **Struktur JSON (users.json):**
```json
[
  {
    "id": "1",
    "username": "apple",
    "password": "123",
    "name": "Apple Vendor",
    "role": "vendor",
    "email": "apple@rentguard.com",
    "phone": "081234567890",
    "createdAt": "2026-04-01T00:00:00.000Z"
  },
  ...
]
```

### **Transformasi ke MySQL:**
```sql
INSERT INTO users (id, username, password, name, role, email, phone, created_at)
VALUES (
  '1',
  'apple',
  '123',
  'Apple Vendor',
  'vendor',
  'apple@rentguard.com',
  '081234567890',
  '2026-04-01 00:00:00.000'
) ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  password = VALUES(password),
  name = VALUES(name),
  role = VALUES(role),
  email = VALUES(email),
  phone = VALUES(phone);
```

### **Hasil di Database:**
```
id  | username | email                | role    | created_at
----|----------|----------------------|---------|-------------------
1   | apple    | apple@rentguard.com  | vendor  | 2026-04-01 00:00:00
```

---

## 🔍 Detail Tabel-Tabel Penting

### **1. Tabel `users`**
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255),
  password VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);
```

**Mapping JSON → DB:**
- `users.json` → `users` table
- Direct 1:1 mapping
- `createdAt` (JSON) → `created_at` (DB timestamp)

### **2. Tabel `deals`**
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
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  agreed_at DATETIME(3),
  discount JSON,              -- Nested JSON
  original_price DECIMAL(18,2),
  final_price DECIMAL(18,2),
  discount_updated_at DATETIME(3),
  invoice_status VARCHAR(255),
  payment_confirmed_at DATETIME(3),
  completed_at DATETIME(3),
  actual_return_date DATE,
  return_status VARCHAR(255),
  vendor_confirmed BOOLEAN,
  customer_confirmed BOOLEAN,
  settlement_date DATE,
  refund_status VARCHAR(255)
);
```

**Fitur:**
- Complex nested fields (discount, payment data)
- State tracking (status, return_status)
- Timeline events (created_at, agreed_at, completed_at)

### **3. Tabel `chats`**
```sql
CREATE TABLE chats (
  id VARCHAR(255) PRIMARY KEY,
  service_id VARCHAR(255),
  service_title VARCHAR(255),
  vendor_id VARCHAR(255),
  vendor_name VARCHAR(255),
  customer_id VARCHAR(255),
  customer_name VARCHAR(255),
  messages JSON,              -- Entire chat stored as JSON
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  deal_status VARCHAR(255)
);
```

**Pola:**
- Messages array disimpan sebagai JSON LONGBLOB
- Efficient untuk append operations
- Query individual messages lebih sulit (gunakan JSON_EXTRACT)

### **4. Tabel `app_data` (Generic)**
```sql
CREATE TABLE app_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset VARCHAR(255) NOT NULL,      -- "favorites", "notifications", dll
  record_id VARCHAR(255) NOT NULL,
  data JSON NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE(dataset, record_id)
);

CREATE INDEX idx_app_data_dataset ON app_data(dataset);
```

**Digunakan untuk:**
- favorites.json → app_data (dataset='favorites')
- notifications.json → app_data (dataset='notifications')
- orders.json → app_data (dataset='orders')
- returns.json → app_data (dataset='returns')

---

## ⚙️ Mekanisme Normalisasi & Cleanup

### **normalizeJsonData() Function:**
```javascript
function normalizeJsonData(raw) {
  if (!raw) return [];
  try {
    // 1. Hapus BOM (Byte Order Mark)
    const sanitized = raw.replace(/^\uFEFF/, '').trim();
    
    // 2. Parse JSON
    return sanitized ? JSON.parse(sanitized) : [];
  } catch {
    // 3. Return empty array jika invalid JSON
    return [];
  }
}
```

**Handling:**
- Graceful error handling
- UTF-8 BOM support
- Invalid JSON → []

### **normalizeKey() Function:**
```javascript
function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}
```

**Penggunaan:**
- Normalize dataset names
- Case-insensitive matching
- Whitespace cleanup

---

## 🔐 Data Consistency & Transactions

### **Atomic Write Operations:**

```javascript
// writeToTable - Transaction block
await query('BEGIN');
try {
  // Update semua records
  for (const rec of records) {
    await query(insertSQL, values);
  }
  await query('COMMIT');   // ✅ Commit semua
  return true;
} catch (err) {
  await query('ROLLBACK'); // ❌ Rollback semua jika error
  throw err;
}
```

**Jaminan:**
- All-or-nothing semantics
- Prevent partial updates
- Data consistency

---

## 🚀 Performance Considerations

### **Read Optimization:**
```
1. hasTable() dengan cache (dbTableCache)
   - Hindari repeated INFORMATION_SCHEMA queries
   - Per-request caching

2. Direct table reads > app_data queries
   - Table: SELECT * FROM users (indexed)
   - app_data: SELECT * FROM app_data WHERE dataset='users' (slower)

3. JSON file reads (fallback)
   - Disks I/O expensive
   - Hanya saat development
```

### **Write Optimization:**
```
1. ON DUPLICATE KEY UPDATE
   - Avoid DELETE + INSERT (2 queries → 1 query)
   - Atomic at DB level
   
2. Batch inserts
   - Multiple records in single INSERT
   - Via INSERT ... VALUES (row1), (row2), ...
   
3. Transaction wrapping
   - Group updates
   - Single COMMIT point
```

---

## 🔗 Environment Configuration

### **Database Connection (db.js):**

```javascript
// Priority order:
// 1. DATABASE_URL (if provided)
// 2. Individual env vars (DB_HOST, DB_USER, etc)
// 3. Defaults: localhost, root, proyek

const pool = mysql.createPool({
  host: DB_HOST || '127.0.0.1',
  user: DB_USER || 'root',
  password: DB_PASS || '',
  database: DB_NAME || 'proyek',
  port: DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,      // Pool size
  queueLimit: 0             // Unlimited queue
});
```

### **Environment Variables Needed:**
```bash
# MySQL Configuration
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=password
DB_NAME=rent_guard
DB_PORT=3306

# OR use single connection string
DATABASE_URL=mysql://user:password@localhost:3306/rent_guard
```

---

## 📈 Data Sync Workflow Summary

### **Initialization:**
```
1. App Start
   ↓
2. readData('users') called
   ↓
3. Check if 'users' table exists
   ├─ YES → Query from MySQL users table
   ├─ NO  → Check app_data table
   └─ NO  → Read from users.json file
   ↓
4. Return normalized data array
   ↓
5. App uses data
```

### **Update/Mutation:**
```
1. User modifies data (add/edit/delete user)
   ↓
2. writeData('users', updatedArray) called
   ↓
3. Try write to 'users' table
   ├─ SUCCESS → Done
   ├─ ERROR → Try app_data table
   └─ ERROR → Write to users.json file
   ↓
4. Return success/failure
   ↓
5. Client receives response
```

---

## ⚠️ Issues & Considerations

### **1. Schema Mismatch**
- JSON fields seperti `createdAt` perlu map ke `created_at` di DB
- Extra fields di JSON diabaikan di DB
- Missing DB fields diisi default nilai

### **2. Performance Cliff**
- Tabel besar (1000+ records) → JSON parsing slow
- app_data queries tidak indexed per-field
- Recommendation: Migrate ke direct tables

### **3. Data Type Handling**
```javascript
// Nested objects/arrays
const v = rec[k];
JSON.stringify(v)  // Objects → JSON string di DB

// Simple values
v === undefined ? null : v  // Null handling
```

### **4. No Real-time Sync**
- Changes in JSON not reflected if DB exists
- Must restart app to load fresh JSON
- Recommendation: Use DB primarily

---

## ✅ Best Practices

### **Development:**
1. Use JSON files for quick iteration
2. No database setup needed
3. Data resets on restart

### **Production:**
1. Set up MySQL database
2. Run `mysql < sql/proyek_bisnis.sql`
3. Configure DB_ env vars
4. App auto-loads from DB
5. JSON files ignored (if DB exists)

### **Migration Strategy:**
```
1. Export JSON to CSV
   ↓
2. Create tables with sql/proyek_bisnis.sql
   ↓
3. Import CSV to tables
   ↓
4. Set DB env vars
   ↓
5. Verify app loads from DB
   ↓
6. Keep JSON as backup only
```

---

## 📊 Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│ Application Layer (API Routes / Components)         │
└──────────────────────────────────────────────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │ storage.js                        │
         │ readData() / writeData()           │
         └───────────────────────────────────┘
                    ↓         ↓         ↓
      ┌─────────────┴─────────┴─────────┴─────────┐
      │                                           │
      ▼                ▼                ▼         ▼
  ┌────────┐      ┌──────────┐    ┌───────┐  ┌─────────┐
  │ MySQL  │      │ Generic  │    │ Cache │  │ JSON    │
  │ Tables │      │ app_data │    │ (Map) │  │ Files   │
  │        │      │ Table    │    │       │  │ (FS)    │
  └────────┘      └──────────┘    └───────┘  └─────────┘
  (users,              (generic                (Legacy
   deals,              datasets)              Fallback)
   chats,
   etc.)
```

---

## 🎯 Kesimpulan

Sistem hybrid ini dirancang untuk:
- ✅ Fleksibilitas (dev with JSON, prod with DB)
- ✅ Backward compatibility (fallback chain)
- ✅ Performance (table indexing)
- ✅ Scalability (proper schema)

**Rekomendasi:**
1. Untuk development → Gunakan JSON
2. Untuk production → Gunakan MySQL dengan proper tables
3. Transition → Migrate data dari JSON ke database tables secara bertahap
