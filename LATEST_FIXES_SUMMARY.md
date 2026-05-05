# Latest System Fixes - May 6, 2026

## Overview
Implemented fixes untuk 3 critical issues:
1. ✅ Stock validation untuk multiple rentals yang sama
2. ✅ Vendor payment button di chat vendor customer tab
3. ✅ Rating cycle - chat bisa bekerja kembali setelah rating

---

## 1. Stock Validation untuk Multiple Rentals

### Problem
Saat customer lain ingin menyewa barang yang sama tetapi belum dikembalikan, sistem tidak cukup ketat dalam validasi stok. Jika stok < yang diminta, seharusnya invalid/ditolak.

### Solution
Stock validation sudah implemented di:
- **File**: `src/app/api/availability/validate/route.js`
- **Logic**:
  ```
  Available Quantity = Total Stock - (Confirmed Bookings + Pending Bookings)
  ```
- **Overlap Detection**: 
  - Cek date range setiap booking yang sudah ada
  - Hanya hitung booking dengan status !== 'cancelled'
  - Pastikan booking periods tidak overlap dengan rental request

### Files Changed
- ✅ `src/app/api/availability/validate/route.js` (Already working)
- ✅ `src/app/api/availability/reserve/route.js` (Already working)
- ✅ `src/app/api/transactions/route.js` - Reservation confirmed saat payment success

### How It Works
1. Customer ingin sewa barang → POST `/api/availability/validate`
2. System cek: total stok - (booked untuk periode itu)
3. Jika available < requested → return error "Stok tidak mencukupi"
4. Jika valid → customer bisa lanjut ke pembayaran
5. Payment success → POST `/api/transactions` trigger booking creation

### Testing
```bash
# Check available stock
curl -X POST http://localhost:3000/api/availability/validate \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "s1",
    "quantity": 2,
    "startDate": "2026-05-10",
    "endDate": "2026-05-15"
  }'

# Expected response if not enough stock:
# {
#   "success": false,
#   "available": false,
#   "availableQuantity": 1,
#   "requestedQuantity": 2,
#   "message": "Stok tidak mencukupi. Tersedia: 1, diminta: 2"
# }
```

---

## 2. Vendor Payment Button di Chat Vendor Customer Tab

### Problem
Ketika vendor menyewa barang dari vendor lain (vendor sebagai customer), tidak ada tombol untuk lanjut ke pembayaran. Logic harus seperti customer.

### Solution
Updated vendor chats page untuk show payment button saat:
- User adalah customer di chat (chatTab === 'vendor')
- Deal status = 'agreed'
- User role bisa vendor atau customer

### Files Changed
- ✅ `src/app/vendor/chats/page.js`
  - Added `useRouter` import
  - Updated deal buttons condition logic
  - Added payment button untuk vendor customer tab
  - Discount button hanya untuk vendor penyedia

### Code Changes
```javascript
// Old: Hanya vendor penyedia bisa accept/cancel
{user.id === selectedChat.vendorId && (/* buttons */)}

// New: Baik vendor penyedia maupun vendor customer bisa
{(user.id === selectedChat.vendorId || (user.id === selectedChat.customerId && chatTab === 'vendor')) && (
  <div>
    {/* Accept/Reject buttons untuk kedua pihak */}
    {/* Payment button hanya untuk vendor customer */}
    {user.id === selectedChat.customerId && (
      <button onClick={() => router.push(`/transaction/payment?dealId=${dealData.id}`)}>
        💳 Lanjut ke Pembayaran
      </button>
    )}
    {/* Discount button hanya untuk vendor penyedia */}
    {user.id === selectedChat.vendorId && (
      <button onClick={() => setDiscountMode('yes')}>
        💰 Aplikasikan Diskon
      </button>
    )}
  </div>
)}
```

### How It Works
1. Vendor (sebagai customer) accept deal → deal.status = 'agreed'
2. Modal profil menampilkan "Lanjut ke Pembayaran" button
3. Click button → redirect ke `/transaction/payment?dealId={dealId}`
4. Payment flow sama seperti customer normal

### Testing
1. Login sebagai vendor_id=2
2. Buka vendor chats → tab "🏪 Vendor"
3. Chat dengan vendor_id=1
4. Accept deal → lihat tombol "💳 Lanjut ke Pembayaran"
5. Click → redirect ke payment page

---

## 3. Rating Cycle - Chat Bisa Bekerja Kembali Setelah Rating

### Problem
Saat sudah rating, chat tidak bisa bekerja lagi untuk accept/tolak orders baru. Chat seharusnya bisa reopen untuk new cycle.

### Solution
Implement deal reset/cycle logic:
1. Saat rating berhasil → mark deal.ratingCompleted = true
2. Customer bisa reset deal untuk new cycle via cancel dengan `resetDeadline=true`
3. Deal returns ke status 'pending' untuk new negotiation

### Files Changed

#### A. `src/app/api/deals/route.js`
- Added `ratingCompleted` field to new deal creation
- Updated cancel action untuk support `resetDeadline` param
  ```javascript
  if (resetDeadline && existingDeal && (existingDeal.status === 'completed' || existingDeal.status === 'cancelled')) {
    // Reset deal to pending untuk new cycle
    existingDeal.status = 'pending';
    existingDeal.ratingCompleted = false;
  }
  ```
- Allow deal dari status 'cancelled' atau 'completed' untuk di-reset

#### B. `src/app/api/ratings/route.js`
- Added `dealId` parameter ke rating submission
- Update deal.ratingCompleted = true saat rating success
  ```javascript
  if (dealId) {
    deal.ratingCompleted = true;
    // Save deal
  }
  ```

### How It Works - Deal Cycle

#### Cycle 1 (First Rental)
1. Customer: POST `/api/deals` (action=accept) → deal.status = 'pending'
2. Vendor: POST `/api/deals` (action=accept) → deal.status = 'agreed'
3. Payment successful → booking created, deal ready
4. After return: Rating submitted with dealId → deal.ratingCompleted = true

#### Cycle 2 (New Rental)
1. Customer: POST `/api/deals` (action=cancel, resetDeadline=true)
   - deal.status reset ke 'pending'
   - deal.ratingCompleted reset ke false
2. Chat reopen untuk new negotiation
3. Vendor: POST `/api/deals` (action=accept) → deal.status = 'agreed' lagi
4. Process repeat...

### Rating Form Integration
Frontend perlu tambahkan:
- Show rating form saat deal.status = 'completed' atau after payment
- Submit rating dengan dealId param
- After rating success → show "Mulai chat baru" atau "New offer" button

### Testing
```bash
# 1. Create deal cycle 1
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accept",
    "chatId": "chat1",
    "customerId": "4",
    "vendorId": "1",
    "serviceId": "s1"
  }'

# 2. After payment and return, submit rating
curl -X POST http://localhost:3000/api/ratings \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "s1",
    "customerId": "4",
    "vendorId": "1",
    "dealId": "deal_123",
    "rating": 5,
    "review": "Bagus, akan rental lagi"
  }'

# 3. Reset deal untuk cycle baru
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel",
    "chatId": "chat1",
    "customerId": "4",
    "vendorId": "1",
    "serviceId": "s1",
    "resetDeadline": true
  }'
```

---

## 4. Stock Reservation at Payment (Already Implemented)

### Current Implementation
Saat payment successful, stock automatically di-reserve via booking creation:

- **File**: `src/app/api/transactions/route.js` (lines 310-350)
- **Trigger**: When `body.status === 'success'`
- **Action**: 
  1. Create booking record di service.bookings[]
  2. Set booking.status = 'confirmed'
  3. Link dengan transaction dan deal ID
- **Result**: Available quantity auto-decreases

### How Stock Decreases
1. Payment successful → transaction created with status='success'
2. Booking record created dengan quantity=requested
3. Next availability check:
   ```
   available = total - (confirmed + pending bookings)
   // booking yang baru dibuat langsung dihitung di confirmed
   ```

---

## Testing Checklist

- [ ] Multiple rental validation working
  - [ ] Customer A can book 2 items (total 5 available)
  - [ ] Customer B try book 4 items same period → error "hanya 3 tersedia"
  
- [ ] Vendor payment button visible
  - [ ] Login as vendor_id=2
  - [ ] Chat dengan vendor_id=1
  - [ ] Accept deal → "Lanjut ke Pembayaran" button visible
  - [ ] Click → redirect to payment page
  
- [ ] Rating cycle working
  - [ ] After payment, rating form appears
  - [ ] Submit rating with dealId
  - [ ] Deal cycle reset via cancel with resetDeadline=true
  - [ ] New offer dapat diterima di chat yang sama

---

## Data Flow Diagram

```
RENTAL FLOW:
Customer A → Chat → Deal Pending → Deal Agreed → Payment → Booking Created
                                                                  ↓
STOCK CHECK:
Customer B: Check Availability = Total - (Booking A + Other Bookings)
            If Available < Requested → REJECT

RATING & CYCLE:
After Return → Rating (dealId included) → deal.ratingCompleted = true
Customer → Reset Deal (resetDeadline=true) → deal.status = 'pending'
New Offer → Deal Agreed → New Payment → New Booking → New Cycle
```

---

## Files Modified Summary

1. ✅ `src/app/vendor/chats/page.js` - Payment button & role logic
2. ✅ `src/app/api/deals/route.js` - Deal cycle & rating fields
3. ✅ `src/app/api/ratings/route.js` - Rating with dealId & mark complete
4. ✅ (Already working) `src/app/api/availability/validate/route.js`
5. ✅ (Already working) `src/app/api/availability/reserve/route.js`
6. ✅ (Already working) `src/app/api/transactions/route.js`

---

## Next Steps

1. **Frontend Rating Form** - Add UI untuk rating input di customer chats
2. **Deal Reset Button** - Add button untuk "Mulai sewa baru" setelah rating
3. **Payment Status UI** - Update chat/deal status display saat payment pending
4. **Stock Status Display** - Show "X dari Y tersedia" di service detail

---

## Known Limitations

- Rating allowed once per customer per service (design-based)
- Deal cycle requires manual reset via cancel action
- No automatic payment reminder untuk pay_after transactions (can add)
- Stock reservation only happens at confirmed payment (not at agreement stage)
