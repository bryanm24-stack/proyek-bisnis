# 🔧 RENTAL LOGIC - IMPLEMENTATION ROADMAP

**Last Updated:** 6 Mei 2026  
**Priority Level:** 🔴 CRITICAL  
**Complexity:** MEDIUM-HIGH

---

## 📋 QUICK REFERENCE

| Fix | Severity | Effort | Impact | Recommended Order |
|-----|----------|--------|--------|-------------------|
| Item-based pricing | 🔴 CRITICAL | 🟢 EASY | HIGH | 1️⃣ FIRST |
| Booking lifecycle | 🔴 CRITICAL | 🟠 MEDIUM | HIGH | 2️⃣ SECOND |
| Deal cycle fix | 🟠 HIGH | 🟢 EASY | MEDIUM | 3️⃣ THIRD |
| Stock actual decrement | 🔴 CRITICAL | 🔴 HARD | HIGH | 4️⃣ FOURTH |
| Return flow validation | 🟠 HIGH | 🟠 MEDIUM | MEDIUM | 5️⃣ FIFTH |

---

## ✅ FIX #1: ITEM-BASED PRICING (Priority 1 - EASY)

### Target: Ensure payment price matches the selected item price

### Files to Modify:
1. **`src/app/transaction/payment/page.js`** - Calculate price correctly
2. **`src/app/api/transactions/route.js`** - Store itemId & verify price
3. **`deals.json` schema** - Add itemId field (optional, for reference)

### Implementation Steps:

#### Step 1a: Modify Payment Page (Calculate from item)
**File:** `src/app/transaction/payment/page.js` (lines ~276-279)

**Current:**
```javascript
const serviceFee = 25000;
const basePrice = deal?.totalPrice || 0;  // ❌ WRONG SOURCE
const totalPrice = basePrice * quantity * durationDays;
```

**Change to:**
```javascript
// 1. Get selected item from API
const [selectedItem, setSelectedItem] = useState(null);

useEffect(() => {
  // Fetch service & find item price
  const fetchItemPrice = async () => {
    if (!deal?.serviceId) return;
    
    try {
      const response = await fetch(`/api/services/${deal.serviceId}`);
      const service = await response.json();
      
      // For now, use first item if no itemId selected
      // Later: Customer should SELECT which item variant
      const item = service.items?.[0];
      if (item) {
        setSelectedItem({
          id: item.id,
          price: item.hargaSesi || item.price || 0
        });
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    }
  };
  
  fetchItemPrice();
}, [deal?.serviceId]);

const serviceFee = 25000;
const basePrice = selectedItem?.price || 0;  // ✅ FROM ITEM!
const totalPrice = basePrice * quantity * durationDays;
```

**Add UI for item selection:**
```javascript
// In the Detail Pesanan section, add:
{selectedItem && (
  <div style={{ marginBottom: '20px', padding: '12px', background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
    <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Item yang dipilih</label>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color: '#1f2937' }}>Kursi Modern Minimalis</span>
      <span style={{ fontSize: '14px', fontWeight: '700', color: '#2563eb' }}>Rp {selectedItem.price?.toLocaleString('id-ID')}/pcs</span>
    </div>
  </div>
)}
```

#### Step 1b: Modify Transaction API (Store item ID & verify)
**File:** `src/app/api/transactions/route.js`

**Add to POST handler:**
```javascript
// After payment success, before creating transaction:

// NEW: Get service to verify item price
const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
const service = servicesData.find(s => String(s.id) === String(body.serviceId));

if (!service) {
  return Response.json({
    success: false,
    error: 'Service tidak ditemukan',
    message: 'Service tidak ditemukan'
  }, { status: 404 });
}

// NEW: If itemId provided, verify the price
let verifiedItemPrice = body.basePrice || 0;
let itemId = body.itemId || null;

if (body.itemId && service.items) {
  const item = service.items.find(i => String(i.id) === String(body.itemId));
  if (item) {
    verifiedItemPrice = item.hargaSesi || item.price || body.basePrice;
    itemId = item.id;
    
    // Verify: payment basePrice should match item price
    if (Math.abs(body.basePrice - verifiedItemPrice) > 1000) { // Allow 1000 tolerance
      console.warn(`Price mismatch for item ${itemId}: expected ${verifiedItemPrice}, got ${body.basePrice}`);
      // Log but don't block - user might have applied discount
    }
  }
}

// NEW: Add itemId & verifiedItemPrice to transaction
const newTransaction = {
  ...body,
  identityVerification,
  createdAt: new Date().toISOString(),
  // NEW FIELDS:
  itemId: itemId,              // ✅ Track which item
  verifiedItemPrice: verifiedItemPrice,  // ✅ Verified price
  // Remove generic basePrice reference
};
```

**Update transaction schema storage:**
```javascript
// Ensure these fields are saved:
const transactionToSave = {
  id: newTransaction.id,
  dealId: newTransaction.dealId,
  serviceId: newTransaction.serviceId,
  itemId: newTransaction.itemId,        // ✅ NEW
  itemPrice: newTransaction.basePrice,   // ✅ Store original itemPrice
  verifiedItemPrice: verifiedItemPrice,  // ✅ NEW
  quantity: newTransaction.quantity,
  basePrice: newTransaction.basePrice,
  totalPrice: newTransaction.totalPrice,
  durationDays: newTransaction.durationDays,
  startDate: newTransaction.startDate,
  endDate: newTransaction.endDate,
  // ... other fields
};
```

### Testing for Fix #1:

```bash
# Test 1: Single item service
Service: Kursi Modern (items: [Kursi Modern @ 50k])
Customer order: 100 pcs
Expected payment: 100 × 50.000 = 5.000.000
Actual: Should show 5.000.000 ✅

# Test 2: Multi-item service  
Service: Kursi & Meja (items: [Kursi 50k, Meja 150k])
Customer order: Kursi 100 pcs
Expected payment: 100 × 50.000 = 5.000.000
Actual: Should show 5.000.000 ✅
(Not 100 × 150.000 = 15.000.000)

# Test 3: With discount
Customer order: 100 pcs @ 50k = 5.000.000
Apply promo: -20% = -1.000.000
Expected final: 4.000.000
Actual: Should show 4.000.000 ✅
```

---

## ✅ FIX #2: BOOKING LIFECYCLE STATES (Priority 2 - MEDIUM)

### Target: Add proper state machine for bookings (pending → active → completed)

### Files to Modify:
1. **`services.json`** - Update booking structure
2. **`src/app/api/availability/reserve/route.js`** - Initial booking creation
3. **Create:** `src/app/api/bookings/pickup/route.js` - Handle pickup confirmation
4. **Create:** `src/app/api/bookings/return-confirmed/route.js` - Handle vendor return confirmation
5. **`src/app/api/returns/route.js`** - Update to use new states

### New Booking States:

```
pending 
  ↓ (Belum pickup)
confirmed (Payment successful, waiting pickup/delivery)
  ↓ (Customer confirm pickup/delivery received)
in_transit (Item in transit)
  ↓ (Item delivered/pickup done)
active (Customer punya item, sedang pakai)
  ↓ (Customer submit return request)
pending_return (Waiting vendor inspection)
  ↓ (Vendor accepts return & item back)
returned (Return accepted, ready for next customer)
  ↓ (Rental completion, refund processed)
completed (All done, refund to customer)

ALTERNATIVE PATHS:
pending_return → inspection_failed → active (return rejected, continue rental)
confirmed/active → cancelled → (refund process)
```

### Implementation Step 2a: Create Booking Pickup API

**New File:** `src/app/api/bookings/pickup/route.js`

```javascript
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * POST /api/bookings/pickup
 * Confirm that customer has picked up or received item
 * Updates booking status: confirmed → in_transit → active
 * This triggers STOCK DECREMENT!
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, bookingId, transactionId, action = 'confirm_pickup' } = body;

    if (!serviceId || !bookingId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId dan bookingId diperlukan'
      }, { status: 400 });
    }

    const servicesPath = path.join(process.cwd(), 'services.json');
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    const services = JSON.parse(servicesData);

    // Find service
    const serviceIndex = services.findIndex(s => String(s.id) === String(serviceId));
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    const service = services[serviceIndex];

    // Find booking
    if (!service.bookings) service.bookings = [];
    const bookingIndex = service.bookings.findIndex(b => String(b.id) === String(bookingId));
    if (bookingIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Booking tidak ditemukan'
      }, { status: 404 });
    }

    const booking = service.bookings[bookingIndex];

    if (action === 'confirm_pickup') {
      // Validate booking is in "confirmed" state
      if (booking.status !== 'confirmed') {
        return NextResponse.json({
          success: false,
          message: `Hanya booking dengan status 'confirmed' yang bisa pickup. Status saat ini: ${booking.status}`
        }, { status: 400 });
      }

      // Update booking status
      booking.status = 'active';  // Item sekarang active (customer punya)
      booking.pickupConfirmedAt = new Date().toISOString();

      // ✅ NOW: DECREMENT ACTUAL STOCK!
      let totalQuantity = 0;
      const serviceType = service.type || 'barang';
      
      if (serviceType === 'jasa') {
        totalQuantity = Number(service.quantity) || 0;
      } else {
        totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
      }
      
      // Decrement service.quantity (for jasa) or sum of items
      if (serviceType === 'jasa') {
        service.quantity = Math.max(0, (service.quantity || 0) - booking.quantity);
      } else {
        // For barang, decrement from total items stok
        let remaining = booking.quantity;
        for (const item of service.items || []) {
          if (remaining <= 0) break;
          const decrement = Math.min(item.stok || 0, remaining);
          item.stok = (item.stok || 0) - decrement;
          remaining -= decrement;
        }
      }

      // Recalculate availableQuantity
      let bookedQuantity = 0;
      for (const b of service.bookings) {
        // Only count 'confirmed' or 'active', not 'completed' (already returned)
        if (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending_return') {
          bookedQuantity += b.quantity || 0;
        }
      }
      
      // availableQuantity = current stock - currently booked
      let currentStock = 0;
      if (serviceType === 'jasa') {
        currentStock = service.quantity;
      } else {
        currentStock = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
      }
      
      service.availableQuantity = Math.max(0, currentStock - bookedQuantity);

      // Save updated services
      await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));

      return NextResponse.json({
        success: true,
        message: 'Pickup confirmed. Stok berhasil dikurangi.',
        booking: {
          id: booking.id,
          status: booking.status,
          pickupConfirmedAt: booking.pickupConfirmedAt
        },
        service: {
          id: service.id,
          quantity: serviceType === 'jasa' ? service.quantity : totalQuantity,
          availableQuantity: service.availableQuantity,
          currentStock: currentStock
        }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: 'Action tidak dikenal'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in pickup endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}
```

### Implementation Step 2b: Create Return Confirmation API

**New File:** `src/app/api/bookings/return-confirmed/route.js`

```javascript
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * POST /api/bookings/return-confirmed
 * Called by vendor after return is approved
 * Updates booking status: pending_return → completed
 * This triggers STOCK INCREMENT!
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, bookingId, vendorId } = body;

    if (!serviceId || !bookingId || !vendorId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId, bookingId, dan vendorId diperlukan'
      }, { status: 400 });
    }

    const servicesPath = path.join(process.cwd(), 'services.json');
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    const services = JSON.parse(servicesData);

    // Find service
    const serviceIndex = services.findIndex(s => String(s.id) === String(serviceId));
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    const service = services[serviceIndex];

    // Find booking
    if (!service.bookings) service.bookings = [];
    const bookingIndex = service.bookings.findIndex(b => String(b.id) === String(bookingId));
    if (bookingIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Booking tidak ditemukan'
      }, { status: 404 });
    }

    const booking = service.bookings[bookingIndex];

    if (booking.status !== 'pending_return' && booking.status !== 'returned') {
      return NextResponse.json({
        success: false,
        message: `Hanya booking dengan status 'pending_return' atau 'returned' yang bisa di-confirm. Status saat ini: ${booking.status}`
      }, { status: 400 });
    }

    // Update booking status
    booking.status = 'completed';
    booking.returnConfirmedAt = new Date().toISOString();

    // ✅ NOW: INCREMENT ACTUAL STOCK BACK!
    let totalQuantity = 0;
    const serviceType = service.type || 'barang';
    
    if (serviceType === 'jasa') {
      // Increment service.quantity for jasa
      service.quantity = (service.quantity || 0) + booking.quantity;
      totalQuantity = service.quantity;
    } else {
      // For barang, increment back to items (distribute evenly or to original items)
      // For now, just add back to total (distribute to items later)
      let toAdd = booking.quantity;
      for (const item of service.items || []) {
        if (toAdd <= 0) break;
        // Add back up to item's original capacity (we don't track this, so just add)
        const add = Math.min(toAdd, 1000); // Arbitrary max per item
        item.stok = (item.stok || 0) + add;
        toAdd -= add;
      }
      totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }

    // Recalculate availableQuantity
    let bookedQuantity = 0;
    for (const b of service.bookings) {
      if (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending_return') {
        bookedQuantity += b.quantity || 0;
      }
    }
    
    let currentStock = 0;
    if (serviceType === 'jasa') {
      currentStock = service.quantity;
    } else {
      currentStock = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }
    
    service.availableQuantity = Math.max(0, currentStock - bookedQuantity);

    // Save updated services
    await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Return confirmed. Stok berhasil ditambah kembali.',
      booking: {
        id: booking.id,
        status: booking.status,
        returnConfirmedAt: booking.returnConfirmedAt
      },
      service: {
        id: service.id,
        quantity: totalQuantity,
        availableQuantity: service.availableQuantity,
        currentStock: currentStock
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in return-confirmed endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}
```

### Testing for Fix #2:

```bash
# Test flow:
1. Booking created (confirmed) → service.quantity UNCHANGED
2. POST /api/bookings/pickup → status = 'active' → service.quantity DECREMENTED
3. Customer uses item...
4. POST /api/returns → status = 'pending_return'
5. PUT /api/returns (vendor) → status = 'returned'
6. POST /api/bookings/return-confirmed → status = 'completed' → service.quantity INCREMENTED
```

---

## ✅ FIX #3: DEAL CYCLE RESET (Priority 3 - EASY)

### Target: Create fresh deal instead of reusing old one

### Files to Modify:
1. **`src/app/api/deals/route.js`** - Implement deal cloning logic

### Implementation:

**File:** `src/app/api/deals/route.js`

**Add new logic when customer/vendor accept deal:**

```javascript
// In the acceptor section (vendor or customer):

if (action === 'accept') {
  let existingDeal = deals.find(d => d.chatId === chatId && d.customerId === customerId && d.vendorId === vendorId && d.status !== 'pending');
  
  if (existingDeal && (existingDeal.status === 'completed' || existingDeal.status === 'cancelled')) {
    // ✅ IMPORTANT: Create FRESH deal, don't reuse!
    console.log(`Deal ${existingDeal.id} is ${existingDeal.status}. Creating fresh deal for new cycle.`);
    
    const newDeal = {
      id: Date.now().toString(),
      chatId: chatId,
      customerId: customerId,
      vendorId: vendorId,
      serviceId: existingDeal.serviceId,
      
      // Fresh rental fields:
      status: 'pending',
      customerAccepted: !vendorAccepted,  // Current user accepted
      vendorAccepted: vendorAccepted,
      createdAt: new Date().toISOString(),
      agreedAt: null,
      
      // Reset borrowing fields:
      borrowDate: null,
      expectedReturnDate: null,
      actualReturnDate: null,
      returnDeadline: null,
      returnStatus: 'pending',
      daysLate: 0,
      lateCharge: 0,
      returnCondition: null,
      returnNotes: '',
      
      // Reset pricing:
      originalPrice: existingDeal.originalPrice || originalPrice,
      finalPrice: existingDeal.finalPrice || originalPrice,
      discountGiven: false,
      discount: { type: null, value: 0, amount: 0 },
      
      // Rating:
      ratingCompleted: false,
      
      // Audit trail:
      previousDealId: existingDeal.id,  // Link to old deal
      
      // Other fields:
      complains: []
    };
    
    deals.push(newDeal);
    existingDeal = newDeal; // Use fresh deal
    chatRoom.dealStatus = 'pending';
  } else if (!existingDeal) {
    // No existing deal, create new one normally
    // ... existing code ...
  }
  
  // Continue with update logic for existingDeal
  existingDeal.vendorAccepted = true;
  existingDeal.status = 'agreed';
  existingDeal.agreedAt = new Date().toISOString();
  
  // ... rest of the code
}
```

### Testing for Fix #3:

```bash
# Scenario: Rental cycle 2
1. Deal-001 created & completed
2. Customer wants to rent again (same chat, same vendor)
3. Should create Deal-002 (NOT reuse Deal-001)
4. Deal-002.previousDealId = "Deal-001" (audit trail)
5. Deal-002 has all blank dates (fresh)
6. Payment for cycle 2 → Deal-002.borrowDate set correctly
7. Return for cycle 2 → Uses Deal-002.expectedReturnDate (not Deal-001!)
```

---

## ✅ FIX #4: STOCK ACTUAL DECREMENT (Priority 4 - HARD)

### This is the most complex fix - ties everything together

### High-level approach:

```
1. Booking created (confirmed) → Stock NOT yet affected
2. Pickup confirmed → Stock DECREMENTED (in_transit/active)
3. Return accepted → Stock INCREMENTED back (completed)
4. Booking cancelled → Stock impact REVERSED
```

### Files to modify:
- Already covered in Fix #2 (pickup & return-confirmed endpoints)
- Update availability calculation to use actual current stock
- Update booking cancellation to handle refunds

---

## ✅ FIX #5: RETURN FLOW VALIDATION (Priority 5 - MEDIUM)

### Ensure rental dates used in return calculation match current deal

**File:** `src/app/api/returns/route.js`

**Add validation:**
```javascript
// In POST handler (initiate return):
const deal = deals[dealIndex];

// Validate deal has rental dates set
if (!deal.borrowDate || !deal.expectedReturnDate) {
  return NextResponse.json({
    success: false,
    message: 'Data peminjaman tidak lengkap. Hubungi vendor atau support.'
  }, { status: 400 });
}

// Ensure deal is in 'active' or 'returning' status
if (!['agreed', 'active', 'returning'].includes(deal.status)) {
  return NextResponse.json({
    success: false,
    message: `Deal tidak bisa di-return. Status saat ini: ${deal.status}`
  }, { status: 400 });
}

// Calculate with correct dates
const expectedReturn = new Date(deal.expectedReturnDate);  // From CURRENT deal
const actualReturn = new Date(actualReturnDate);
const daysLate = Math.max(0, Math.ceil((actualReturn - expectedReturn) / (1000 * 60 * 60 * 24)));

// ... rest of return logic
```

---

## 📅 IMPLEMENTATION TIMELINE

Recommended order:
1. **Week 1 (Priority 1):** Item-based pricing fix
2. **Week 1-2 (Priority 2):** Booking lifecycle & new APIs
3. **Week 2 (Priority 3):** Deal cycle reset
4. **Week 2-3 (Priority 4):** Stock actual decrement (complex, tie everything)
5. **Week 3 (Priority 5):** Return flow validation + comprehensive testing

---

## 🧪 COMPREHENSIVE TESTING CHECKLIST

### Test Suite A: Pricing
- [ ] Single item, single quantity, single day
- [ ] Single item, multiple quantity, multiple days  
- [ ] Multi-item service, select specific item
- [ ] Price with promo code applied
- [ ] Transaction stores correct itemId & price

### Test Suite B: Stock Management
- [ ] Booking created → available decreases (virtual)
- [ ] Pickup confirmed → service.quantity decrements (actual)
- [ ] Return confirmed → service.quantity increments (actual)
- [ ] Multiple overlapping bookings → correct availability
- [ ] Booking cancelled → stock restored

### Test Suite C: Rental Cycle
- [ ] Cycle 1 complete → rating given
- [ ] Cycle 2 create → new deal created (not reused)
- [ ] Cycle 2 rental dates → different from cycle 1
- [ ] Cycle 2 return → uses cycle 2 expectedReturnDate (not cycle 1!)
- [ ] No late charge for cycle 2 on-time return

### Test Suite D: Edge Cases
- [ ] 0 stock available (should show error)
- [ ] Exactly full stock booked (available = 0)
- [ ] Partial overlap bookings
- [ ] Booking cancelled mid-rental (refund calculation)
- [ ] Multiple items in service (test each variant)

---

## 🔗 Related Documentation

See also:
- `RENTAL_LOGIC_BUG_ANALYSIS.md` - Detailed bug analysis
- `RENTAL_LOGIC_FLOW_VISUAL.md` - Visual flows of problems & solutions
- `AVAILABILITY_LOGIC.md` - Current availability implementation
- `RETURN_QUICK_START.md` - Return flow overview
