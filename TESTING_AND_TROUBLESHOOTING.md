# Testing & Troubleshooting Guide: JSON to Database Sync

## 🧪 Testing Procedures

### **Test 1: Verify Storage Layer Can Read Data**

```javascript
// test-storage-read.js
import { readData } from './src/lib/storage.js';

async function testRead() {
  console.log('Testing readData...\n');
  
  const datasets = ['users', 'deals', 'chats', 'invoices', 'ratings'];
  
  for (const dataset of datasets) {
    try {
      const data = await readData(dataset);
      console.log(`✓ ${dataset}: ${data.length} records`);
      
      if (data.length > 0) {
        console.log(`  First record:`, JSON.stringify(data[0], null, 2).split('\\n').slice(0, 3).join('\\n'));
      }
    } catch (error) {
      console.error(`✗ ${dataset}: ${error.message}`);
    }
  }
}

testRead();
```

**Expected Output:**
```
Testing readData...

✓ users: 5 records
  First record: {
    "id": "1",
    "username": "apple"

✓ deals: 3 records
  First record: {
    "id": "deal-001",

✓ chats: 2 records
✓ invoices: 1 records
✓ ratings: 0 records
```

**If fails:**
- ❌ `Cannot find module` → Check file path
- ❌ `ENOENT: no such file or directory` → JSON file missing
- ❌ `SyntaxError: Unexpected token` → Corrupted JSON

---

### **Test 2: Verify Database Connection**

```javascript
// test-db-connection.js
const db = require('./src/lib/db');

async function testConnection() {
  console.log('Testing database connection...\n');
  
  try {
    // Test 1: Basic connectivity
    console.log('1. Testing connectivity...');
    const result = await db.query('SELECT 1 as ping');
    console.log('✓ Connected to MySQL');
    console.log('  Response:', result);
    
    // Test 2: Database exists
    console.log('\\n2. Checking database...');
    const dbCheck = await db.query('SELECT DATABASE()');
    console.log('✓ Current database:', dbCheck[0]);
    
    // Test 3: Tables exist
    console.log('\\n3. Checking tables...');
    const tables = await db.query(`
      SELECT TABLE_NAME FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    console.log('✓ Tables found:', tables.length);
    tables.forEach(t => console.log('  -', t.TABLE_NAME));
    
  } catch (error) {
    console.error('✗ Connection failed');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
  }
}

testConnection();
```

**Expected Output:**
```
Testing database connection...

1. Testing connectivity...
✓ Connected to MySQL
  Response: [ { ping: 1 } ]

2. Checking database...
✓ Current database: rent_guard

3. Checking tables...
✓ Tables found: 10
  - users
  - deals
  - chats
  - invoices
  - transactions
  - ratings
  - promos
  - services
  - favorites
  - notifications
```

**Common errors:**
- `Error: connect ECONNREFUSED 127.0.0.1:3306` → MySQL not running
- `Error: Access denied for user 'root'@'localhost'` → Wrong password
- `Error: Unknown database 'rent_guard'` → Database not created
- `Error: Unknown table 'users'` → Schema not loaded

---

### **Test 3: Verify Data Consistency (MySQL vs JSON)**

```javascript
// test-data-consistency.js
import { readData } from './src/lib/storage.js';
import fs from 'fs/promises';

async function testConsistency() {
  console.log('Testing data consistency...\n');
  
  // Read from storage (could be from DB or JSON)
  const fromStorage = await readData('users');
  console.log(`From storage: ${fromStorage.length} records`);
  
  // Read directly from JSON file
  const jsonRaw = await fs.readFile('./users.json', 'utf-8');
  const fromJSON = JSON.parse(jsonRaw);
  console.log(`From JSON file: ${fromJSON.length} records`);
  
  // Compare
  if (fromStorage.length === fromJSON.length) {
    console.log('✓ Record count matches');
  } else {
    console.log('✗ Record count mismatch!');
    console.log(`  Storage: ${fromStorage.length}, JSON: ${fromJSON.length}`);
  }
  
  // Deep comparison
  console.log('\\nDeep comparison of first record:');
  const storage1 = fromStorage[0];
  const json1 = fromJSON[0];
  
  const keys = new Set([...Object.keys(storage1), ...Object.keys(json1)]);
  let mismatch = false;
  
  for (const key of keys) {
    if (JSON.stringify(storage1[key]) !== JSON.stringify(json1[key])) {
      console.log(`✗ ${key}: storage="${storage1[key]}" vs json="${json1[key]}"`);
      mismatch = true;
    }
  }
  
  if (!mismatch) {
    console.log('✓ All fields match');
  }
}

testConsistency();
```

---

### **Test 4: Write Operation Test**

```javascript
// test-write-operation.js
import { readData, writeData } from './src/lib/storage.js';

async function testWrite() {
  console.log('Testing write operation...\n');
  
  // Step 1: Read current data
  console.log('1. Reading current users...');
  let users = await readData('users');
  const originalCount = users.length;
  console.log(`✓ Read ${originalCount} users`);
  
  // Step 2: Create test record
  console.log('\\n2. Creating test record...');
  const testUser = {
    id: 'test-' + Date.now(),
    username: 'testuser',
    password: 'test123',
    name: 'Test User',
    role: 'customer',
    email: 'test@example.com',
    phone: '0800000000',
    createdAt: new Date().toISOString()
  };
  users.push(testUser);
  console.log('✓ Added test user:', testUser.id);
  
  // Step 3: Write back
  console.log('\\n3. Writing data...');
  try {
    await writeData('users', users);
    console.log('✓ Write succeeded');
  } catch (error) {
    console.error('✗ Write failed:', error.message);
    return;
  }
  
  // Step 4: Verify write
  console.log('\\n4. Verifying write...');
  const usersAfter = await readData('users');
  if (usersAfter.length === originalCount + 1) {
    console.log('✓ Record count increased');
  } else {
    console.log('✗ Record count not updated:', usersAfter.length, 'vs', originalCount + 1);
  }
  
  const found = usersAfter.find(u => u.id === testUser.id);
  if (found) {
    console.log('✓ Test record found in storage');
  } else {
    console.log('✗ Test record not found!');
  }
  
  // Step 5: Cleanup
  console.log('\\n5. Cleaning up...');
  users = users.filter(u => u.id !== testUser.id);
  await writeData('users', users);
  console.log('✓ Test record removed');
}

testWrite();
```

---

## 🔧 Troubleshooting Guide

### **Problem 1: "Cannot read property 'query' of undefined"**

**Symptom:**
```
TypeError: Cannot read property 'query' of undefined
at readFromTable (/path/src/lib/storage.js:...)
```

**Root Cause:**
- Database module not loading
- DB connection pool failed
- Node process not running server-side code

**Fix:**
```javascript
// Check: Are you on server or client?
const isServer = typeof window === 'undefined';
console.log('Is server:', isServer);

// If not server, readData returns [] automatically

// If server but still failing:
// 1. Check .env variables
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);

// 2. Restart dev server (env vars loaded at startup)
// npm run dev

// 3. Check db.js connection:
const db = require('./src/lib/db');
db.query('SELECT 1').then(() => console.log('DB OK'));
```

---

### **Problem 2: "ENOENT: no such file or directory"**

**Symptom:**
```
Error: ENOENT: no such file or directory, open '/path/users.json'
```

**Root Cause:**
- JSON file deleted
- Wrong working directory
- Path resolution issue

**Fix:**
```javascript
// Check file exists:
import fs from 'fs/promises';

try {
  await fs.access('./users.json');
  console.log('✓ File exists');
} catch {
  console.error('✗ File not found');
}

// Check working directory:
console.log('Current working directory:', process.cwd());
// Should be project root where users.json is located

// If running from wrong directory:
process.chdir('/path/to/project');

// Restore from git (if tracked):
// git checkout users.json
```

---

### **Problem 3: "SyntaxError: JSON.parse"**

**Symptom:**
```
SyntaxError: Unexpected token u in JSON at position 0
```

**Root Cause:**
- Corrupted JSON file
- File encoded incorrectly (BOM issues)
- File contains non-JSON data

**Fix:**
```bash
# Check file content:
head -c 100 users.json
# Look for: [{ or {[ or any valid JSON start

# If starts with strange characters → BOM issue
# Fix with:
sed -i '1s/^\xEF\xBB\xBF//' users.json

# Or regenerate from backup:
git checkout users.json

# Or validate JSON:
node -e "console.log(JSON.parse(require('fs').readFileSync('users.json', 'utf-8')))" && echo "✓ Valid"
```

---

### **Problem 4: "Data not persisting after write"**

**Symptom:**
- Write appears to succeed
- Read shows old data
- Changes lost on restart

**Root Cause:**
- Write went to JSON but app reads from DB
- Transaction rollback on error
- Multiple processes overwriting each other

**Debug:**
```javascript
// Add logging to storage.js
async function writeData(name, data) {
  const dataset = getDatasetName(name);
  
  console.log(`[writeData] Starting write for: ${name} (${data.length} records)`);
  
  // Try write to table
  try {
    if (await hasTable(dataset)) {
      console.log(`[writeData] Writing to table: ${dataset}`);
      const result = await writeToTable(dataset, data);
      console.log(`[writeData] Table write succeeded`);
      return result;
    }
  } catch (error) {
    console.log(`[writeData] Table write failed: ${error.message}`);
  }
  
  // Try write to app_data
  try {
    if (await hasTable('app_data')) {
      console.log(`[writeData] Writing to app_data`);
      const result = await writeToAppData(dataset, data);
      console.log(`[writeData] app_data write succeeded`);
      return result;
    }
  } catch (error) {
    console.log(`[writeData] app_data write failed: ${error.message}`);
  }
  
  // Fallback to JSON
  try {
    console.log(`[writeData] Writing to JSON file`);
    const result = await writeFile(...);
    console.log(`[writeData] JSON write succeeded`);
    return result;
  } catch (error) {
    console.log(`[writeData] JSON write failed: ${error.message}`);
    throw error;
  }
}
```

**Then check logs:**
```bash
npm run dev 2>&1 | grep writeData
# Look for which layer succeeded
```

---

### **Problem 5: "MySQL Connection Pool Exhausted"**

**Symptom:**
```
Error: no connection available
Error: getConnection timeout
```

**Root Cause:**
- Too many concurrent connections
- Connections not being released
- Query hangs/deadlock

**Fix:**
```javascript
// In db.js, increase pool size
const pool = mysql.createPool({
  // ...
  connectionLimit: 20,  // Increase from 10
  queueLimit: 50,       // Increase from 0
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

// Monitor connection usage:
pool.on('acquire', () => console.log('Connection acquired'));
pool.on('release', () => console.log('Connection released'));

// Check for hanging queries:
// In MySQL:
// SHOW PROCESSLIST;
// Kill if needed: KILL <process_id>;
```

---

### **Problem 6: "Timestamp mismatch"**

**Symptom:**
```
JSON: "createdAt": "2026-04-01T00:00:00.000Z"
DB:   created_at: 2026-04-01 00:00:00.000  ← Different timezone?
```

**Root Cause:**
- Timezone handling inconsistency
- JSON stores ISO string, MySQL stores DATETIME
- Driver locale settings

**Fix:**
```javascript
// Ensure consistent ISO format in code:
const createdAt = new Date('2026-04-01T00:00:00Z').toISOString();
// → "2026-04-01T00:00:00.000Z"

// MySQL auto-converts ISO strings:
// "2026-04-01T00:00:00Z" → DATETIME: 2026-04-01 00:00:00.000

// In queries, use:
SELECT DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') FROM users;

// Or in Node.js:
const row = await query(...);
const date = new Date(row.created_at);  // Automatically parsed
const iso = date.toISOString();  // Back to ISO
```

---

### **Problem 7: "Duplicate key error"**

**Symptom:**
```
Error: Duplicate entry 'user-1' for key 'PRIMARY'
```

**Root Cause:**
- Inserting record with same ID twice
- ID generation collision
- Data cleanup issue

**Fix:**
```javascript
// The INSERT ... ON DUPLICATE KEY UPDATE should handle this
// If error still occurs:

// Check duplicate records in JSON:
const users = readData('users');
const ids = users.map(u => u.id);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length > 0) {
  console.warn('Duplicate IDs found:', duplicates);
  // Remove duplicates
  const seen = new Set();
  const unique = users.filter(u => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
  await writeData('users', unique);
}
```

---

### **Problem 8: "Charset/encoding issues"**

**Symptom:**
```
Characters show as ??? or mojibake
UTF-8 data corrupted
```

**Root Cause:**
- File not saved as UTF-8
- MySQL connection charset mismatch
- JSON parsing issue

**Fix:**
```bash
# Check file encoding:
file -i users.json
# Should show: text/plain; charset=utf-8

# Fix if needed:
iconv -f ISO-8859-1 -t UTF-8 users.json > users.json.tmp
mv users.json.tmp users.json

# Ensure MySQL uses UTF-8:
ALTER DATABASE rent_guard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# In Node.js:
// db.js connection:
const pool = mysql.createPool({
  // ...
  connectionAttributes: {
    _client_version: '8.0',
  },
  charset: 'utf8mb4',
});
```

---

## 📊 Performance Diagnostics

### **Slow Query Identification**

```javascript
// test-query-performance.js
import { readData } from './src/lib/storage.js';

async function testPerformance() {
  const datasets = ['users', 'deals', 'chats', 'services', 'invoices'];
  
  console.log('Performance Test (reading 3 times each):\n');
  console.log('Dataset'.padEnd(15) + 'Min'.padEnd(10) + 'Max'.padEnd(10) + 'Avg'.padEnd(10) + 'Count');
  console.log('-'.repeat(60));
  
  for (const dataset of datasets) {
    const times = [];
    
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const data = await readData(dataset);
      const duration = Date.now() - start;
      times.push({ duration, count: data.length });
    }
    
    const min = Math.min(...times.map(t => t.duration));
    const max = Math.max(...times.map(t => t.duration));
    const avg = times.reduce((a, b) => a + b.duration, 0) / times.length;
    const count = times[0].count;
    
    console.log(
      dataset.padEnd(15) +
      `${min}ms`.padEnd(10) +
      `${max}ms`.padEnd(10) +
      `${avg.toFixed(1)}ms`.padEnd(10) +
      count
    );
  }
}

testPerformance();
```

**Expected Output:**
```
Performance Test (reading 3 times each):

Dataset        Min       Max       Avg       Count
------------------------------------------------------------
users          8ms       12ms      10.0ms    5
deals          5ms       7ms       6.2ms     3
chats          18ms      25ms      20.3ms    1000
services       12ms      15ms      13.2ms    200
invoices       3ms       4ms       3.5ms     1
```

**Red flags:**
- `> 100ms` for small datasets → Likely JSON file fallback
- `> 500ms` for large datasets → Performance issue
- Increasing time over repeats → Connection issue

---

## ✅ Verification Checklist

### **Before Production**

- [ ] MySQL database created and running
- [ ] All tables created (check with SHOW TABLES)
- [ ] Initial data seeded to all tables
- [ ] .env variables set (DB_HOST, DB_USER, DB_PASS, DB_NAME)
- [ ] Test read performance (should be < 50ms)
- [ ] Test write operation (should succeed)
- [ ] Verify data consistency (MySQL vs JSON if applicable)
- [ ] Check for duplicate IDs
- [ ] Verify timestamps are ISO format
- [ ] Test with multiple concurrent requests
- [ ] Monitor query logs (SHOW PROCESSLIST)
- [ ] Backup database before going live

### **Regular Monitoring**

- [ ] Monitor slow query log
- [ ] Check connection pool status
- [ ] Verify backup runs daily
- [ ] Check disk space for logs
- [ ] Monitor error logs for consistency issues
- [ ] Review JSON file size (if keeping for backup)

---

## 📝 Test Report Template

```
# Test Report: JSON to Database Sync

Date: 2026-06-15
Environment: Development / Staging / Production
Tester: [Name]

## Test Results

### Connectivity
- [ ] MySQL Connection: PASS / FAIL
- [ ] Database Exists: PASS / FAIL
- [ ] Tables Created: PASS / FAIL

### Read Operations
- [ ] Read Users: PASS / FAIL (time: ___ ms, records: ___)
- [ ] Read Deals: PASS / FAIL (time: ___ ms, records: ___)
- [ ] Read Chats: PASS / FAIL (time: ___ ms, records: ___)

### Write Operations
- [ ] Write Test Record: PASS / FAIL
- [ ] Verify Persistence: PASS / FAIL
- [ ] Cleanup: PASS / FAIL

### Data Consistency
- [ ] MySQL vs JSON Match: PASS / FAIL
- [ ] Duplicate IDs: None Found / ___ Found
- [ ] Charset Issues: None / ___

### Performance
- [ ] Average Read Time < 50ms: PASS / FAIL
- [ ] Average Write Time < 100ms: PASS / FAIL
- [ ] No Connection Pool Errors: PASS / FAIL

## Issues Found

1. [Issue description]
   - Severity: Critical / High / Medium / Low
   - Resolution: [Fix applied]

## Sign-Off

Tester: _____________
Date: _______________
Status: Ready for Production / Needs Work
```

---

## 🎯 Next Steps

If all tests pass:
1. ✅ Data layer is working correctly
2. ✅ MySQL properly configured
3. ✅ Ready for application testing
4. ✅ Can proceed with user acceptance testing

If issues found:
1. ❌ Refer to troubleshooting section
2. ❌ Check error logs carefully
3. ❌ Run individual tests to isolate issue
4. ❌ Escalate if database corruption suspected
