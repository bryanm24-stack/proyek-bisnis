# Codebase Exploration - System Architecture & Implementation Findings

**Date**: May 6, 2026  
**Scope**: Stock/Availability, Rating System, Vendor Chat, Payment/Transaction Flow

---

## 1. STOCK/AVAILABILITY SYSTEM

### Current Implementation

#### A. Service Types
Services support two types (`service.type`):
- **`barang`** (goods/rental items) - Inventory-based stock
- **`jasa`** (services/work) - Capacity-based availability

#### B. Availability Tracking

**For `barang` (goods)**:
- Stock stored in `service.items[]` array where each item has `stok` property
- Total quantity = Sum of all `service.items[].stok`
- Example:
  ```json
  {
    "type": "barang",
    "items": [
      { "stok": 5, "namaBarang": "Laptop Model A" },
      { "stok": 3, "namaBarang": "Laptop Model B" }
    ]
  }
  ```

**For `jasa` (services)**:
- Quantity stored at `service.quantity` (number of teams/providers available)
- Example: Photography service with `quantity: 3` means 3 photographer teams available

#### C. Booking & Reservation Logic

**Files**: 
- `src/app/api/availability/reserve/route.js` - POST to reserve items
- `src/app/api/availability/validate/route.js` - POST to validate availability

**Bookings Array** (`service.bookings[]`):
- Each service maintains array of booking records
- Booking structure:
  ```json
  {
    "id": "BOOKING-{timestamp}",
    "transactionId": "...",
    "dealId": "...",
    "quantity": 2,
    "startDate": "2026-05-10",
    "endDate": "2026-05-15",
    "status": "confirmed|pending|cancelled|completed",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
  ```

**Availability Calculation**:
```javascript
totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);

bookedQuantity = 0;
for (const booking of service.bookings) {
  if (booking.status !== 'cancelled' && booking.status !== 'completed') {
    bookedQuantity += booking.quantity;
  }
}

availableQuantity = Math.max(0, totalQuantity - bookedQuantity);
```

**Overlap Detection** (in `/api/availability/validate/route.js`):
- Checks date ranges: if `bookingStart < requestEnd` AND `bookingEnd > requestStart`
- Only counts bookings with status: `confirmed`, `pending` (skips `cancelled`)

#### D. Integration Points
- **Transaction API** (`/api/transactions/route.js`): Validates availability before payment
- **Reservation API** (`/api/availability/reserve/route.js`): Creates booking when transaction confirmed
- **Deals API**: Links bookings to deals and invoices

### Key Files
- `services.json` - Main data store with `bookings[]` array
- `src/app/api/availability/` - Validation and reservation endpoints
- `src/app/api/transactions/` - Payment integration with availability checks

---

## 2. RATING SYSTEM

### Current Implementation

#### A. Rating Lifecycle
1. **Submission** (`POST /api/ratings`)
   - Required fields: `serviceId`, `customerId`, `vendorId`, `rating` (1-5)
   - Optional: `review` text
   - Validation: Prevents duplicate ratings from same customer for same service

2. **Service Updates** (automatic on rating submission):
   - `rentCount` incremented by 1
   - `rating` recalculated as average of all ratings for service
   - Both stored back to service object

3. **Storage**:
   - Ratings stored in `ratings.json`
   - Rating object structure:
     ```json
     {
       "id": "timestamp",
       "serviceId": "...",
       "customerId": "...",
       "vendorId": "...",
       "rating": 5,
       "review": "optional text",
       "createdAt": "ISO-8601"
     }
     ```

#### B. Rating Form Integration

**Location**: Chat modal (`src/app/vendor/chats/page.js`)
- **Trigger**: Shows ONLY when deal status is `"agreed"`
- **UI Components**:
  - 5-star rating selector with visual feedback
  - Optional review textarea (max 500 chars)
  - "Kirim Rating" button
  - Form hidden when rating already submitted

**Chat Room Structure** (in `chats.json`):
```json
{
  "id": "...",
  "serviceId": "...",
  "vendorId": "...",
  "customerId": "...",
  "messages": [],
  "dealStatus": null|"agreed"|"cancelled",
  "createdAt": "ISO-8601"
}
```

#### C. Files & Endpoints
- `src/app/api/ratings/route.js` - POST (submit), GET (fetch ratings for service)
- `ratings.json` - Data storage
- `src/app/vendor/chats/page.js` - UI integration in chat modal

### Current Limitations
- ❌ No vendor replies to ratings (PUT endpoint stub exists but incomplete)
- ❌ No rating filters/sorting in service details
- ❌ Rating only available after deal is "agreed" (not after transaction complete)

---

## 3. VENDOR-TO-VENDOR CHAT & B2B MESSAGING

### Current Implementation

#### A. Vendor Chat Access
**File**: `src/app/api/vendor/chats/route.js`

**GET endpoint** (`GET /api/vendor/chats?vendorId=XXX`):
- Returns chats where vendor appears in either role:
  - **As Vendor**: `c.vendorId === vendorId` (receiving customer requests)
  - **As Customer**: `c.customerId === vendorId` (requesting from other vendors)

```javascript
const vendorChats = chats.filter(
  c => c.vendorId === vendorId || c.customerId === vendorId
);
```

#### B. Vendor Chat UI
**File**: `src/app/vendor/chats/page.js`

**Dual Tabs System**:
- **"Vendor Tab"**: Chats where logged-in user is the service provider
  - Shows customer requests for user's services
  - User can apply discounts, manage deals
  
- **"Customer Tab"**: Chats where logged-in user is buying from other vendors
  - Shows vendor requests/services user is interested in
  - User can negotiate as customer

**Features**:
- Message history display
- Deal negotiation (accept/cancel)
- Discount management (vendor can apply discount after deal agreed)
- Search/filter by vendor/customer name or service title

#### C. Deal Flow in Chat
1. **Deal Initiation**:
   - Customer sends message → Chat room created
   - Either party clicks "✅ Deal" button
   - Deal record created in `deals.json`

2. **Deal Negotiation**:
   - Both parties accept → Status becomes `"agreed"`
   - Badge shows "✓ Deal Diterima"

3. **Discount Application** (`POST /api/deals` with `action: "apply-discount"`):
   - Only vendor can apply discount to their agreed deals
   - Types: `"percent"` or `"amount"`
   - Automatically creates pending invoice

4. **Deal Completion**:
   - Status transitions: `pending` → `agreed` → (optionally) `completed`

### Current Limitation
- ⚠️ **No direct B2B payment logic**: Vendor-to-vendor transactions don't automatically route commission/payments
- ⚠️ **No supplier relationship tracking**: No way to mark vendors as "suppliers" vs "service providers"

---

## 4. DEAL/TRANSACTION FLOW

### Current Implementation

#### A. Deal Lifecycle

**Deal States**:
```
initial → accepted → agreed → discounted → completed
```

**Deal Object** (`deals.json`):
```json
{
  "id": "timestamp",
  "chatId": "...",
  "customerId": "...",
  "vendorId": "...",
  "serviceId": "...",
  "customerAccepted": true|false,
  "vendorAccepted": true|false,
  "status": "pending|agreed|completed|cancelled",
  "originalPrice": 1000000,
  "discount": {
    "type": "percent|amount",
    "value": 10,
    "amount": 100000
  },
  "finalPrice": 900000,
  "discountGiven": true|false,
  "createdAt": "ISO-8601",
  "agreedAt": "ISO-8601",
  "discountUpdatedAt": "ISO-8601"
}
```

#### B. Transaction Flow

**Files**:
- `src/app/api/transactions/route.js` - Main transaction handler
- `src/app/transaction/payment/page.js` - Payment UI
- `transactions.json` - Transaction storage
- `invoices.json` - Invoice tracking

**Transaction Types**:
1. **Full Payment** (`paymentType: "full"`):
   - Entire amount paid upfront
   - Status: `"paid"`
   - No pending invoice needed

2. **Pay After** (`paymentType: "pay_after"`):
   - Partial or full payment after service delivery
   - Creates pending invoice
   - Deadline: 2 days from transaction
   - Status: `"pending"` → `"paid"`

3. **Deal Pending** (`paymentType: "deal_pending"`):
   - Payment after deal negotiated + discount applied
   - Automatic pending invoice created
   - 2-day payment deadline

#### C. Invoice System

**Invoice Backfilling Logic** (`src/app/api/invoices/route.js`):
- Automatically creates invoices from:
  1. Historical transactions (if not already invoiced)
  2. Agreed deals with discounts applied
  3. Pay-after transactions

**Invoice Object**:
```json
{
  "id": "INV-timestamp",
  "dealId": "...",
  "customerId": "...",
  "vendorId": "...",
  "serviceId": "...",
  "transactionId": "...",
  "remainingPayment": 900000,
  "paymentDeadline": "ISO-8601",
  "paymentMethod": "qris|card|...",
  "paymentType": "full|pay_after|deal_pending",
  "status": "pending|paid",
  "createdAt": "ISO-8601",
  "paidAt": "ISO-8601|null",
  "notes": "..."
}
```

#### D. Transaction Workflow

```
1. VERIFICATION PHASE (Customer)
   ├─ Select service
   ├─ Chat with vendor
   └─ Negotiate deal

2. AGREEMENT PHASE (Both parties)
   ├─ Deal accept → status: "agreed"
   ├─ Vendor applies discount (optional)
   └─ Invoice created (if needed)

3. PAYMENT PHASE (Customer)
   ├─ Choose payment type: full or pay_after
   ├─ Select payment method: QRIS, card, etc.
   ├─ Submit payment details
   ├─ AVAILABILITY CHECK (validated at this point)
   └─ Transaction created if stock available

4. BOOKING PHASE (System)
   ├─ Reserve service.bookings[] entry
   ├─ Update availableQuantity
   └─ Send confirmation

5. FULFILLMENT PHASE (Vendor)
   ├─ Check orders/transactions
   ├─ Process refund for complaints (if vendor-approved)
   └─ Mark order complete

6. RATING PHASE (Customer)
   ├─ Submit 1-5 star rating
   ├─ Optional review text
   └─ Update service.rating & rentCount
```

#### E. Key Payment Pages

**Customer Payment** (`src/app/transaction/payment/page.js`):
- Deal selection and review
- Quantity/duration input
- Payment method selection (QRIS, card)
- Promo code application
- Full payment vs pay-after toggle
- Card details form (with validation)

**Vendor Order Inspection** (`src/app/vendor/orders/inspect/page.js`):
- View order/deal details
- Handle complaints (confirm/partial refund/apply penalty)
- Track payment status

### Missing Payment Features

❌ **Vendor-to-Vendor Payments**:
- No mechanism for vendor A to pay vendor B
- No supply chain order creation
- No supplier invoice tracking

❌ **Multi-party Transactions**:
- No commission/fee calculation to platform
- No split payment routing
- No seller/buyer escrow system

---

## 5. SYSTEM ARCHITECTURE OVERVIEW

### Data Files
```
services.json          → All services with bookings[]
chats.json            → Customer-Vendor conversations
deals.json            → Negotiated deals
transactions.json     → Payment records
invoices.json         → Invoice tracking
ratings.json          → Service ratings & reviews
users.json            → User accounts
notifications.json    → User notifications
```

### API Endpoints
```
/api/availability/
  ├─ validate/      → Check stock availability
  └─ reserve/       → Create booking

/api/chat/           → C2V messaging
/api/vendor/chats/   → V2V messaging access

/api/deals/          → Deal management
  └─ all/           → Get all deals

/api/ratings/        → Submit/retrieve ratings

/api/transactions/   → Transaction creation + availability check

/api/invoices/       → Invoice management & backfilling

/api/orders/         → Order status updates
```

### UI Components
```
Customer Flow:
  HomePage → Service Detail → Chat Modal → Deal/Rating

Vendor Flow:
  Vendor Dashboard → Chats (2 tabs) → Deal Negotiation → Discount Application
                  → Orders Inspection → Complaint Handling
```

---

## 6. WHAT NEEDS TO BE MODIFIED FOR VENDOR-TO-VENDOR PAYMENTS

### Required Changes

#### A. Vendor Role Enhancement
**New field in User/Service**:
```json
{
  "vendorType": "merchant|supplier|both"
  // "merchant" = sells directly to customers
  // "supplier" = sells to other vendors
  // "both" = both
}
```

#### B. B2B Transaction API
**New endpoint**: `POST /api/transactions/b2b`
- Check vendor-to-vendor deal status
- Validate payment authorization
- Create B2B transaction record
- Route payment to supplier vendor
- Create supplier invoice

#### C. Deal Flow Enhancement
**New fields in Deal**:
```json
{
  "dealType": "c2v|v2v",  // customer-to-vendor or vendor-to-vendor
  "buyerVendorId": "...",  // Required for V2V deals
  "isB2B": true,
  "commissionPercentage": 5,
  "platformFee": 50000
}
```

#### D. Invoice Management
**B2B Invoice types**:
- **Supplier Invoice**: What vendor B creates for vendor A
- **Customer Invoice**: Standard invoice for end customer
- **Commission Invoice**: Platform commission tracking

#### E. Payment Routing Logic
```
V2V Transaction Flow:
  1. Vendor A (buyer) initiates deal with Vendor B (supplier)
  2. Deal agreed + discount applied
  3. Vendor A processes payment
  4. Payment routes:
     - Full amount → Vendor B wallet/bank
     - Commission (5%) → Platform account
     - Tax (10%) → Government (if applicable)
  5. Invoice created for both parties
  6. Rating available after service delivery
```

---

## 7. CURRENT GAPS & RECOMMENDATIONS

### Critical Gaps
1. **No B2B Payment Infrastructure**: Cannot process vendor-to-vendor payments
2. **No Supplier Registration**: No way to identify vendors as suppliers
3. **No Commission Calculation**: No fee routing for platform
4. **No Multi-party Transactions**: Cannot split payments intelligently
5. **Rating Timing**: Rating only available after deal "agreed", not after transaction complete

### Recommendations
1. ✅ Implement `vendorType` field to distinguish vendors
2. ✅ Create `/api/transactions/b2b` endpoint
3. ✅ Extend Invoice system to support multiple invoice types
4. ✅ Add commission calculation engine
5. ✅ Modify chat/deal flow to support V2V negotiations
6. ✅ Add "completed transaction" state before rating becomes available

---

## Summary Table

| Feature | Current Status | Location | Gaps |
|---------|---|---|---|
| **Stock Tracking** | ✅ Implemented | `service.bookings[]` | Need overlap detection optimization |
| **Availability Validation** | ✅ Implemented | `/api/availability/validate` | Need real-time checks |
| **Rating System** | ✅ Basic | `/api/ratings` | No vendor replies, timing issues |
| **C2V Chat** | ✅ Implemented | `/api/chat` | Chat features complete |
| **V2V Chat** | ✅ Partial | `/api/vendor/chats` | No payment routing |
| **Deal Negotiation** | ✅ Implemented | `/api/deals` | Works for C2V only |
| **Discount Application** | ✅ Implemented | `/api/deals` | Vendor-only, creates invoice |
| **C2V Payments** | ✅ Implemented | `/api/transactions` | Full & pay-after working |
| **V2V Payments** | ❌ Missing | — | Needs new implementation |
| **Invoice Tracking** | ✅ Implemented | `/api/invoices` | No supplier invoice type |
| **Commission Calculation** | ❌ Missing | — | Needs implementation |

