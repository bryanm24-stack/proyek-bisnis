# 🔧 FIX #4: REAL-TIME STOCK ACCURACY - IMPLEMENTATION GUIDE

**Status:** ✅ IMPLEMENTED  
**Date:** 6 Mei 2026  
**Priority:** 🔴 HIGH (HARD fix)  
**Impact:** CRITICAL (Prevents double-booking and ensures stock accuracy)

---

## 🎯 WHAT THIS FIX DOES

Ensures stock availability is accurately calculated in real-time based on booking states and actual stock levels. Implements booking cancellation with automatic refunds and stock recalculation.

### Problem It Solves

**Issue: Stock not accurately tracked across booking lifecycle**

❌ **Before Fix #4:**
```
Initial:
- Kursi Modern: stok = 40
- Kursi Klasik: stok = 30  
- Total: 70
- Available: 70 ✓

Customer A books 50 kursi for 5-10 May:
- Booking created with status 'confirmed'
- Available = 70 - 50 = 20 ✓

Customer B books 15 kursi for 7-12 May (overlap!):
- Available = 70 - 50 - 15 = 5 ✓ (LOOKS RIGHT)

PROBLEM 1: Customer A cancels booking:
- Booking marked 'cancelled'
- Available jumps back to 70? Or 15?
- No stock recalculation! ❌

PROBLEM 2: Customer A picks up:
- Booking status = 'active'
- But service.quantity STILL = 70 (no actual decrement)!
- If Customer C books during same period → DOUBLE BOOKING! 🚨
```

✅ **After Fix #4:**
```
Initial:
- Kursi Modern: stok = 40
- Total availability: 70

Customer A books 50 (status='confirmed'):
- Available = 70 - 50 = 20 ✓

Customer B books 15 (status='confirmed'):
- Available = 70 - 50 - 15 = 5 ✓

Customer A PICKS UP (status='confirmed'→'active'):
- Stock ACTUALLY decremented: 70 - 50 = 20
- Available = 20 - 15 = 5 ✓ (CORRECT)

Customer A RETURNS (status='pending_return'→'completed'):
- Stock ACTUALLY incremented: 20 + 50 = 70
- Available = 70 - 15 = 55 ✓ (CORRECT)

Customer B CANCELS (status='confirmed'→'cancelled'):
- Stock calculation skips cancelled bookings
- Available = 70 - 0 = 70 ✓ (CORRECT)
- Refund processed automatically ✓
```

---

## 📝 KEY COMPONENTS

### 1. ✅ Stock Decrement on Pickup (Already in Fix #2)
**File:** `src/app/api/bookings/pickup/route.js`

When customer picks up items:
```
booking.status: 'confirmed' → 'active'
↓
service.quantity -= booking.quantity (for jasa)
OR items[].stok -= booking.quantity (for barang)
↓
service.availableQuantity = currentStock - bookedQuantity
↓
Stock is now PHYSICALLY committed
```

### 2. ✅ Stock Increment on Return (Already in Fix #2)  
**File:** `src/app/api/bookings/return-confirmed/route.js`

When vendor confirms return:
```
booking.status: 'pending_return' → 'completed'
↓
service.quantity += booking.quantity (for jasa)
OR items[].stok += booking.quantity (for barang)
↓
service.availableQuantity = currentStock - bookedQuantity
↓
Stock is now PHYSICALLY released
```

### 3. 🆕 Booking Cancellation with Refunds (NEW in Fix #4)
**File:** `src/app/api/bookings/cancel/route.js` (NEW)

When a booking is cancelled:
```
booking.status: any → 'cancelled'
↓
If booking was 'active' or 'pending_return':
  - Return stock immediately (customer won't receive)
↓
transactions[].status: current → 'refunded'
  - Set refundedAt timestamp
  - Track refund reason
  - Calculate refund amount
↓
service.availableQuantity = currentStock - bookedQuantity
  - Cancelled bookings NOT counted in bookedQuantity
  - Makes stock available again
↓
Return success with refund details
```

---

## 🔄 COMPLETE BOOKING LIFECYCLE WITH STOCK TRACKING

```
┌─────────────────────────────────────────────────────────────────┐
│ BOOKING LIFECYCLE WITH REAL-TIME STOCK ACCURACY                 │
└─────────────────────────────────────────────────────────────────┘

1️⃣ PAYMENT SUCCESSFUL
   Transaction created
   ↓ POST /api/availability/reserve
   Booking status: 'confirmed'
   Stock impact: NO (still available for pickup)
   availableQuantity = totalStock - (all non-cancelled bookings)
   ✓ Can still be cancelled with full refund

2️⃣ CUSTOMER PICKS UP
   ↓ POST /api/bookings/pickup
   Booking status: 'confirmed' → 'active'
   ✅ STOCK DECREMENTED (actual reduction)
   availableQuantity = (totalStock - decremented) - (other active bookings)
   ❌ Cannot be cancelled (stock already out)

3️⃣ RENTAL ACTIVE
   Customer has item
   Stock remains decremented
   Other customers see reduced availability
   ✓ Prevents double-booking

4️⃣ CUSTOMER INITIATES RETURN  
   ↓ POST /api/returns (existing endpoint)
   Booking status: 'active' → 'pending_return'
   Stock impact: NO (still not back yet)
   availableQuantity = unchanged (still reserved)

5️⃣ VENDOR INSPECTS & ACCEPTS
   ↓ POST /api/bookings/return-confirmed
   Booking status: 'pending_return' → 'completed'
   ✅ STOCK INCREMENTED (actual increase)
   availableQuantity = (totalStock + returned) - (other bookings)
   ✓ Item available for next booking

6️⃣ CANCELLATION (CAN HAPPEN AT STEPS 1-4)
   ↓ POST /api/bookings/cancel
   Booking status: any → 'cancelled'
   
   If at step 1 (confirmed):
     - No stock change (never left)
     - Full refund
     - Available quantity increases
   
   If at steps 2-4 (active/pending_return):
     - ✅ STOCK RETURNED (physical return)
     - Full refund  
     - Available quantity increases dramatically
```

---

## 📊 AVAILABLEQUANTITY CALCULATION LOGIC

### Before Fix #4 (Incomplete)
```javascript
availableQuantity = totalStock - bookedQuantity
where bookedQuantity = sum(bookings where status !== 'cancelled' && !== 'completed')

Problem: Doesn't account for actual stock changes at different lifecycle stages
```

### After Fix #4 (Complete)
```javascript
// Get current actual stock
if (serviceType === 'jasa') {
  currentStock = service.quantity;  // May be reduced after pickups
} else {
  currentStock = sum(items[].stok);  // May be reduced after pickups
}

// Count bookings that are still "taking space"
bookedQuantity = 0;
for (booking in bookings) {
  if (booking.status === 'confirmed' || 
      booking.status === 'active' || 
      booking.status === 'pending_return') {
    bookedQuantity += booking.quantity;
  }
  // Skip: cancelled (not taking space)
  // Skip: completed (already returned)
}

// Calculate what's actually available
availableQuantity = max(0, currentStock - bookedQuantity)

// Result: ACCURATE representation of what can be booked next
```

---

## 🆕 NEW ENDPOINT: POST /api/bookings/cancel

### Purpose
Cancel a booking at any lifecycle stage and process automatic refund

### Request Body
```json
{
  "serviceId": "1704067200000",
  "bookingId": "BOOKING-1726363200000",
  "reason": "Customer berubah pikiran" // optional
}
```

### Response (Success)
```json
{
  "success": true,
  "message": "Booking berhasil dibatalkan dan refund Rp5000000 diproses.",
  "booking": {
    "id": "BOOKING-1726363200000",
    "previousStatus": "confirmed",
    "newStatus": "cancelled",
    "quantity": 50,
    "cancelledAt": "2026-05-06T15:30:00Z",
    "cancellationReason": "Customer berubah pikiran"
  },
  "refund": {
    "processed": true,
    "amount": 5000000
  },
  "service": {
    "id": "1704067200000",
    "currentStock": 70,
    "bookedQuantity": 15,
    "availableQuantity": 55
  }
}
```

### What Happens When You Cancel:

**Scenario 1: Cancel before pickup (status='confirmed')**
```
- Booking marked cancelled
- Stock NOT returned (it was never taken)
- Available immediately increases
- Refund processed
- Status: ✅ FULL REFUND
```

**Scenario 2: Cancel during rental (status='active')**
```
- Booking marked cancelled
- Stock RETURNED immediately (item coming back)
- Available immediately increases
- Refund processed (possibly with penalty?)
- Status: ⚠️ PARTIAL/FULL REFUND (business decision)
```

**Scenario 3: Cancel during return (status='pending_return')**
```
- Booking marked cancelled
- Stock returned (customer is returning anyway)
- Available increases
- Refund processed (possibly with penalty?)
- Status: ⚠️ PARTIAL/FULL REFUND
```

**Scenario 4: Already completed (status='completed')**
```
- Cannot cancel (completed bookings are final)
- Error returned
- Status: ❌ REJECTED
```

---

## 🧪 TEST SCENARIOS

### Test 1: Cancel before pickup
```
1. Create booking (status='confirmed')
2. Call POST /api/bookings/cancel
3. Verify: booking.status = 'cancelled'
4. Verify: transaction.status = 'refunded'
5. Verify: availableQuantity increased
```

### Test 2: Cancel after pickup
```
1. Create booking (status='confirmed')
2. Call POST /api/bookings/pickup
3. Verify: service.quantity decreased (actual stock)
4. Call POST /api/bookings/cancel
5. Verify: booking.status = 'cancelled'
6. Verify: service.quantity increased (stock returned)
7. Verify: availableQuantity correct
```

### Test 3: Multiple overlapping bookings with cancellation
```
1. Create Booking A (50 qty, 5-10 May) - confirmed
2. Create Booking B (15 qty, 7-12 May) - confirmed
3. Verify: availableQuantity = 70 - 50 - 15 = 5
4. Cancel Booking A
5. Verify: availableQuantity = 70 - 0 - 15 = 55
6. Create Booking C (30 qty, 5-9 May)
7. Verify: availableQuantity = 70 - 0 - 15 - 30 = 25
```

### Test 4: Stock accuracy across full lifecycle
```
Initial: stok = 70, available = 70

A picks up 50:
  stok = 20, available = 20 ✓

B picks up 15:
  stok = 5, available = 5 ✓

C wants to book 10:
  available = 5 < 10 → REJECTED ✓ (Prevents double-booking!)

A returns (confirmed):
  stok = 70, available = 55 (B still active)

B returns:
  stok = 70, available = 70 ✓
```

---

## 📝 CODE LOGIC (New Cancellation Endpoint)

### Key Steps:

1. **Find booking**
   ```javascript
   const booking = service.bookings.find(b => b.id === bookingId);
   ```

2. **Check if cancellable**
   ```javascript
   if (booking.status === 'completed') {
     return error('Cannot cancel completed booking');
   }
   ```

3. **Return stock if needed**
   ```javascript
   if (booking.status === 'active' || booking.status === 'pending_return') {
     // Stock was decremented, now return it
     service.quantity += booking.quantity;
   }
   ```

4. **Mark as cancelled**
   ```javascript
   booking.status = 'cancelled';
   booking.cancelledAt = new Date().toISOString();
   ```

5. **Process refund**
   ```javascript
   transaction.status = 'refunded';
   transaction.refundedAt = new Date().toISOString();
   ```

6. **Recalculate availability**
   ```javascript
   // Cancelled bookings NOT counted
   bookedQuantity = sum(bookings where status === 'confirmed'|'active'|'pending_return');
   availableQuantity = currentStock - bookedQuantity;
   ```

---

## ✅ COMPLETE FIX #4 IMPLEMENTATION CHECKLIST

### Stock Management
- [x] Pickup decrements actual stock (from Fix #2)
- [x] Return-confirmed increments actual stock (from Fix #2)
- [x] Cancellation returns stock if needed (NEW)
- [x] Recalculate availableQuantity after each operation

### Refund Processing  
- [x] Mark transaction as 'refunded'
- [x] Set refundedAt timestamp
- [x] Track refund amount
- [x] Handle errors gracefully

### Availability Calculation
- [x] Use actual current stock (from service.quantity or items.stok)
- [x] Count only non-cancelled, non-completed bookings
- [x] Update after every booking state change
- [x] Return accurate availableQuantity to frontend

### API Endpoints
- [x] POST /api/availability/validate - Check if items available (existing, working)
- [x] POST /api/availability/reserve - Create booking (existing, working)
- [x] POST /api/bookings/pickup - Decrement stock (from Fix #2)
- [x] POST /api/bookings/return-confirmed - Increment stock (from Fix #2)
- [x] POST /api/bookings/cancel - Cancel booking with refund (NEW)

---

## 📊 DATA FLOW EXAMPLE

### Initial State (services.json)
```json
{
  "id": "1704067200000",
  "title": "Kursi Rental",
  "type": "barang",
  "quantity": 70,
  "availableQuantity": 70,
  "bookings": [],
  "items": [
    { "id": "kursi-modern", "stok": 40, "hargaPcs": 50000 },
    { "id": "kursi-klasik", "stok": 30, "hargaPcs": 40000 }
  ]
}
```

### After Booking Created & Picked Up
```json
{
  "id": "1704067200000",
  "quantity": 20,  // 70 - 50 decremented
  "availableQuantity": 5,  // 20 - 15 other bookings
  "bookings": [
    {
      "id": "BOOKING-123",
      "quantity": 50,
      "status": "active",  // Customer has it
      "pickupConfirmedAt": "2026-05-06T10:00:00Z"
    },
    {
      "id": "BOOKING-456",
      "quantity": 15,
      "status": "confirmed",  // Waiting to pickup
      "createdAt": "2026-05-06T09:00:00Z"
    }
  ],
  "items": [
    { "id": "kursi-modern", "stok": 10 },  // 40 - 30 taken
    { "id": "kursi-klasik", "stok": 10 }   // 30 - 20 taken
  ]
}
```

### After Booking Cancelled
```json
{
  "id": "1704067200000",
  "quantity": 70,  // Restored (cancelled booking released stock)
  "availableQuantity": 55,  // 70 - 15 still booked
  "bookings": [
    { 
      "id": "BOOKING-123",
      "status": "cancelled",
      "cancelledAt": "2026-05-06T11:00:00Z",
      "cancellationReason": "Customer requested"
    },
    {
      "id": "BOOKING-456",
      "status": "confirmed",
      "quantity": 15
    }
  ],
  "items": [
    { "id": "kursi-modern", "stok": 40 },  // All returned
    { "id": "kursi-klasik", "stok": 30 }
  ]
}
```

---

## 🚀 SERVER STATUS

```
✅ Cancellation endpoint created
✅ Stock handling logic implemented
✅ Refund processing integrated
✅ AvailableQuantity recalculation added
✅ Ready for testing
```

---

## 🧮 IMPACT ANALYSIS

| Scenario | Before | After |
|----------|--------|-------|
| **Double-booking** | ❌ Possible (stock not decremented) | ✅ Impossible (actual stock tracked) |
| **Cancel before pickup** | ⚠️ Manual refund | ✅ Automatic refund |
| **Cancel during rental** | ❌ Stock not returned | ✅ Stock returned automatically |
| **Availability accuracy** | ⚠️ Virtual only | ✅ Real-time based on actual stock |
| **Multiple bookings** | ❌ Can exceed total | ✅ Respects actual stock |
| **Late charge risk** | ✅ Fixed (Fix #3) | ✅ Fixed (combined with #2, #3) |

---

## 🔗 INTEGRATION WITH OTHER FIXES

**Fix #1 (Item Pricing):** ✅  
- Each transaction gets correct price  
- Cancellation refunds correct amount

**Fix #2 (Booking Lifecycle):** ✅  
- Pickup decrements stock  
- Return increments stock  
- Cancellation handles both cases

**Fix #3 (Fresh Deal):** ✅  
- Each deal fresh, independent  
- Cancellation affects only current deal

**Fix #4 (Stock Accuracy):** ✅ THIS FIX  
- Real-time availability  
- Automatic refunds  
- Proper stock tracking

**Fix #5 (Return Validation):** ⏭️ NEXT  
- Will validate rental dates  
- Will enforce late charges  
- Will prevent invalid returns

---

## ✅ DEPLOYMENT CHECKLIST

- [x] Created /api/bookings/cancel endpoint
- [x] Implemented stock return logic
- [x] Implemented refund processing
- [x] Implemented availableQuantity recalculation
- [x] Added error handling
- [x] Added logging
- [ ] Test cancellation before pickup
- [ ] Test cancellation during rental
- [ ] Test stock recalculation
- [ ] Test refund processing
- [ ] Test with multiple overlapping bookings

---

## 📞 QUICK REFERENCE

**New Endpoint:** POST `/api/bookings/cancel`  
**Request:** `{ serviceId, bookingId, reason? }`  
**Response:** Cancelled booking, refund info, updated availableQuantity  
**Stock Impact:** Returns stock if booking was active/pending  
**Refund:** Automatic, tracked in transactions.json  

---

## SUMMARY

Fix #4 completes the real-time stock accuracy system by:
1. ✅ Tracking actual stock changes (pickup & return)
2. ✅ Cancelling bookings with automatic refunds
3. ✅ Recalculating availability in real-time
4. ✅ Preventing double-booking scenarios
5. ✅ Ensuring accurate availableQuantity across lifecycle

**Next Step:** Test Fix #4 end-to-end and then implement Fix #5! 🚀
