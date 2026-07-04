# 📊 VISUAL FLOW - Rental Logic Problems & Solutions

---

## FLOW 1: CURRENT STOCK MANAGEMENT (SALAH)

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT FLOW (BROKEN)                     │
└─────────────────────────────────────────────────────────────┘

Initial State:
service.quantity = 100
service.availableQuantity = 100
service.bookings = []

        ↓

CUSTOMER 1 PAYMENT SUCCESS:
  POST /api/transactions
    ├─ quantity: 50
    ├─ startDate: 2026-05-01
    └─ endDate: 2026-05-06
        ↓
  POST /api/availability/reserve
    ├─ Create booking {id: B1, qty: 50, status: 'confirmed'}
    ├─ Calculate: bookedQty = 50
    ├─ availableQuantity = 100 - 50 = 50 ✅ (BENAR)
    └─ service.quantity = 100 ❌ (TIDAK BERKURANG!)

State after Customer 1:
service.quantity = 100 ❌ MASIH 100!
service.bookings = [B1(50)]
availableQuantity = 50

        ↓

CUSTOMER 2 CHECKS AVAILABILITY (2-7 May):
  POST /api/availability/validate
    ├─ Detect overlap: B1(1-6) overlap dengan request(2-7)
    ├─ bookedQty for this period = 50
    ├─ available = 100 - 50 = 50 ✅ (TERLIHAT BENAR)
    └─ Shows: "50 items available" ✅
    
Customer 2 thinks: "OK, ada 50 item tersedia, ambil 30"

        ↓

CUSTOMER 2 PAYMENT SUCCESS:
  POST /api/availability/reserve
    ├─ Create booking {id: B2, qty: 30, status: 'confirmed'}
    ├─ Calculate: bookedQty = 50 + 30 = 80
    ├─ availableQuantity = 100 - 80 = 20 ✅
    └─ service.quantity = 100 ❌ MASIH 100!

State after Customer 2:
service.quantity = 100 ❌ MASIH 100!
service.bookings = [B1(50, 1-6), B2(30, 2-7)]
availableQuantity = 20

        ↓

CUSTOMER 1 RETURN (On time, no damage):
  PUT /api/returns
    ├─ damageStatus = 'none'
    ├─ daysLate = 0
    └─ lateCharge = 0
        ↓
  UPDATE booking B1: status = 'completed'
    ├─ Calculate: bookedQty = 30 (only B2 remains)
    ├─ availableQuantity = 100 - 30 = 70 ✅ (TERLIHAT BENAR)
    └─ service.quantity = 100 ❌ MASIH 100!

⚠️ PROBLEM: Item dari Customer 1 belum PHYSICALLY returned!
   Tapi system sudah mark available = 70 untuk next customer!

        ↓

CUSTOMER 3 SEES AVAILABLE (2-8 May, overlap dengan B2):
  Shows: "70 items available" ✅ (TAPI SALAH!)
  
  Reality:
  ├─ Total stok = 100 (MASIH)
  ├─ Booked definitely = B2 (30)
  ├─ Physical in warehouse = ??? (Unknown!)
  ├─ Customer 1's item = sedang dalam pengiriman? atau rusak?
  └─ RESULT: Bisa double-booking! 🚨

┌────────────────────────────────────────────┐
│ ROOT CAUSE:                                 │
│ - service.quantity tidak berubah            │
│ - Hanya availableQuantity yang "virtual"    │
│ - No actual stock movement/tracking         │
│ - availableQuantity based on booking status │
│ - Completed booking ≠ Item fully returned   │
└────────────────────────────────────────────┘
```

---

## FLOW 1B: WHAT SHOULD HAPPEN (CORRECT)

```
┌─────────────────────────────────────────────────────────────┐
│               CORRECT FLOW (FIXED)                          │
└─────────────────────────────────────────────────────────────┘

Initial State:
service.quantity = 100
availableQuantity = 100
bookings = []

        ↓

CUSTOMER 1 PAYMENT SUCCESS:
  POST /api/transactions → Payment OK
    ↓
  POST /api/availability/reserve
    ├─ Create booking {id: B1, qty: 50, status: 'confirmed'}
    └─ Available = 100 - 50 = 50 ✅

State: service.quantity = 100, available = 50, B1 = confirmed

        ↓

CUSTOMER 1 PICKUP/DELIVERY CONFIRMED:
  POST /api/bookings/pickup-confirmed
    ├─ booking.status = 'in_transit' → 'active'
    ├─ Decrement: service.quantity = 100 - 50 = 50 ✅ (BENAR!)
    └─ Calculate: availableQuantity = 50 - 0 = 50 ✅

State: service.quantity = 50, available = 50, B1 = active

        ↓

CUSTOMER 2 CHECKS AVAILABILITY (2-7 May):
  POST /api/availability/validate
    ├─ Total = 50 (actual physical quantity)
    ├─ Booked for period = 0 (B1 doesn't overlap perfectly)
    └─ Available = 50 ✅ (ACTUAL)

Actually, let me recalculate overlap:
B1: 1-6 May
Request: 2-7 May
Overlap: YES (days 2-6)

So:
├─ Total = 50
├─ Booked in period = 50 (B1)
└─ Available = 0 ❌ (CORRECTLY shows unavailable)

Customer 2: "Ah, 0 available for 2-7 May. I'll try 7-12 May instead"

        ↓

CUSTOMER 2 CHECKS AVAILABILITY (7-12 May):
  POST /api/availability/validate
    ├─ Total = 50
    ├─ Booked 7-12 = 0 (B1 only 1-6)
    └─ Available = 50 ✅ (CORRECT)

Customer 2 PAYMENT for 7-12 May:
  POST /api/availability/reserve
    ├─ Create booking {id: B2, qty: 30, status: 'confirmed'}
    ├─ Reserved = 30 (pending pickup)
    └─ availableQuantity = 50 - 30 = 20 ✅

State: service.quantity = 50, bookings = [B1(active), B2(confirmed)], available = 20

        ↓

CUSTOMER 1 RETURN (On 5 May):
  POST /api/returns
    ├─ damageStatus = 'none'
    ├─ daysLate = 0
    └─ booking.status = 'pending_return' (wait vendor inspection)

State: bookings = [B1(pending_return), B2(confirmed)], service.qty = 50 (STILL RESERVED)

        ↓

VENDOR ACCEPTS CUSTOMER 1 RETURN (inspect on 5 May):
  PUT /api/returns (vendor inspect)
    ├─ damageStatus = 'approved'
    ├─ booking.status = 'completed'
    └─ NOW: Increment service.quantity = 50 + 50 = 100 ✅
        (Item is back and ready for rental)

State: service.quantity = 100, available = 100 - 30 (B2 active) = 70 ✅

        ↓

CUSTOMER 2 PICKUP CONFIRMED:
  POST /api/bookings/pickup-confirmed (B2)
    ├─ booking.status = 'active'
    ├─ Decrement: service.quantity = 100 - 30 = 70 ✅
    └─ availableQuantity = 70 ✅

┌────────────────────────────────────────────┐
│ KEY DIFFERENCES:                            │
│ ✅ service.quantity ACTUALLY changes        │
│ ✅ Pickup = stock reserved                  │
│ ✅ Return accepted = stock released         │
│ ✅ No double-booking possible              │
│ ✅ Proper "holding" of physical stock       │
└────────────────────────────────────────────┘
```

---

## FLOW 2: PRICING PROBLEM (CURRENT)

```
┌─────────────────────────────────────────────────────────────┐
│              CURRENT PRICING FLOW (BROKEN)                  │
└─────────────────────────────────────────────────────────────┘

SERVICE SETUP:
┌─────────────────────────────────────────┐
│ Kursi & Meja Serbaguna                  │
│ type: 'barang'                          │
│ items: [                                │
│   {id: 'kursi-modern', hargaSesi: 50k}, │ ← Rp 50.000/pcs
│   {id: 'kursi-klasik', hargaSesi: 75k}, │ ← Rp 75.000/pcs
│   {id: 'meja-panjang', hargaSesi: 150k} │ ← Rp 150.000/pcs
│ ]                                       │
└─────────────────────────────────────────┘

        ↓

CUSTOMER CHOOSES ITEM IN UI:
"Saya mau 100 Kursi Modern @ Rp 50.000/pcs"
Expected total: 100 × Rp 50.000 = Rp 5.000.000

        ↓

CUSTOMER GOES TO PAYMENT PAGE:
(`src/app/transaction/payment/page.js`)
  
  const basePrice = deal?.totalPrice || 0;
  ❌ PROBLEM 1: deal?.totalPrice is UNDEFINED/WRONG!
     (No field di deal untuk harga per item)

  const totalPrice = basePrice * quantity * durationDays;
  ❌ PROBLEM 2: Calculation based on WRONG basePrice!

  Result: 
  ├─ If basePrice = undefined → totalPrice = 0 × 100 × 1 = 0 ❌
  └─ If basePrice = random value → totalPrice = ??? ❌

        ↓

ACTUAL PAYMENT:
Customer receives bill:
├─ Scenario A: Rp 0 (undefined basePrice)
│  → Payment fails or customer doesn't pay! 🚨
│
└─ Scenario B: Rp 7.500.000 (basePrice is Kursi Klasik 75k)
   → Customer OVERPAID by Rp 2.500.000! 🚨

┌────────────────────────────────────────────┐
│ ROOT CAUSE:                                 │
│ 1. No itemId tracking                       │
│ 2. No itemPrice verification                │
│ 3. basePrice source unclear                 │
│ 4. Multi-item services not properly handled │
└────────────────────────────────────────────┘
```

---

## FLOW 2B: PRICING SOLUTION (CORRECT)

```
┌─────────────────────────────────────────────────────────────┐
│              CORRECT PRICING FLOW (FIXED)                   │
└─────────────────────────────────────────────────────────────┘

SERVICE SETUP (same):
┌─────────────────────────────────────────┐
│ Kursi & Meja Serbaguna                  │
│ items: [                                │
│   {id: 'kursi-modern', hargaSesi: 50k}, │
│   {id: 'kursi-klasik', hargaSesi: 75k}, │
│   {id: 'meja-panjang', hargaSesi: 150k} │
│ ]                                       │
└─────────────────────────────────────────┘

        ↓

CUSTOMER CHOOSES ITEM IN UI:
"Pilih: kursi-modern"
{
  "serviceId": "service-123",
  "itemId": "kursi-modern",        ← ADD THIS
  "itemPrice": 50000,              ← ADD THIS
  "quantity": 100,
  "durationDays": 1
}

        ↓

VERIFICATION AT PAYMENT ENDPOINT:
GET /api/services/:serviceId/items/:itemId
  ├─ Fetch service & find item
  ├─ Verify: item.hargaSesi = 50000 ✅
  ├─ Verify: item.stok >= 100 ✅
  └─ Return: verified price = Rp 50.000

        ↓

PAYMENT CALCULATION (src/app/transaction/payment/page.js):

  const basePrice = verifiedItemPrice;     // ✅ 50.000
  const quantity = 100;
  const durationDays = 1;
  
  const totalPrice = basePrice * quantity * durationDays;
  // = 50.000 × 100 × 1 = 5.000.000 ✅ CORRECT!

  const transaction = {
    serviceId: 'service-123',
    itemId: 'kursi-modern',        ← ✅ TRACK ITEM
    itemPrice: 50000,              ← ✅ TRACK ITEM PRICE
    quantity: 100,
    basePrice: 50000,
    totalPrice: 5000000,
    ...
  }

        ↓

VERIFICATION AT TRANSACTION API:
POST /api/transactions
  ├─ Verify itemId exists in service
  ├─ Verify itemPrice == item.hargaSesi ✅
  ├─ Verify totalPrice == itemPrice × qty × duration ✅
  ├─ Create booking dengan confirmed itemId
  └─ Save transaction dengan audit trail

        ↓

PAYMENT PROCESSED:
Customer bill: Rp 5.000.000 ✅ EXACT!
  
✅ Correct price
✅ Correct item tracked
✅ Audit trail complete
✅ No fraud possible (prices verified at each step)
```

---

## FLOW 3: RENTAL CYCLE (CURRENT - PROBLEM)

```
┌─────────────────────────────────────────────────────────────┐
│            RENTAL CYCLE 2+ (CURRENT - BROKEN)               │
└─────────────────────────────────────────────────────────────┘

CYCLE 1:
┌──────────────────────────────┐
│ Deal ID: deal-001            │
│ Status: completed            │
│ borrowDate: 2026-05-01       │
│ expectedReturnDate: 2026-05-06
│ Rating: completed ✅         │
└──────────────────────────────┘

        ↓

CUSTOMER WANTS TO RENT AGAIN:
(Same vendor, same service)

Opens chat again...
Vendor sees: "Chat masih ada dari rental sebelumnya"

Current Logic:
- Reuse SAME chat
- Reuse SAME deal object? ❌
- OR create NEW deal? ❌ (Not clear!)

        ↓

ASSUME: REUSE SAME DEAL (This is the bug)

Deal object BEFORE cycle 2:
{
  id: "deal-001",
  status: "completed",
  borrowDate: "2026-05-01",         ← DARI CYCLE 1
  expectedReturnDate: "2026-05-06",  ← DARI CYCLE 1
  actualReturnDate: "2026-05-06",
  ratingCompleted: true
}

        ↓

Customer makes offer for CYCLE 2:
New rental: 2026-05-10 to 2026-05-15

But system REUSES deal-001:
{
  id: "deal-001",           ← SAME!
  status: "agreed",         ← UPDATED
  borrowDate: "2026-05-01", ← STILL DARI CYCLE 1! ❌
  expectedReturnDate: "2026-05-06", ← STILL CYCLE 1! ❌
}

        ↓

PAYMENT FOR CYCLE 2:
POST /api/transactions (durationDays: 5, startDate: 2026-05-10)
  ├─ Create transaction
  ├─ Create booking (10-15 May)
  └─ But deal.borrowDate masih "2026-05-01"! ❌

Transaction:
{
  borrowDate: "2026-05-10",
  expectedReturnDate: "2026-05-15"
}

Deal:
{
  borrowDate: "2026-05-01",     ← MISMATCH!
  expectedReturnDate: "2026-05-06" ← MISMATCH!
}

        ↓

CUSTOMER RETURNS ITEM on 2026-05-15:
POST /api/returns
  ├─ deal.expectedReturnDate = "2026-05-06" (dari cycle 1!)
  ├─ actualReturnDate = "2026-05-15"
  ├─ Calculate daysLate:
  │  daysLate = CEIL((2026-05-15 - 2026-05-06) / 1day)
  │  daysLate = 9 HARI TELAT! 🚨
  │
  ├─ lateCharge = 9 × (dailyRate) = 9 × (basePrice/5) = ??? 🚨
  │
  └─ Customer charged for "late" yang tidak mereka sebabkan! 🚨

Expected: No late charge (returned on time: 15 May)
Actual: 9 day late charge penalty! 🚨🚨

┌────────────────────────────────────────────┐
│ ROOT CAUSE:                                 │
│ Deal object REUSED instead of FRESH        │
│ borrowDate/expectedReturnDate not reset    │
│ Mixing cycle 1 & cycle 2 rental dates      │
└────────────────────────────────────────────┘
```

---

## FLOW 3B: RENTAL CYCLE SOLUTION (CORRECT)

```
┌─────────────────────────────────────────────────────────────┐
│            RENTAL CYCLE 2+ (FIXED - CORRECT)                │
└─────────────────────────────────────────────────────────────┘

CYCLE 1:
┌──────────────────────────────┐
│ Deal ID: deal-001            │
│ Status: completed            │
│ borrowDate: 2026-05-01       │
│ expectedReturnDate: 2026-05-06
│ Rating: completed ✅         │
└──────────────────────────────┘

        ↓

CUSTOMER WANTS TO RENT AGAIN:
"Saya mau sewa lagi"

        ↓

NEW DEAL CREATED (Don't Reuse!):
{
  id: "deal-002",              ← FRESH ID!
  chatId: "chat-001",          ← SAME CHAT
  status: "pending",           ← FRESH STATUS
  borrowDate: null,            ← EMPTY!
  expectedReturnDate: null,    ← EMPTY!
  actualReturnDate: null,
  previousDealId: "deal-001",  ← Reference to history
  
  // All rental fields are CLEAN:
  daysLate: 0,
  lateCharge: 0,
  returnStatus: "pending",
  ratingCompleted: false
}

        ↓

Payment for CYCLE 2:
POST /api/transactions (startDate: 2026-05-10, durationDays: 5)
  ├─ dealId = "deal-002"
  ├─ Update transaction:
  │  borrowDate: "2026-05-10"
  │  expectedReturnDate: "2026-05-15"
  │
  └─ Update DEAL-002:
     borrowDate: "2026-05-10"
     expectedReturnDate: "2026-05-15"

deal-002 state after payment:
{
  id: "deal-002",
  status: "agreed",
  borrowDate: "2026-05-10",      ← CORRECT FOR CYCLE 2!
  expectedReturnDate: "2026-05-15", ← CORRECT!
  previousDealId: "deal-001"
}

        ↓

CUSTOMER RETURNS on 2026-05-15:
POST /api/returns (dealId: "deal-002")
  ├─ deal.expectedReturnDate = "2026-05-15" (FROM CYCLE 2)
  ├─ actualReturnDate = "2026-05-15"
  ├─ Calculate daysLate:
  │  daysLate = CEIL((2026-05-15 - 2026-05-15) / 1day)
  │  daysLate = 0 ✅ ON TIME!
  │
  └─ lateCharge = 0 ✅ NO CHARGE!

Result: ✅ CORRECT - On time, no penalties

        ↓

CYCLE 3: (If customer wants to rent again)
NEW DEAL CREATED:
{
  id: "deal-003",
  previousDealId: "deal-002",    ← Link to cycle 2
  ...
}

┌────────────────────────────────────────────┐
│ KEY IMPROVEMENTS:                           │
│ ✅ Each cycle has separate deal            │
│ ✅ No date mixing                          │
│ ✅ Clean rental calculation per cycle      │
│ ✅ audit trail (previousDealId)            │
│ ✅ Chat stays same, deals are separate     │
└────────────────────────────────────────────┘
```

---

## SUMMARY: What Needs To Be Fixed

| # | Issue | Current | Should Be | Impact |
|---|-------|---------|-----------|--------|
| 1 | Stock decrement | ❌ Only availableQty | ✅ service.quantity | Double-booking |
| 2 | Stock return | ❌ Only booking status | ✅ Actual increment | Stock stuck |
| 3 | Item price | ❌ Unclear source | ✅ From item.hargaSesi | Wrong payment |
| 4 | Deal reuse | ❌ Dates not reset | ✅ Create fresh deal | Late charge bug |
| 5 | Booking lifecycle | ❌ Only confirmed/completed | ✅ in_transit/active/returned | No stock impact |

---

## 🎯 Recommended Implementation Order

1. **First**: Fix item-based pricing (Easy, high impact)
2. **Second**: Add booking lifecycle states (Medium, critical for stock)
3. **Third**: Implement pickup/return APIs (Medium, needed for stock management)
4. **Fourth**: Fix deal reuse (Easy, impacts cycle 2+)
5. **Fifth**: Update stock calculation (Complex, ties everything together)
