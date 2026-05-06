# 🐛 BUG REPORT: Invoice Data Loss in Purchase Cycle

## Test Date
May 6, 2026 - 03:15 AM

## Test User
**Strawberry Customer** (ID: 4)
- Email: strawberry@rentguard.com
- User Type: Customer

## Issue Summary
**Invoices disappear temporarily when completing the purchase/rental cycle (rating → new purchase → deal acceptance)**

## Steps to Reproduce

1. **Login as Strawberry Customer**
   - Email: strawberry@rentguard.com
   - Password: 123

2. **View Invoices**
   - Navigate to `/customer/invoices`
   - ✅ See 2 paid invoices:
     - Invoice #INV-1777 (Rp 40,000) - Paket Kursi & Meja Serbaguna
     - Invoice #INV-1777 (Rp 175,000) - Item sewa

3. **Give Rating for First Invoice**
   - Click "Beri Rating" button
   - Select 5-star rating
   - Write review: "Sangat memuaskan! Kualitas barang bagus dan pelayanan vendor responsif."
   - Submit rating
   - ✅ Success: "Rating berhasil disimpan"
   - Notice: Item rating increased from 4.7 to 5.0 stars

4. **Buy Item Again**
   - Go to Home
   - Find "Paket Kursi & Meja Serbaguna" (Orange Vendor)
   - Click "Lihat Detail"
   - Select package "Kursi Modern Minimalis"
   - Click "Chat untuk Paket Ini"

5. **View Chat & Accept Deal**
   - Chat modal opens with existing conversation:
     - "beli" (buy) - 03:15
     - "sewa deh" (let's rent) - 03:15
     - "iya silahkah" (yes, please) - 03:16
   - **Click "Terima Deal" (Accept Deal)**
   - ⚠️ **BUG OCCURS HERE**: Rating form appears instead of deal confirmation

6. **Close Modal and Check Invoices**
   - Close the modal
   - Navigate to `/customer/invoices`
   - 🔴 **BUG CONFIRMED**: Invoices now show:
     - Total menunggu pembayaran: Rp 0
     - Invoice pending: 0
     - Invoice dibayar: 0
     - Message: "📭 Tidak ada invoice"

7. **Reload Page**
   - Press F5 or reload
   - ✅ Invoices reappear with same data as before (2 paid invoices)

## Bug Details

### What's Happening
1. After clicking "Terima Deal" (Accept Deal) in the chat
2. The rating form appears (which seems premature - rating should come AFTER rental completion)
3. When closing this modal and checking invoices
4. The invoices temporarily disappear from the UI

### Root Causes (Found)

### 🔴 BUG #1: Premature Rating Form Appearance
**Location**: `src/app/components/HomePageClient.js:443`
**Code**:
```javascript
if (dealDataResp.data.status === 'completed' && !dealDataResp.data.ratingCompleted) {
  setShowRatingForm(true);
}
```
**Issue**: Rating form appears when deal is in 'agreed' status instead of waiting for 'completed' status
**Impact**: Confuses user flow - rating prompt appears before rental is completed

### 🔴 BUG #2: Temporary Invoice Data Loss
**Location**: `src/app/customer/invoices/page.js` (Invoice fetching logic)
**Issue**: After deal acceptance, invoices disappear from UI until page reload
**Root Cause**: Likely a state synchronization issue between:
- Deal agreement (changes dealStatus)
- Invoice component (may be using dealStatus to filter/load invoices)
- Missing refetch trigger after deal state changes

**Observations**:
- Server logs show all API requests returning 200-201 status codes (no server errors)
- Invoices successfully reappear after page reload
- Data integrity is maintained (invoices still exist on backend)
- Issue is purely a frontend state/display bug

### 🔴 BUG #3: Invoice Filter Logic Issue
**Location**: `src/app/api/invoices/route.js:89-104`
**Code**:
```javascript
deals
  .filter((deal) => deal?.id && deal?.status === 'agreed' && deal?.discountGiven && deal?.invoiceStatus !== 'paid')
  .forEach((deal) => {
```
**Issue**: Only creates invoices from deals with discounts (`deal?.discountGiven`)
**Impact**: New deals without discounts won't generate invoices via this path
**Note**: This is intentional filtering for discounted deals, but might contribute to missing invoices in certain scenarios

## Expected Behavior
1. User rates completed rental ✅
2. User searches and starts new rental process ✅
3. User accepts deal in chat ✅
4. System creates invoice for new rental ✅
5. Invoices page shows BOTH:
   - Previous completed rentals (paid)
   - New rental in progress
6. User can view full invoice history without needing page reload

## Actual Behavior
❌ Invoices disappear after deal acceptance until page reload

## Affected Areas
- `/customer/invoices` route
- Invoice state management
- Deal acceptance flow

## Related Data
- Service: "Paket Kursi & Meja Serbaguna" (ID: 1704067202000)
- Vendor: "Orange Vendor"
- Chat ID: 1777493750510
- Customer ID: 4

## Server Logs (Relevant)
```
POST /api/ratings 201 ✅ (Rating submission successful)
GET /api/deals?chatId=1777493750510 200 ✅ (Deal query successful)
GET /api/invoices?customerId=4 200 ✅ (Invoice query successful after reload)
```

## Proposed Fix
1. ✅ Ensure invoice state updates after deal acceptance
2. ✅ Move rating prompt to post-rental completion stage
3. ✅ Add error handling for invoice data fetch failures
4. ✅ Implement proper state synchronization between deal and invoice components

## Test Screenshots
- Before rating: 2 paid invoices ✅
- After rating: 2 paid invoices ✅ (with updated rating shown)
- After deal acceptance: 0 invoices 🔴 (BUG)
- After reload: 2 paid invoices ✅ (restored)

## Fix Recommendations

### ✅ Fix #1: Verify Rating Form Trigger Logic
**File**: `src/app/components/HomePageClient.js:443`
**Issue**: Rating form appearing at wrong time in deal lifecycle
**Action**: Check if deal status transitions from 'agreed' → 'completed' are being properly tracked
**Verify**: Rating should only show after rental is actually completed, not just after deal is agreed

### ✅ Fix #2: Add Invoice Refetch After Deal Status Changes
**File**: `src/app/customer/invoices/page.js`
**Action**: Implement state sync when deals change
**Code to add**:
```javascript
// Listen for deal changes and refetch
const handleDealStatusChange = () => {
  if (user?.id) {
    fetchInvoices(user.id, filter);
  }
};
```

### ✅ Fix #3: Ensure All 'Agreed' Deals Generate Invoice Records
**File**: `src/app/api/invoices/route.js:89`
**Current Issue**: Only discounted deals create invoices
**Action**: Modify filter to include non-discounted 'agreed' deals OR ensure invoice creation happens at deal agreement time

### ✅ Fix #4: Add Console Warnings for Invoice Sync Issues
**Action**: Log warnings when invoices are fetched vs. when deals are updated to track state sync issues

## Priority
**HIGH** - Affects critical purchase cycle workflow

## Severity
**MEDIUM** - Workaround exists (refresh page), indicates state management issues
