# 📊 FIELD COMPARISON - BORROWING LOGIC

## Current vs Required Fields

```
DEALS.JSON STRUCTURE
================================================================================

EXISTING FIELDS (Date Timeline):
├── createdAt ✅              | Kapan deal dibuat
├── agreedAt ✅               | Kapan deal disetujui kedua belah pihak  
├── completedAt ✅            | Kapan deal di-mark complete (UNCLEAR IF RETURNED)
└── (No rental tracking)

MISSING FIELDS (Borrowing Timeline):
├── borrowDate ❌             | Kapan item benar-benar dipinjam (pickup/delivery)
├── expectedReturnDate ❌    | Kapan harus dikembalikan (calculated)
├── actualReturnDate ❌      | Kapan benar-benar dikembalikan
├── returnStatus ❌          | Status: pending|returned|late|missing|damaged
├── returnDeadline ❌        | Reminder deadline (1 hari sebelum expectedReturnDate)
├── daysLate ❌              | Berapa hari keterlambatan
├── lateCharge ❌            | Biaya keterlambatan
├── returnCondition ❌       | Kondisi saat dikembalikan
├── returnNotes ❌           | Catatan return (misal: scratch, penyok, dll)
├── returnPhoto ❌           | Foto kondisi saat dikembalikan
└── lastReminderSent ❌      | Tracking reminder sudah dikirim kapan

================================================================================
```

## Example: Current Deal vs Proposed Deal

### ❌ CURRENT (Incomplete):
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
  
  // Transaction data tersimpan terpisah - tidak ter-link!
  // startDate ada di transactions.json
  // durationDays ada di transactions.json
  // Tapi deal.json tidak tahu item sudah dikembalikan atau tidak!
  
  "originalPrice": 50000,
  "finalPrice": 40000
}
```

**Problem:**
- ❌ Tidak tahu kapan item dipinjam (borrowDate)
- ❌ Tidak tahu kapan harus dikembalikan (expectedReturnDate)
- ❌ Tidak tahu apakah sudah dikembalikan (actualReturnDate)
- ❌ Tidak tahu status pengembalian
- ❌ Tidak tahu ada keterlambatan atau tidak

---

### ✅ PROPOSED (Complete):
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
  
  // BORROWING DATES (NEW):
  "borrowDate": "2026-04-30T14:00:00.000Z",
  "expectedReturnDate": "2026-05-04T14:00:00.000Z",
  "actualReturnDate": "2026-05-04T13:30:00.000Z",
  "returnDeadline": "2026-05-03T14:00:00.000Z",
  
  // RETURN TRACKING (NEW):
  "returnStatus": "returned",
  "daysLate": 0,
  "lateCharge": 0,
  "returnCondition": "good",
  "returnNotes": "Item dalam kondisi sangat baik",
  "returnPhoto": "base64...",
  "lastReminderSent": "2026-05-03T06:00:00.000Z",
  
  "completedAt": "2026-04-29T20:25:46.277Z",
  "originalPrice": 50000,
  "finalPrice": 40000
}
```

**Benefits:**
- ✅ Jelas kapan item dipinjam
- ✅ Tahu kapan deadline pengembalian
- ✅ Jelas kapan benar-benar dikembalikan
- ✅ Bisa track keterlambatan otomatis
- ✅ Bisa calculate late charge
- ✅ Ada audit trail lengkap

---

## Field Details

| Field | Type | Required | Example | Deskripsi |
|-------|------|----------|---------|-----------|
| `borrowDate` | ISO String | Yes | "2026-04-30T14:00:00.000Z" | Waktu item benar-benar dipinjam (saat handover) |
| `expectedReturnDate` | ISO String | Yes | "2026-05-04T14:00:00.000Z" | borrowDate + durationDays (auto-calculated) |
| `actualReturnDate` | ISO String | No | "2026-05-04T13:30:00.000Z" | Kapan customer benar-benar kembalikan item |
| `returnDeadline` | ISO String | Yes | "2026-05-03T14:00:00.000Z" | expectedReturnDate - 1 hari (untuk reminder) |
| `returnStatus` | Enum | Yes | "returned" | pending/returned/late/missing/damaged |
| `daysLate` | Number | Yes | 0 | Kalkulasi: (actualReturnDate - expectedReturnDate) / (1 hari) |
| `lateCharge` | Number | Yes | 0 | Biaya keterlambatan = daysLate × (dailyRate × 10%) |
| `returnCondition` | Enum | No | "good" | good/minor-damage/major-damage/missing |
| `returnNotes` | String | No | "Ada goresan di sisi kanan" | Catatan detail kondisi |
| `returnPhoto` | Base64/URL | No | "data:image/jpeg;..." | Foto kondisi saat dikembalikan |
| `lastReminderSent` | ISO String | No | "2026-05-03T06:00:00.000Z" | Tracking reminder sudah dikirim |

---

## Calculation Logic

### Expected Return Date
```
expectedReturnDate = borrowDate + (durationDays × 24 jam)

Contoh:
- borrowDate: 30-Apr-2026 14:00
- durationDays: 4
- expectedReturnDate: 04-May-2026 14:00
```

### Days Late
```
daysLate = MAX(0, CEIL((actualReturnDate - expectedReturnDate) / 86400000))

Contoh 1 (On Time):
- expectedReturnDate: 04-May-2026 14:00
- actualReturnDate: 04-May-2026 13:30
- daysLate: 0

Contoh 2 (1 Hari Telat):
- expectedReturnDate: 04-May-2026 14:00
- actualReturnDate: 05-May-2026 15:00
- daysLate: 1

Contoh 3 (0.5 Hari Telat = 1 Hari):
- expectedReturnDate: 04-May-2026 14:00
- actualReturnDate: 04-May-2026 23:00
- daysLate: 1 (CEIL digunakan, jadi 1)
```

### Late Charge
```
Asumsi: 10% dari daily rate untuk setiap hari keterlambatan

lateCharge = daysLate × (finalPrice / durationDays × 0.10)

Contoh:
- finalPrice: Rp 40.000
- durationDays: 4
- daysLate: 2
- dailyRate: 40.000 / 4 = Rp 10.000
- lateCharge: 2 × (10.000 × 0.10) = Rp 2.000
```

---

## Transaction vs Deal Linking

### Current Problem:
```
transactions.json                deals.json
┌─────────────────────────┐    ┌──────────────────────┐
│ Transaction            │    │ Deal                │
│ - startDate: ✅        │    │ - borrowDate: ❌    │
│ - durationDays: ✅     │    │ - actualReturnDate: │
└─────────────────────────┘    │   ❌               │
        ↓                      │ - returnStatus: ❌ │
   Transaction               │                      │
   punya data rental         │ Tidak ada linkage!  │
        ↓                      │                      │
   Deal tidak tahu!          │ Sulit tracking      │
                              │ return process      │
                              └──────────────────────┘
```

### Proposed Solution:
```
transactions.json              deals.json
┌─────────────────────────┐   ┌──────────────────────┐
│ Transaction            │   │ Deal                │
│ - id: TRX-xxx          │   │ - id: deal-xxx      │
│ - dealId: deal-xxx ────┼──→│ - borrowDate: ✅    │
│ - startDate: ✅        │   │ - expectedReturnDate│
│ - durationDays: ✅     │   │   : ✅              │
└─────────────────────────┘   │ - actualReturnDate: │
        ↓                      │   ✅               │
   Transaction punya        │ - returnStatus: ✅ │
   detail pembayaran         │ - daysLate: ✅     │
        ↓                      │ - lateCharge: ✅   │
   Deal punya rental status │                      │
        ↓                      └──────────────────────┘
   Complete tracking!         Lengkap & linked!
```

---

## Implementation Checklist

### Phase 1: Data Structure
- [ ] Update `deals.json` schema dengan borrowing fields
- [ ] Migration: add fields ke existing deals
- [ ] Update type definitions/JSDoc

### Phase 2: API Endpoints
- [ ] Create `POST /api/returns` endpoint
- [ ] Update `POST /api/deals` untuk set borrowDate
- [ ] Update `POST /api/transactions` untuk link ke deal

### Phase 3: Business Logic
- [ ] Auto-calculate expectedReturnDate
- [ ] Auto-calculate daysLate saat return
- [ ] Auto-calculate lateCharge
- [ ] Validate return data

### Phase 4: UI Components
- [ ] Add return modal di ongoing orders
- [ ] Add return status display
- [ ] Add late charge warning

### Phase 5: Notifications
- [ ] Send reminder 3 hari sebelum deadline
- [ ] Send alert 1 hari sebelum deadline
- [ ] Send notification saat return diterima

---

## Related Files to Update

```
src/app/
├── api/
│   ├── deals/route.js              ← Update accept/return logic
│   ├── deals/all/route.js          ← Add return fields
│   ├── returns/route.js            ← CREATE NEW
│   ├── transactions/route.js       ← Link to deal
│   └── notifications/route.js      ← Add reminder types
├── customer/
│   ├── ongoing/page.js             ← Add return modal
│   └── orders/page.js              ← Show return status
├── vendor/
│   ├── invoices/page.js            ← Show return + late charge
│   └── orders/page.js              ← Show return status
└── components/
    └── ReturnItemModal.js          ← CREATE NEW

Root:
├── deals.json                      ← Update schema
└── BORROWING_LOGIC_ANALYSIS.md    ← This file
```

---

## Next Steps

Ready untuk implementasi? Prioritas:
1. **Phase 1** (Data Structure) - Paling urgent
2. **Phase 2** (API Endpoints) - Backend support
3. **Phase 3** (Business Logic) - Calculations
4. **Phase 4** (UI) - User-facing features
5. **Phase 5** (Notifications) - Polish

Sampaikan jika ingin saya implementasi salah satu phase!
