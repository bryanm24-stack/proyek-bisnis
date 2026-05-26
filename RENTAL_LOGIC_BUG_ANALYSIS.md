# 🔍 ANALISIS BUG LOGIKA SEWA KURSI & RENTAL CYCLE

**Tanggal Analisis:** 6 Mei 2026  
**Status:** 🔴 CRITICAL - Ada banyak masalah logika

## ✅ CURRENT STATUS NOTE

Dokumen ini menyimpan analisis awal dari masalah rental flow. Beberapa poin sudah punya dokumen implementasi/fix terpisah, jadi status aktifnya perlu dicek ke dokumen fix yang lebih baru.

---

## 📋 RINGKASAN MASALAH

Saat ini sistem sewa memiliki **3 masalah besar**:
1. ❌ **Stock tidak benar-benar berkurang** saat item disewa
2. ❌ **Stock tidak ditambah kembali** saat item dikembalikan
3. ❌ **Harga tidak selalu match** antara yang dipilih customer dengan pembayaran
4. ❌ **Rental cycle tidak bersih** - bisa bermasalah saat sewa lagi

---

## 🐛 BUG #1: STOCK TIDAK BERKURANG SAAT SEWA

### Masalahnya

Saat customer membayar untuk sewa kursi:
```
Payment Success → Create Transaction ✅
                ↓
            Create Booking ✅
                ↓
        UPDATE availableQuantity ✅
                ↓
        TAPI: service.quantity TIDAK BERUBAH ❌
        TAPI: items.stok TIDAK BERKURANG ❌
```

**Current Implementation** (`src/app/api/availability/reserve/route.js` lines 40-70):
```javascript
// availableQuantity hanya dicalculate dari bookings, tidak memodifikasi actual stock
service.availableQuantity = Math.max(0, totalQuantity - bookedQuantity);

// Tapi totalQuantity tetap = service.quantity (TIDAK BERKURANG)
// Dan items.stok TIDAK DIUBAH
```

### Contoh Skenario (SALAH)

```
Initial State:
- Kursi Modern: stok = 40
- Kursi Klasik: stok = 30
- Total: 70
- Available: 70

Customer 1 orders 50 kursi untuk 5-10 May:
- Booking created ✅
- Available = 70 - 50 = 20 ✅ (BENAR untuk UI)

Customer 2 orders 15 kursi untuk 7-12 May (overlap!):
- Available = 70 - 50 - 15 = 5 ✅ (TERLIHAT BENAR)
- TAPI sebenarnya:
  - Total stok MASIH 70 ❌
  - Saat Customer 1 menyelesaikan rental:
    - Booking di-cancel
    - Available langsung = 70 lagi ❌ (SALAH! Harusnya 15 saja untuk Customer 2)

RESULT: Double-booking! 🚨
```

### Masalah Lainnya

**Saat return item:**
- `available` tidak auto-update karena hanya depend pada booking status
- Tidak ada actual decrement/increment dari `service.quantity` atau `items.stok`
- Jika booking di-complete, stok langsung "available" tanpa "actually dikembalikan"

---

## 🐛 BUG #2: HARGA TIDAK MATCH DENGAN ITEM YANG DIPILIH

### Masalahnya

Di payment page, customer memilih item dengan harga specific, tetapi saat payment:
```
Payment Page:
- Pilih "Kursi Modern" (Rp 50.000/pcs)
- Quantity: 100 pcs
- Expected: Rp 5.000.000
           ↓
Payment Processing (`src/app/transaction/payment/page.js`):
- basePrice = deal?.totalPrice (mungkin dari sebelumnya!) ❌
- Bisa jadi Rp 75.000 karena dari deal sebelumnya
                ↓
RESULT: Customer bayar salah! 🚨
```

**Kode yang Problematic** (lines 276-279):
```javascript
const serviceFee = 25000;
const basePrice = deal?.totalPrice || 0;  // ❌ DARI DEAL, BUKAN ITEM!
const totalPrice = basePrice * quantity * durationDays;
const discountedSubtotal = Math.max(0, totalPrice - discountAmount);
```

### Issue Detail

1. **`deal?.totalPrice` dari mana?**
   - Tidak jelas dari kode
   - Tidak ada field `totalPrice` di deal saat dibuat
   - Bisa jadi error / undefined

2. **Item dengan multiple varian tidak ter-handle:**
   ```json
   {
     "items": [
       { "id": "kursi-1", "hargaSesi": 50000 },
       { "id": "kursi-2", "hargaSesi": 75000 },
       { "id": "meja-1", "hargaSesi": 150000 }
     ]
   }
   ```
   - Customer mesti bisa pilih ITEM SPECIFIC
   - Harga HARUS dari item yang dipilih, bukan service default
   - Saat ini tidak ada yang nge-handle ini!

3. **No item ID in transaction:**
   ```javascript
   // Transaction tidak track item ID yang dipilih!
   const newTransaction = {
     serviceId: ...,
     quantity: ...,
     // ❌ itemId: null (MISSING!)
     // ❌ selectedItemPrice: null (MISSING!)
     basePrice: ..., // dari mana?
   }
   ```

### Contoh Skenario (SALAH)

```
Vendor set Kursi Modern = Rp 50.000/pcs

Customer 1:
- Pilih 100 pcs Kursi Modern
- Expected: 100 × Rp 50.000 = Rp 5.000.000
- Payment: basePrice dari deal = Rp 75.000 (salah!)
- BAYAR: 100 × Rp 75.000 = Rp 7.500.000 ❌ OVERPAY!

Customer 2:
- Pilih 50 pcs Kursi Klasik (Rp 75.000/pcs)
- Expected: 50 × Rp 75.000 = Rp 3.750.000
- Payment: basePrice dari deal = Rp 50.000 (salah!)
- BAYAR: 50 × Rp 50.000 = Rp 2.500.000 ❌ UNDERPAY! Vendor loss!

RESULT: Harga tidak consistent 🚨
```

---

## 🐛 BUG #3: RENTAL CYCLE TIDAK BERSIH

### Masalahnya

Saat customer sewa lagi dari vendor yang sama:

**Cycle 1 (Pertama):**
```
1. Deal created
2. Payment successful
3. Item disewa
4. Item dikembalikan
5. Rating given
6. Status: "completed"
```

**Cycle 2 (Kedua) - MASALAH:**
```
1. Chat dibuka lagi
2. New deal dibuat? ATAU reuse old deal?
   - Jika reuse: status masih "completed", bisa broken!
   - Jika create new: ok, but chat history might be confusing

3. Payment baru, tapi:
   - Booking old deal masih exist! ❌
   - Stock logic referring ke old deal
   - Bisa conflict!

4. Return flow:
   - API check deal.borrowDate (dari cycle 1 lama!)
   - expectedReturnDate bisa salah
   - Late charge calculation bisa break! 🚨
```

### Kode yang Problematic

**File: `src/app/api/deals/route.js` (lines 290-310)**
```javascript
// Saat vendor terima deal:
if (existingDeal.status !== 'pending' && existingDeal.status !== 'agreed' 
    && existingDeal.status !== 'cancelled' && existingDeal.status !== 'completed') {
  return NextResponse.json({ success: false, message: `Deal dengan status ${existingDeal.status} tidak bisa diproses` });
}

existingDeal.vendorAccepted = true;
existingDeal.status = 'agreed';
existingDeal.agreedAt = new Date().toISOString();

// ❌ TAPI borrowDate/expectedReturnDate tidak di-reset!
// ❌ Saat payment baru, borrowDate masih dari deal lama!
```

**File: `src/app/api/returns/route.js` (lines 120-130)**
```javascript
// Saat customer submit return:
const expectedReturn = new Date(deal.expectedReturnDate);  // ❌ dari cycle lama!
const actualReturn = new Date(actualReturnDate);
const daysLate = Math.max(0, Math.ceil((actualReturn - expectedReturn) / (1000 * 60 * 60 * 24)));

// Jika deal di-reuse dari cycle lama:
// expectedReturnDate masih referensi ke rental sebelumnya!
// RESULT: Calculation SALAH! 🚨
```

### Skenario (SALAH)

```
CYCLE 1:
- borrowDate: 1 Mei
- expectedReturnDate: 6 Mei  
- Return on: 6 Mei → On time, no late charge ✅

CYCLE 2 (REUSE SAME DEAL):
- New borrowDate: 10 Mei (dari payment baru)
- But deal.expectedReturnDate MASIH 6 Mei! ❌
- New rental: 10-15 Mei
- Return on: 15 Mei
- System calc: 15 Mei > 6 Mei → 9 HARI TELAT! 🚨
- Late charge: Rp XXX
- RESULT: Customer kena charge untuk hal yang tidak mereka lakukan! 🚨🚨
```

---

## 🐛 BUG #4: BOOKING TIDAK BENAR-BENAR "RELEASE" STOCK

### Masalahnya

**Saat booking di-cancel atau di-complete:**
```javascript
// Available hanya based on booking status, bukan actual stock decrement
service.availableQuantity = totalQuantity - bookedQuantity;
// dimana bookedQuantity = sum(bookings where status !== 'cancelled' && !== 'completed')
```

**Problem:**
- Jika booking di-complete → langsung counted sebagai "available"
- TAPI item belum dikembalikan fisik!
- Jika ada multiple overlapping bookings:
  - Booking A: 1-5 May (complete)
  - Booking B: 2-6 May (active)
  - Booking C: 3-7 May (pending)
  
  ```
  Available = Total - (B + C) = 70 - (50 + 30) = -10?? ❌
  Atau dipaksa Max(0, ...) = 0 ✅ (BENAR KEBETULAN)
  
  Tapi LOGIC-nya masih SALAH karena:
  - Booking A "complete" tapi item belum kembali!
  - Bisa conflict dengan Booking D yang mau sewa 1-5 May lagi
  ```

---

## ✅ SOLUSI YANG DIBUTUHKAN

### Solusi #1: Stock Management yang Proper

**File yang perlu update:**
- `src/app/api/availability/reserve/route.js`
- `src/app/api/returns/route.js`
- `services.json` struktur

**Logic:**
```
Saat Payment Success:
  - Create booking (status: 'confirmed')
  - Set booking.startDate & endDate
  - DON'T decrement service.quantity yet (wait for pickup)

Saat Customer Pickup (bisa via API call):
  - booking.status = 'in_transit'
  - NOW decrement: service.quantity -= quantity
  - OR: items[selected].stok -= quantity

Saat Rental Active (customer punya item):
  - booking.status = 'active'
  - Stock TETAP berkurang

Saat Customer Return:
  - booking.status = 'returned' (or 'pending_return')
  - Calculate late charge
  - Wait for vendor inspection

Saat Vendor Accept Return:
  - booking.status = 'completed'
  - NOW increment: service.quantity += quantity
  - OR: items[selected].stok += quantity
  - Return refund to customer
```

### Solusi #2: Item-based Pricing

**Structure:**
```json
{
  "serviceId": "...",
  "transaction": {
    "itemId": "item-kursi-modern",  // ← ADD THIS
    "itemPrice": 50000,              // ← ADD THIS (verified dari service)
    "quantity": 100,
    "basePrice": 50000,
    "totalPrice": 50000 * 100,
    "...": "..."
  }
}
```

**Logic:**
```javascript
// When calculating price:
1. Get service by serviceId
2. Find item by itemId
3. Use item.hargaSesi atau item.stok BUKAN service.totalPrice
4. Validate itemPrice == item.hargaSesi (no fraud)
5. Save both: itemId dan itemPrice untuk audit trail
```

### Solusi #3: Clean Deal Lifecycle

**Status Flow:**
```
NEW:
  pending → agreed → (payment) → active → (return) → reviewing → completed

NEXT CYCLE:
  For new rental:
    - Create NEW deal (don't reuse)
    - Link old deal as "previousDealId" for history
    - All dates/prices/bookings are fresh
    - No mixing of cycles!
```

**Code Update:**
```javascript
// In deals route:
if (action === 'accept' && existingDeal.status === 'completed') {
  // Create FRESH deal, don't reuse
  const newDeal = { ...existingDeal, id: Date.now().toString(), ... };
  // Reset all rental fields
  newDeal.borrowDate = null;
  newDeal.expectedReturnDate = null;
  newDeal.actualReturnDate = null;
  deals.push(newDeal);
  return new deal; // DON'T reuse old one
}
```

### Solusi #4: Booking Status Proper Lifecycle

**States:**
```
pending 
  ↓
confirmed (payment successful, waiting pickup)
  ↓
in_transit (item sedang dikirim or di-pickup customer)
  ↓
active (customer sedang punya item)
  ↓
pending_return (customer submit return request)
  ↓
returned (vendor accepted return, inspection done)
  ↓
completed (refund processed, all done)

CANCELLATION:
pending/confirmed → cancelled (refund full)
```

**Stock Impact:**
```
pending/confirmed → NO stock impact (still available)
in_transit/active → Stock BERKURANG (reserved)
pending_return/returned → Stock still BERKURANG (item not yet available for next rental)
completed → Stock BERTAMBAH (item back in system)
cancelled → Revert to previous state
```

---

## 📊 IMPACT ASSESSMENT

| Bug | Severity | Impact | Frequency |
|-----|----------|--------|-----------|
| Stock tidak berkurang | 🔴 CRITICAL | Double-booking possible | SETIAP SEWA |
| Harga tidak match | 🔴 CRITICAL | Wrong payment amount | BILA ADA VARIAN |
| Cycle tidak bersih | 🟠 HIGH | Incorrect calculations | SAAT SEWA ULANG |
| Booking tidak release | 🟠 HIGH | Stock permanently stuck | SAAT BOOKING CANCEL |

---

## 🎯 NEXT STEPS (Priority)

1. ✅ **Analisis selesai** → File dokumentasi created
2. ⏳ **Priority 1**: Implement proper stock management
   - Update booking lifecycle states
   - Add pickup/return confirmation APIs
   - Modify availability calculation
   
3. ⏳ **Priority 2**: Fix item-based pricing
   - Add itemId & itemPrice to transactions
   - Validate price against service item
   - Update payment calculation
   
4. ⏳ **Priority 3**: Clean deal lifecycle
   - Create new deal instead of reuse
   - Reset all rental fields
   - Update cycle handling
   
5. ⏳ **Priority 4**: Add proper booking state management
   - Implement state machine for bookings
   - Calculate stock impact per state
   - Add pickup/return API endpoints

---

## 📝 Checklist untuk Fix

- [ ] Add `itemId` & `itemPrice` ke transactions.json
- [ ] Add `pickup_status` field ke bookings
- [ ] Create `/api/bookings/pickup` endpoint
- [ ] Create `/api/bookings/confirm-return` endpoint  
- [ ] Update stock calculation logic
- [ ] Create deal cloning logic (don't reuse)
- [ ] Update return flow to validate rental dates
- [ ] Add validation untuk item price vs transaction price
- [ ] Test scenarios: double-booking, price mismatch, cycle 2+
- [ ] Update documentation

---

## 🔗 Related Files

- `src/app/api/availability/reserve/route.js` - Booking creation
- `src/app/api/returns/route.js` - Return processing
- `src/app/api/transactions/route.js` - Transaction/payment
- `src/app/api/deals/route.js` - Deal management
- `src/app/transaction/payment/page.js` - Payment UI
- `services.json` - Service data with bookings
- `transactions.json` - Transaction records
- `deals.json` - Deal records
