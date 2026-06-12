# 📋 ANALISIS LOGIKA PEMINJAMAN - PROYEK BISNIS

**Tanggal Analisis:** 30 April 2026  
**Status:** ⚠️ Incomplete - Membutuhkan Implementasi Tanggal Peminjaman

## ✅ CURRENT STATUS NOTE

Ini adalah analisis historis. Jika ada poin yang sudah dicakup di fix summary atau implementation guide yang lebih baru, anggap dokumen ini sebagai referensi awal, bukan status final.

---

## 1️⃣ FIELD YANG SUDAH ADA

### Dalam `services.json`:
```json
{
  "minimumDays": 4,  // ✅ Durasi minimum peminjaman
  "quantity": 3      // Jumlah item tersedia
}
```

### Dalam `transactions.json`:
```json
{
  "startDate": "2026-04-11",     // ✅ Tanggal mulai
  "durationDays": 1,              // ✅ Berapa hari
  "basePrice": 150000
}
```

### Dalam `deals.json`:
```json
{
  "createdAt": "2026-04-29T20:15:59.494Z",    // ✅ Waktu deal dibuat
  "agreedAt": "2026-04-29T20:16:45.405Z",     // ✅ Waktu deal disetujui
  "completedAt": "2026-04-29T20:25:46.277Z"   // ✅ Waktu deal selesai (tapi tidak jelas jika sudah dikembalikan)
}
```

---

## 2️⃣ FIELD YANG HILANG (Critical untuk Peminjaman)

### ❌ Tidak Ada di `deals.json`:

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `borrowDate` | ISO String | Tanggal item benar-benar dipinjam (saat pickup/delivery) |
| `expectedReturnDate` | ISO String | Tanggal pengembalian yang diharapkan (borrowDate + durationDays) |
| `actualReturnDate` | ISO String | Tanggal item benar-benar dikembalikan |
| `returnDeadline` | ISO String | Batas waktu untuk mengingatkan (misalnya 1 hari sebelum expectedReturnDate) |
| `returnStatus` | String | `pending`, `returned`, `late`, `missing` |
| `daysLate` | Number | Berapa hari keterlambatan |
| `lateCharge` | Number | Biaya keterlambatan jika ada |
| `lastReminderSent` | ISO String | Tracking reminder sudah dikirim |

---

## 3️⃣ FLOW SAAT INI vs YANG SEHARUSNYA

### Flow Saat Ini:
```
Deal Created → Customer Accept → Vendor Accept → Payment → Mark Complete
                                                              (tapi bukan return!)
```

**Problem:**
- "Complete" hanya berarti pembayaran berhasil, bukan item sudah dikembalikan
- Tidak ada notifikasi reminder untuk pengembalian
- Tidak ada tracking item sudah kembali atau belum

### Flow Yang Seharusnya:
```
Deal Created 
  ↓
Customer + Vendor Accept → Payment → Deal Agreed
  ↓
Rental Starts (borrowDate diset) → Calculate expectedReturnDate
  ↓
Ongoing Phase → Send reminder jika mendekati deadline
  ↓
Return Action → Validate & update actualReturnDate & returnStatus
  ↓
Complete → Mark as returned (status: 'returned' atau 'late')
```

---

## 4️⃣ MASALAH SPESIFIK

### 🔴 Masalah #1: Tidak Ada Tanggal Peminjaman Resmi
**Lokasi:** `src/app/api/deals/route.js` & `src/app/api/transactions/route.js`

```javascript
// Sekarang: hanya ada di transaction, tidak ter-link dengan deal
const newTransaction = {
  startDate: startDate,        // Dari payment page
  durationDays: durationDays,  // Dari payment page
  // ... tapi deal.json tidak tahu ini
};
```

**Solusi:** Link transaction startDate ke deal, atau hitung dari agreedAt

---

### 🔴 Masalah #2: Tidak Ada Expected Return Date
**Lokasi:** Sama seperti di atas

```javascript
// Sekarang: tidak dihitung
// Seharusnya:
const borrowDate = deal.borrowDate || new Date().toISOString();
const expectedReturnDate = new Date(new Date(borrowDate).getTime() + (durationDays * 24 * 60 * 60 * 1000)).toISOString();

// Simpan ke deal:
deal.borrowDate = borrowDate;
deal.expectedReturnDate = expectedReturnDate;
deal.returnStatus = 'pending';
```

---

### 🔴 Masalah #3: Tidak Ada Return Tracking
**Lokasi:** Tidak ada endpoint untuk submit return!

**Missing Endpoint:** `POST /api/returns` atau tambah ke `/api/deals`

```javascript
// Harus ditambah:
if (action === 'return-item') {
  const { dealId, actualReturnDate, condition, notes } = body;
  
  const deal = deals.find(d => d.id === dealId);
  const expectedReturn = new Date(deal.expectedReturnDate);
  const actual = new Date(actualReturnDate);
  
  deal.actualReturnDate = actualReturnDate;
  deal.returnStatus = actual > expectedReturn ? 'late' : 'returned';
  deal.daysLate = Math.max(0, Math.ceil((actual - expectedReturn) / (1000 * 60 * 60 * 24)));
  
  if (deal.daysLate > 0) {
    deal.lateCharge = deal.daysLate * (hargaPerHari * 0.1); // contoh: 10% biaya/hari
  }
}
```

---

### 🔴 Masalah #4: Tidak Ada Reminder System
**Lokasi:** Tidak ada job untuk send reminder

**Seharusnya ada:**
1. Reminder 1 hari sebelum expectedReturnDate
2. Reminder 3 hari sebelum expectedReturnDate (untuk persiapan)
3. Alert jika sudah lewat expectedReturnDate

---

### 🔴 Masalah #5: Tidak Ada Return Status di UI
**Lokasi:** `src/app/customer/ongoing/page.js`

Saat ini hanya ada "Complain" button, tidak ada "Return Item" atau "Mark as Returned"

---

## 5️⃣ REKOMENDASI IMPLEMENTASI (Prioritas)

### 🔥 PRIORITY 1: Struktur Data (Lakukan Dulu)
1. Update `deals.json` schema untuk tambah borrowing fields
2. Migration: Update existing deals dengan default values
3. Update transaction API untuk simpan borrowDate ke deal

**Files to Update:**
- `src/app/api/deals/route.js` - tambah borrowDate, expectedReturnDate
- `src/app/api/transactions/route.js` - link ke deal borrowing fields
- `deals.json` - schema documentation

### 🔥 PRIORITY 2: Return Tracking API
1. Create `src/app/api/returns/route.js`
2. Handle: `POST /api/returns` untuk submit return
3. Calculate: daysLate, lateCharge, returnStatus

**New Endpoint:**
```
POST /api/returns
Body: {
  dealId,
  actualReturnDate,  
  condition,         // 'good', 'damaged', 'missing'
  notes,
  returnPhoto
}
Response: {
  deal (updated),
  actualReturnDate,
  returnStatus,
  daysLate,
  lateCharge (jika ada)
}
```

### 🟡 PRIORITY 3: UI Update untuk Return Flow
1. Add "Return Item" button di ongoing orders
2. Modal untuk capture actual return date + condition
3. Show expected vs actual return date

**Files to Update:**
- `src/app/customer/ongoing/page.js` - add return modal
- `src/app/vendor/invoices/page.js` - show return status

### 🟡 PRIORITY 4: Reminder & Notification System
1. Create notification jobs (bisa manual atau cron)
2. Send reminder on specific dates
3. Update notification types

**New Notification Types:**
- `return_reminder_1day`
- `return_reminder_3day`
- `return_overdue`
- `return_completed`

### 🟢 PRIORITY 5: Late Charge & Invoice Update
1. Auto-create late charge invoice jika needed
2. Update invoice API untuk include late charges
3. Add cancellation policy untuk return

---

## 6️⃣ DATA MODEL YANG DIREKOMENDASIKAN

### Deal Model (Updated):
```json
{
  "id": "1777493759494",
  "chatId": "1777493750510",
  "customerId": "4",
  "vendorId": "3",
  "serviceId": "1704067202000",
  "status": "completed",
  
  "createdAt": "2026-04-29T20:15:59.494Z",
  "agreedAt": "2026-04-29T20:16:45.405Z",
  "completedAt": "2026-04-29T20:25:46.277Z",
  
  /* ===== BORROWING FIELDS (NEW) ===== */
  "borrowDate": "2026-04-29T20:30:00.000Z",           // Kapan benar-benar dipinjam
  "expectedReturnDate": "2026-05-03T20:30:00.000Z",   // Kapan harus kembali (borrowDate + 4 hari)
  "actualReturnDate": "2026-05-03T19:45:00.000Z",     // Kapan benar-benar dikembalikan
  "returnStatus": "returned",                          // pending|returned|late|missing|damaged
  "daysLate": 0,                                       // Berapa hari terlambat
  "lateCharge": 0,                                     // Biaya terlambat (jika ada)
  "returnCondition": "good",                           // good|minor-damage|major-damage|missing
  "returnNotes": "Item dikembalikan dalam kondisi baik",
  "lastReminderSent": "2026-05-03T06:00:00.000Z",    // Tracking reminder
  /* ===== END BORROWING FIELDS ===== */
  
  "originalPrice": 50000,
  "finalPrice": 40000,
  "discountGiven": true,
  "discount": {
    "type": "percent",
    "value": 20,
    "amount": 10000
  }
}
```

---

## 7️⃣ CONTOH IMPLEMENTASI (Snippet)

### Update `src/app/api/deals/route.js`:

```javascript
// Saat vendor accept deal
if (action === 'accept' && !existingDeal) {
  const newDeal = {
    id: Date.now().toString(),
    chatId,
    customerId,
    vendorId,
    serviceId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    agreedAt: null,
    
    // NEW FIELDS:
    borrowDate: null,              // Akan diset saat payment
    expectedReturnDate: null,      // Akan dihitung
    actualReturnDate: null,
    returnStatus: 'pending',
    daysLate: 0,
    lateCharge: 0,
    returnCondition: null,
    returnNotes: '',
    lastReminderSent: null
  };
  deals.push(newDeal);
}

// Saat customer melakukan return
if (action === 'return-item') {
  const { dealId, actualReturnDate, condition, notes } = body;
  const deal = deals.find(d => d.id === dealId);
  
  if (!deal) {
    return NextResponse.json({ success: false, message: 'Deal tidak ditemukan' }, { status: 404 });
  }
  
  if (!deal.expectedReturnDate) {
    return NextResponse.json({ success: false, message: 'Data peminjaman tidak valid' }, { status: 400 });
  }
  
  const expectedDate = new Date(deal.expectedReturnDate);
  const actualDate = new Date(actualReturnDate);
  const daysOverdue = Math.max(0, Math.ceil((actualDate - expectedDate) / (1000 * 60 * 60 * 24)));
  
  // Update deal
  deal.actualReturnDate = actualReturnDate;
  deal.returnStatus = daysOverdue > 0 ? 'late' : 'returned';
  deal.daysLate = daysOverdue;
  deal.returnCondition = condition;
  deal.returnNotes = notes;
  
  // Calculate late charge (contoh: 10% harga/hari keterlambatan)
  if (daysOverdue > 0) {
    const dailyRate = deal.finalPrice / 4; // Asumsi 4 hari rental
    deal.lateCharge = Math.round(daysOverdue * dailyRate * 0.1);
  }
  
  await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
  
  // Create notification
  await createNotification(
    deal.vendorId,
    'return_completed',
    `Item dari deal ini telah dikembalikan. Status: ${deal.returnStatus}`,
    deal.chatId,
    { daysLate: daysOverdue, lateCharge: deal.lateCharge }
  );
  
  return NextResponse.json({
    success: true,
    message: 'Return item berhasil dicatat',
    data: deal
  });
}
```

---

## 📊 SUMMARY

| Aspek | Saat Ini | Seharusnya | Status |
|-------|----------|-----------|--------|
| Tracking startDate | ✅ Ada di transaction | ✅ Link ke deal | 🔴 Belum |
| Tracking duration | ✅ Ada (durationDays) | ✅ Ada | ✅ OK |
| Calculate return date | ❌ Tidak | ✅ Harus ada | 🔴 Belum |
| Actual return date | ❌ Tidak | ✅ Harus track | 🔴 Belum |
| Return status | ❌ Tidak | ✅ pending/returned/late | 🔴 Belum |
| Late charge calculation | ❌ Tidak | ✅ Harus ada | 🔴 Belum |
| Reminder notification | ❌ Tidak | ✅ Harus ada | 🔴 Belum |
| Return UI | ❌ Tidak | ✅ Return modal | 🔴 Belum |

---

## 🎯 NEXT STEPS

1. **Update data schema** di `deals.json` dengan borrowing fields
2. **Implement `/api/returns` endpoint** untuk handle return submission
3. **Update UI** untuk add return functionality
4. **Create notification system** untuk reminder
5. **Implement late charge logic** di invoice system

Saya siap membantu implementasi masing-masing step!
