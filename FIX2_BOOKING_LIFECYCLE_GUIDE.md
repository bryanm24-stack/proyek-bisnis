# 🔧 FIX #2: BOOKING LIFECYCLE - IMPLEMENTATION GUIDE

**Status:** ✅ IMPLEMENTED  
**Date:** 6 Mei 2026  
**Priority:** 🔴 CRITICAL  
**Impact:** HIGH (Prevents double-booking, manages stock lifecycle)  

---

## 🎯 WHAT THIS FIX DOES

Implements proper booking state machine to track rental lifecycle and manage stock:

```
Payment Completed
    ↓
Booking Created (status = 'confirmed')
    ↓ [Customer pickup/receive]
Pickup Confirmed (status = 'active')
    ├─ 🔴 STOCK DECREMENTED HERE!
    ↓ [Customer returns item]
Return Requested (status = 'pending_return')
    ↓ [Vendor inspects & approves]
Return Confirmed (status = 'completed')
    └─ 🟢 STOCK INCREMENTED HERE!
```

---

## ✅ FILES MODIFIED/CREATED

### 1. Created: `src/app/api/bookings/pickup/route.js`
**Purpose:** Confirm customer pickup → decrement stock  
**Endpoint:** `POST /api/bookings/pickup`  
**Trigger:** When customer confirms they have item  
**Action:** Changes status `confirmed` → `active` + decrements stock

### 2. Created: `src/app/api/bookings/return-confirmed/route.js`
**Purpose:** Confirm vendor received return → increment stock  
**Endpoint:** `POST /api/bookings/return-confirmed`  
**Trigger:** When vendor confirms return is accepted  
**Action:** Changes status `pending_return` → `completed` + increments stock

### 3. Modified: `src/app/api/deals/route.js`
**Changes:** When deal is accepted (status='agreed'), create booking record  
**Purpose:** Initialize booking early, before payment  

### 4. Modified: `src/app/api/returns/route.js`
**Changes:** When return is inspected (PUT), update booking status to 'pending_return'  
**Purpose:** Sync booking state with deal flow

---

## 📋 API REFERENCE

### Endpoint 1: POST /api/bookings/pickup

**Request:**
```javascript
POST /api/bookings/pickup
{
  serviceId: "service-123",       // Service being rented
  bookingId: "booking_1234567890", // Booking ID from deal
  transactionId: "txn-456",        // Optional: transaction reference
  action: "confirm_pickup"          // Current action (confirm_pickup)
}
```

**Response - Success:**
```javascript
{
  success: true,
  message: "Pickup confirmed. Stok berhasil dikurangi.",
  booking: {
    id: "booking_1234567890",
    status: "active",               // ✅ Changed from 'confirmed'
    quantity: 100,
    pickupConfirmedAt: "2026-05-06T10:30:00Z"
  },
  service: {
    id: "service-123",
    currentStock: 450,              // Was 550 before pickup
    bookedQuantity: 50,
    availableQuantity: 400          // Current - Booked
  }
}
```

**Response - Error:**
```javascript
{
  success: false,
  message: "Hanya booking dengan status 'confirmed' yang bisa pickup. Status saat ini: active"
}
```

---

### Endpoint 2: POST /api/bookings/return-confirmed

**Request:**
```javascript
POST /api/bookings/return-confirmed
{
  serviceId: "service-123",        // Service being returned
  bookingId: "booking_1234567890",  // Booking ID
  vendorId: "vendor-789"            // Vendor who approves return
}
```

**Response - Success:**
```javascript
{
  success: true,
  message: "Return confirmed. Stok berhasil ditambah kembali.",
  booking: {
    id: "booking_1234567890",
    status: "completed",            // ✅ Changed from 'pending_return'
    quantity: 100,
    returnConfirmedAt: "2026-05-06T15:45:00Z"
  },
  service: {
    id: "service-123",
    currentStock: 550,              // Back to original (was 450)
    bookedQuantity: 0,
    availableQuantity: 550          // All available again
  }
}
```

---

## 🔄 COMPLETE FLOW EXAMPLE

### Scenario: Kursi Modern rental (100 pcs, 5 days)

**Step 1: Deal Negotiation**
```
Customer & Vendor agree on deal
service.quantity = 500 (initial stock)
service.availableQuantity = 500
```

**Step 2: Deal Accepted (status='agreed')**
```
POST /api/deals { action: 'accept', ... }
→ Creates booking: { id: 'booking_12345', status: 'confirmed' }
→ service.quantity = 500 (NO CHANGE YET)
→ service.availableQuantity = 500
```

**Step 3: Payment**
```
POST /api/transactions { dealId, quantity: 100, ... }
→ Transaction created with itemId + verifiedItemPrice
→ service.quantity = 500 (NO CHANGE YET - IMPORTANT!)
→ service.availableQuantity = 500
```

**Step 4: Customer Confirms Pickup** ← FIX #2 STEP 1
```
POST /api/bookings/pickup {
  serviceId: 'service-kursi',
  bookingId: 'booking_12345',
  action: 'confirm_pickup'
}

RESULT:
✅ booking.status: 'confirmed' → 'active'
✅ service.quantity: 500 → 400 (DECREMENTED!)
✅ service.availableQuantity: 500 → 400
   └─ Available = Stock - Booked
   └─ 400 - 0 = 400
```

**Step 5: Customer Uses Item (5 days)**
```
Day 1-5: Customer has item
service.quantity = 400 (unchanged during rental)
service.availableQuantity = 400
booking.status = 'active' (item in use)
```

**Step 6: Customer Returns Item**
```
PUT /api/returns {
  dealId,
  vendorId,
  damageStatus: 'none'
}

RESULT:
✅ booking.status: 'active' → 'pending_return' (waiting inspection)
✅ service.quantity = 400 (NO CHANGE YET)
✅ service.availableQuantity = 400
   └─ Still counts as booked (not returned yet)
```

**Step 7: Vendor Confirms Return** ← FIX #2 STEP 2
```
POST /api/bookings/return-confirmed {
  serviceId: 'service-kursi',
  bookingId: 'booking_12345',
  vendorId: 'vendor-123'
}

RESULT:
✅ booking.status: 'pending_return' → 'completed'
✅ service.quantity: 400 → 500 (INCREMENTED!)
✅ service.availableQuantity: 500 → 500
   └─ Now available for next rental
```

---

## 🧮 STOCK CALCULATION LOGIC

### Key Formula:
```javascript
availableQuantity = currentStock - bookedQuantity

Where:
  currentStock = sum of all item.stok (for barang) or service.quantity (for jasa)
  bookedQuantity = sum of all bookings with status:
    - 'confirmed' (payment done, waiting pickup)
    - 'active' (customer has item)
    - 'pending_return' (returned, waiting inspection)
  
  (Completed/cancelled bookings don't count as booked)
```

### Example:
```javascript
// Initial state
service.items = [
  { id: 'item-1', stok: 500 }
]
service.bookings = [] // None yet
currentStock = 500
bookedQuantity = 0
availableQuantity = 500 - 0 = 500 ✓ All available

// After first booking created
service.bookings = [
  { id: 'booking_1', status: 'confirmed', quantity: 100 }
]
currentStock = 500 (unchanged - stock hasn't left)
bookedQuantity = 100 (reserved for this booking)
availableQuantity = 500 - 100 = 400 (only 400 truly available)

// After customer picks up
service.items[0].stok = 400 (DECREMENTED)
service.bookings[0].status = 'active'
currentStock = 400 (actual stock)
bookedQuantity = 100 (still reserved)
availableQuantity = 400 - 100 = 300 ✓ Correct!

// After customer returns
service.items[0].stok = 500 (INCREMENTED)
service.bookings[0].status = 'completed'
currentStock = 500 (back to normal)
bookedQuantity = 0 (no longer reserved)
availableQuantity = 500 - 0 = 500 ✓ All available again
```

---

## 🔒 PREVENTS DOUBLE-BOOKING

### Before Fix #2 (❌ BROKEN):
```
Customer A: Books 100 pcs Kursi (Day 1-5) → service.quantity = 500
Customer B: Books 100 pcs Kursi (Day 3-7) → service.quantity = 500 ❌ SAME DATE!

Problem: No tracking of which items are currently rented!
Result: Double-booking possible! Both customers could get same items!
```

### After Fix #2 (✅ FIXED):
```
Customer A: Booking created (confirmed)
  → availableQuantity = 500 - 100 = 400

Customer B: Creates deal (confirmed)
  → availableQuantity = 500 - 100 - 100 = 300

System shows only 300 items available for overlapping dates
Multiple customers can't overbook same items!
```

---

## 📊 TESTING SCENARIOS

### Test Case 1: Basic Pickup → Decrement
```
Setup: Service with 500 items
1. Create booking (status='confirmed')
2. Call POST /api/bookings/pickup
3. Verify: status='active', stock=400, availableQty=400
```

### Test Case 2: Return → Increment
```
Setup: Active booking with stock decremented
1. Submit return (PUT /api/returns)
2. Verify: booking.status='pending_return'
3. Call POST /api/bookings/return-confirmed
4. Verify: status='completed', stock=500, availableQty=500
```

### Test Case 3: Multi-booking availability
```
Setup: 500 items total
1. Booking A confirmed (qty=100)
   → availableQty = 400
2. Booking B confirmed (qty=150)
   → availableQty = 250
3. Booking A picked up (status=active)
   → stock=400, availableQty = 400 - 150 = 250 ✓
4. Booking B returned (completed)
   → stock=500, availableQty = 400 ✓
```

### Test Case 4: Different service types
```
For "barang" (goods):
- Stock decremented from item.stok array
- Distributed among items

For "jasa" (services):
- Stock decremented from service.quantity
- No item array to manage
```

---

## ⚙️ INTEGRATION WITH EXISTING FLOW

### How it connects to Fix #1:
```
Fix #1 (Item-based Pricing):
- Customer pays for specific item
- Gets itemId, itemPrice, verifiedItemPrice

Fix #2 (Booking Lifecycle):
- After payment, booking.status = 'confirmed'
- itemId is used to reference which item in booking
- Stock management now works correctly
```

### How it connects to Fix #3 (Future):
```
Fix #2 creates booking records
Fix #3 will:
- Create fresh deal each rental cycle
- Reset dates properly
- Reference same booking record
```

### How it connects to Fix #4 (Future):
```
Fix #2 decrements/increments actual stock
Fix #4 will:
- Recalculate availableQuantity in real-time
- Handle overlapping bookings
- Show accurate availability calendar
```

---

## 🛠️ DEPLOYMENT CHECKLIST

- [x] Created POST /api/bookings/pickup endpoint
- [x] Created POST /api/bookings/return-confirmed endpoint
- [x] Modified deals endpoint to create bookings
- [x] Modified returns endpoint to sync booking status
- [ ] Test all 4 scenarios above
- [ ] Verify stock calculations in multiple cases
- [ ] Check error handling
- [ ] Test with both barang and jasa types
- [ ] Verify availableQuantity updates correctly
- [ ] Test concurrency (multiple bookings simultaneously)

---

## 🚀 READY FOR SERVER

Server status: **✅ RUNNING**

To test in running server:
```bash
# Start dev server if not running
npm run dev

# Test pickup endpoint
curl -X POST http://localhost:3000/api/bookings/pickup \
  -H "Content-Type: application/json" \
  -d '{ "serviceId": "...", "bookingId": "...", "action": "confirm_pickup" }'

# Test return confirmation endpoint
curl -X POST http://localhost:3000/api/bookings/return-confirmed \
  -H "Content-Type: application/json" \
  -d '{ "serviceId": "...", "bookingId": "...", "vendorId": "..." }'
```

---

## 📝 SUMMARY

Fix #2 implements critical booking lifecycle management:

✅ Stock decrements when customer picks up item  
✅ Stock increments when vendor confirms return  
✅ Prevents double-booking with proper tracking  
✅ Maintains audit trail of booking state changes  
✅ Supports both "barang" and "jasa" service types  

**Next Steps:**
1. Test Fix #2 with provided scenarios
2. Verify stock calculations in services.json
3. Proceed to Fix #3 (Fresh Deal Per Cycle)
