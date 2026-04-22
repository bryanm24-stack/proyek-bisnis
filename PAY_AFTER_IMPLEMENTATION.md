# 📋 Pay-After Payment Feature - Implementation Guide

## Overview
This document outlines the complete implementation of the Pay-After payment system for RentGuard, allowing customers to pay 20% upfront with the remaining 80% due within 2 days after both parties agree on the sedang berlangsung (ongoing) page.

## Feature Specifications

### Payment Options
- **Bayar Penuh (Full Payment)**: Customer pays 100% immediately
- **Bayar Kemudian (Pay After)**: Customer pays 20% now, remaining 80% due within 2 days after deal agreement

### Timeline
1. Customer selects "Bayar Kemudian" option on payment page
2. Customer pays 20% down payment via QRIS or Card
3. Payment transaction created with status='success'
4. Invoice automatically created for remaining 80% with 2-day deadline
5. Deal updated with paymentType='pay_after', downPayment, remainingPayment, invoiceStatus, paymentDeadline
6. Customer can view unpaid invoices on /customer/invoices page
7. Customer pays remaining 80% by clicking payment button on invoice
8. Invoice marked as 'paid' after successful payment

## Implementation Details

### 1. Payment Page (`/src/app/transaction/payment/page.js`)

**New State Variables:**
```javascript
const [paymentType, setPaymentType] = useState('full'); // 'full' or 'pay_after'
```

**New Calculations:**
```javascript
const downPayment = Math.round(totalAmount * 0.2); // 20% of total
const remainingPayment = totalAmount - downPayment; // 80% of total
```

**Payment Method Selection:**
- Added radio button for "Bayar Kemudian" option before payment method selection
- Shows breakdown: 20% down payment amount and 80% remaining amount
- Updates total in payment summary based on selected payment type

**Transaction Data:**
```javascript
{
  paymentType: 'full' | 'pay_after',
  amount: paymentType === 'pay_after' ? downPayment : totalAmount,
  downPayment: paymentType === 'pay_after' ? downPayment : null,
  remainingPayment: paymentType === 'pay_after' ? remainingPayment : null,
  ...otherFields
}
```

### 2. Transactions API (`/src/app/api/transactions/route.js`)

**Enhanced POST Endpoint:**
- Saves transaction as usual for full payment
- For pay_after payment type:
  1. Creates invoice in invoices.json with 2-day deadline
  2. Updates deal with payment information:
     - paymentType: 'pay_after'
     - downPayment: amount
     - remainingPayment: amount
     - invoiceStatus: 'pending'
     - paymentDeadline: ISO timestamp (2 days from now)
     - invoiceId: reference to created invoice

**File Management:**
- Creates invoices.json if it doesn't exist
- Creates/updates deals.json with new payment fields

### 3. Invoices API (`/src/app/api/invoices/route.js`)

**GET /api/invoices**
- Query Parameters:
  - `customerId`: Filter by customer
  - `status`: Filter by status ('pending', 'paid', 'overdue')
- Returns: Array of invoices sorted by deadline (earliest first)

**POST /api/invoices**
- Creates new invoice
- Stores: dealId, customerId, vendorId, transactionId, remainingPayment, paymentDeadline, status

**PUT /api/invoices**
- Updates invoice status (pending → paid)
- Stores payment method and transaction details
- Updates corresponding deal's invoiceStatus

**Invoice Model:**
```javascript
{
  id: 'INV-{timestamp}',
  dealId: string,
  customerId: string,
  vendorId: string,
  transactionId: string,
  remainingPayment: number,
  paymentDeadline: ISO timestamp,
  status: 'pending' | 'paid' | 'overdue',
  createdAt: ISO timestamp,
  paidAt: ISO timestamp | null,
  paymentMethod: string | null,
  paymentTransactionId: string | null
}
```

### 4. Customer Invoices Page (`/src/app/customer/invoices/page.js`)

**Features:**
- Lists all pending invoices for authenticated customer
- Shows remaining payment amount and deadline
- Real-time countdown timer:
  - Green: ≥1 day remaining
  - Orange: <1 day remaining
  - Red: OVERDUE (deadline passed)
- Payment button for each invoice
- Two-step payment form (after selecting invoice):
  - QRIS option: Scan QR code
  - Card option: Enter card details (name, number, expiry, CVV)

**Invoice Card Display:**
- Invoice ID
- Status badge (Active/Overdue)
- Time remaining countdown
- Remaining payment amount
- Due date
- Pay button

**Payment Form:**
- Only shows when invoice is selected
- Same validation as main payment page
- Creates payment transaction and updates invoice status
- Removes invoice from list upon successful payment

### 5. Updated Files

**Modified: `/src/app/customer/ongoing/page.js`**
- Added link to `/customer/invoices` in navigation navbar
- Allows customers to access pending invoices from ongoing page

## Data Flow Diagram

```
Payment Page (Select Pay-After)
         ↓
Customer Pays 20% Down Payment
         ↓
Transaction API (POST) 
         ↓
┌─────────────────────────────────┐
├─ Save Transaction (down payment)│
├─ Create Invoice (80% remaining) │
└─────────────────────────────────┘
         ↓
Invoice Created + Deal Updated
         ↓
Customer Views on /customer/invoices
         ↓
Customer Pays Remaining 80%
         ↓
Invoice API (PUT) - Update Status to 'paid'
         ↓
Invoice Removed from Pending List
         ↓
Deal invoiceStatus = 'paid'
```

## File Structure

```
proyek-bisnis/
├── src/app/
│   ├── api/
│   │   ├── invoices/
│   │   │   └── route.js (NEW)
│   │   ├── transactions/
│   │   │   └── route.js (MODIFIED)
│   │   └── ongoing/
│   │       └── route.js (unchanged)
│   ├── transaction/
│   │   └── payment/
│   │       └── page.js (MODIFIED)
│   └── customer/
│       ├── invoices/
│       │   └── page.js (NEW)
│       └── ongoing/
│           └── page.js (MODIFIED)
├── invoices.json (NEW - auto-created)
├── deals.json (MODIFIED structure)
└── transactions.json (unchanged)
```

## Database Schema Changes

### deals.json - New Fields
```javascript
{
  ...existingFields,
  paymentType: 'full' | 'pay_after',           // Payment type selection
  downPayment: number,                          // 20% of total amount
  remainingPayment: number,                     // 80% of total amount
  invoiceStatus: 'pending' | 'paid' | 'overdue', // Payment status
  paymentDeadline: ISO timestamp,               // Deadline for 80% payment
  invoiceId: string                             // Reference to invoice
}
```

### invoices.json - New File
```javascript
[
  {
    id: 'INV-{timestamp}',
    dealId: string,
    customerId: string,
    vendorId: string,
    transactionId: string,
    remainingPayment: number,
    paymentDeadline: ISO timestamp,
    status: 'pending' | 'paid' | 'overdue',
    createdAt: ISO timestamp,
    paidAt: null | ISO timestamp,
    paymentMethod: null | string,
    paymentTransactionId: null | string
  }
]
```

## Testing Checklist

- [ ] Select "Bayar Kemudian" on payment page
- [ ] Verify down payment (20%) is calculated correctly
- [ ] Verify remaining payment (80%) is calculated correctly
- [ ] Submit payment with QRIS method
- [ ] Verify transaction created with correct status
- [ ] Verify invoice created with 2-day deadline
- [ ] View invoice on /customer/invoices page
- [ ] Verify countdown timer shows correct time remaining
- [ ] Pay remaining 80% via card method
- [ ] Verify invoice status updated to 'paid'
- [ ] Verify invoice removed from pending list
- [ ] Verify deal invoiceStatus updated to 'paid'
- [ ] Test deadline has passed (simulate time)
- [ ] Verify overdue status displays correctly

## Navigation

**Customer Workflow:**
1. `/` - Browse services
2. `/customer/chats` - Negotiate with vendors
3. `/transaction/payment?dealId=...` - Select payment method
4. `/transaction/success` - Confirmation
5. `/customer/ongoing` - View active orders
6. `/customer/invoices` - View pending invoices (NEW)
7. Pay remaining amount and complete transaction

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/invoices` | GET | Fetch unpaid invoices |
| `/api/invoices` | POST | Create invoice (called by transaction API) |
| `/api/invoices` | PUT | Mark invoice as paid |
| `/api/transactions` | POST | Create transaction + invoice (if pay_after) |

## Error Handling

- Invalid card details: Show specific error messages
- Invoice not found: Return 404 status
- Overdue payment: Still allow payment but display warning
- Expired payment deadline: Allow payment but mark as late
- Missing required fields: Return 400 status with message

## Future Enhancements

- [ ] Email notifications when invoice is about to expire
- [ ] SMS reminders 1 day before deadline
- [ ] Automatic invoice status update to 'overdue' at deadline
- [ ] Admin dashboard to monitor pay-after payments
- [ ] Payment plan options (multiple installments)
- [ ] Penalty/late fees for overdue payments
- [ ] One-click payment from email notifications
