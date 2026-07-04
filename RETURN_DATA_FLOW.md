# Return Flow - Visual Diagram & Data Structure

## 📊 Complete State Transition Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW - AUTO TRIGGERED                │
└─────────────────────────────────────────────────────────────────┘
  Payment Success
        ↓
   Create Booking Record:
   - borrowDate: today
   - expectedReturnDate: today + rentalDays
   - rentalStatus: "confirmed"
   - deal.status: "agreed"
        ↓
  [RENTAL ACTIVE PHASE]
  - Duration: borrowDate to expectedReturnDate
  - Stok reserved in services.bookings
  - Customer can extend or return

┌─────────────────────────────────────────────────────────────────┐
│              EXTENSION REQUEST (Optional)                       │
└─────────────────────────────────────────────────────────────────┘
  Customer: "Need to extend"
        ↓
  POST /api/returns/extension
  {
    extendedReturnDate: date,
    proposedPrice: amount
  }
        ↓
  Vendor Response: approve / reject / counter
        ↓
  If approved:
  - expectedReturnDate updated
  - totalPrice increased
  - Extension recorded
  
  If rejected:
  - Use original deadline
  
  If counter:
  - New price negotiated

┌─────────────────────────────────────────────────────────────────┐
│              RETURN SUBMISSION PHASE                            │
└─────────────────────────────────────────────────────────────────┘
  POST /api/returns (Customer)
  {
    dealId,
    itemCondition: "good|minor_damage|major_damage|lost",
    returnPhotos,
    damageDescription
  }
        ↓
  System Auto-Calculates:
  ┌───────────────────────────────────────────┐
  │ actualReturnDate = today                  │
  │ daysLate = max(0, actualReturn - expected)│
  │ lateCharge = daysLate × (price / 5)      │
  │ returnStatus = "pending_inspection"       │
  └───────────────────────────────────────────┘
        ↓
  [INSPECTION PHASE - Vendor Wait]
  - Customer see: "Tunggu inspeksi vendor"
  - Vendor see: "Barang siap diperiksa"
  - Stok released after inspection approved

┌─────────────────────────────────────────────────────────────────┐
│              VENDOR INSPECTION PHASE                            │
└─────────────────────────────────────────────────────────────────┘
  PUT /api/returns (Vendor)
  {
    damageStatus: "none|minor|major|lost",
    damageCharge: amount,
    notes: "..."
  }
        ↓
  System Auto-Calculates:
  ┌───────────────────────────────────────────┐
  │ totalRefund = totalPrice               │
  │            - damageCharge              │
  │            - lateCharge                │
  │                                       │
  │ vendorConfirmed = true                │
  │ returnStatus = "inspected"            │
  └───────────────────────────────────────────┘
        ↓
  Auto-Complete Decision:
  ├─ If (damageStatus=="none" && daysLate==0 && customerConfirmed)
  │  → status = "completed" ✅ INSTANT
  │
  └─ Else → Wait for customer confirmation

┌─────────────────────────────────────────────────────────────────┐
│              CONFIRMATION PHASE                                 │
└─────────────────────────────────────────────────────────────────┘
  DELETE /api/returns (Customer)
  {
    dealId,
    customerId
  }
        ↓
  System:
  ├─ customerConfirmed = true
  ├─ If vendorConfirmed already true:
  │  → status = "completed"
  │  → refundStatus = "processed"
  │  → settlementDate = today
  └─ Record settlement

┌─────────────────────────────────────────────────────────────────┐
│              FINAL SETTLEMENT                                   │
└─────────────────────────────────────────────────────────────────┘
  [COMPLETED STATE]
  - Refund calculated & approved
  - Transfer to customer (1-2 business days)
  - All parties can now rate/review
  - Deal marked as history
```

---

## 💾 Data Structure Evolution

### DEAL OBJECT - Return Fields

```javascript
{
  id: "1777493759494",
  dealId: "1777493759494",
  customerId: "4",
  vendorId: "1",
  serviceId: "1704067200000",
  totalPrice: 1500000,
  
  // ===== RETURN TRACKING FIELDS =====
  
  // Timeline
  borrowDate: "2026-05-01",              // When customer can pickup
  expectedReturnDate: "2026-05-06",      // Original deadline
  actualReturnDate: "2026-05-08",        // When customer actually returned
  rentalDays: 5,
  
  // Late Charge Calculation
  daysLate: 2,                           // max(0, actual - expected)
  lateCharge: 600000,                    // daysLate × (price / 5)
  
  // Damage Assessment
  returnPhotos: ["url1", "url2"],        // Evidence
  itemCondition: "minor_damage",         // Customer reported
  damageDescription: "Layar pecah kecil",
  damageStatus: "minor",                 // Vendor assessed
  damageCharge: 250000,                  // Repair cost
  inspectionNotes: "Bisa diperbaiki",
  
  // Settlement
  totalRefund: 650000,                   // price - damage - late
  refundStatus: "processed",             // pending_payment → processed
  settlementDate: "2026-05-08",
  
  // Status Fields
  returnStatus: "completed",             // pending → pending_inspection → 
                                        // inspected → completed
  status: "completed",                   // Overall deal status
  
  // Confirmations
  customerConfirmed: true,               // Customer agrees with assessment
  vendorConfirmed: true,                 // Vendor completed inspection
  
  // Extension (optional)
  extensionRequests: [
    {
      id: "ext_xxx",
      originalReturnDate: "2026-05-06",
      extendedReturnDate: "2026-05-10",
      proposedPrice: 500000,
      status: "approved",
      requestedAt: "2026-05-05T...",
      respondedAt: "2026-05-05T..."
    }
  ],
  extensionRequest: { /* current */ },
  extensionPrice: 500000,
  
  // Complaints (if any)
  complains: [
    {
      id: "complain_xxx",
      reason: "Damage tidak sesuai penilaian",
      photo: "url",
      resolved: false
    }
  ]
}
```

---

## 📈 Refund Calculation Examples

### Example 1: Perfect Scenario
```
Base:              Rp 1.500.000
Days Late:         0
Late Charge:       Rp 0
Damage Status:     NONE
Damage Charge:     Rp 0
──────────────────────────────
TOTAL REFUND:      Rp 1.500.000 ✅

Returned: FULL
Timeline: Instant (auto-complete)
```

### Example 2: Late + Minor Damage
```
Base:              Rp 1.500.000
Days Late:         2
Daily Rate:        Rp 1.500.000 ÷ 5 = Rp 300.000
Late Charge:       2 × Rp 300.000 = Rp 600.000
Damage Status:     MINOR
Damage Charge:     Rp 250.000
──────────────────────────────
TOTAL REFUND:      Rp 650.000 ⚠️

Deductions:        Rp 850.000 (late + damage)
Timeline:          3-5 hari kerja
```

### Example 3: Major Damage + Late
```
Base:              Rp 1.500.000
Days Late:         5
Daily Rate:        Rp 300.000
Late Charge:       5 × Rp 300.000 = Rp 1.500.000
Damage Status:     MAJOR
Damage Charge:     Rp 800.000
──────────────────────────────
TOTAL REFUND:      Rp 0 (negative capped)

Total Deduction:   Rp 2.300.000 (exceeds base)
Timeline:          Customer liable for damage
```

### Example 4: Item Lost
```
Base:              Rp 1.500.000
Days Late:         0
Late Charge:       Rp 0
Damage Status:     LOST
Damage Charge:     Rp 1.500.000 (100% of base)
──────────────────────────────
TOTAL REFUND:      Rp 0

Customer Liable:   Rp 1.500.000 (no refund)
Vendor Can:        File insurance claim
Timeline:          Immediate closure
```

---

## 🔄 Extension Flow

```
Original: May 1-6 (5 days, Rp 1.5M)
                    ↓
        Customer: "Need to May 10"
        Proposed: +Rp 500k
                    ↓
        POST /api/returns/extension
                    ↓
    Vendor Response Options:
    ├─ approve → New date: May 10, New price: Rp 2M
    ├─ reject → Keep May 6 deadline
    └─ counter → Counter offer Rp 600k
                    ↓
        If approved:
        - expectedReturnDate: 2026-05-10
        - totalPrice: 2000000
        - Extension recorded
        - Customer can proceed with new date
```

---

## 🎯 Field Dependency Chain

```
Customer Submit Return
├─ POST /api/returns
│  ├─ Input: itemCondition, damageDescription, returnPhotos
│  ├─ Calculate: actualReturnDate
│  ├─ Calculate: daysLate = max(0, actual - expected)
│  ├─ Calculate: lateCharge = daysLate × (price / 5)
│  └─ Set: returnStatus = "pending_inspection"
│
Vendor Inspect
├─ PUT /api/returns
│  ├─ Input: damageStatus, damageCharge, notes
│  ├─ Set: vendorConfirmed = true
│  ├─ Set: returnStatus = "inspected"
│  ├─ Calculate: totalRefund = base - damage - late
│  ├─ Check: Auto-complete conditions?
│  │  ├─ damageStatus = "none" ✓
│  │  ├─ daysLate = 0 ✓
│  │  └─ customerConfirmed = true ✓
│  │     → YES: Auto complete
│  │     → NO: Wait for customer
│  │
│  └─ If auto-complete:
│     ├─ Set: status = "completed"
│     ├─ Set: refundStatus = "processed"
│     ├─ Set: settlementDate = today
│     └─ SKIP customer confirmation
│
Customer Confirm (if needed)
├─ DELETE /api/returns
│  ├─ Set: customerConfirmed = true
│  ├─ Check: vendorConfirmed = true?
│  │  ├─ YES → Complete deal
│  │  └─ NO → Wait for vendor
│  │
│  └─ If complete:
│     ├─ Set: status = "completed"
│     ├─ Set: settlementDate = today
│     └─ Process refund
│
Settlement
└─ Refund processed to customer
   (1-2 business days)
```

---

## 🚦 Status Values Reference

### returnStatus values:
- `pending` - Awaiting return submission
- `pending_inspection` - Waiting for vendor inspection
- `inspected` - Vendor completed inspection
- `completed` - Return fully settled

### damageStatus values:
- `none` - No damage
- `minor` - Small damage, repairable
- `major` - Significant damage, high repair cost
- `lost` - Item not returned

### itemCondition values (customer input):
- `good` - No issues
- `minor_damage` - Small damage visible
- `major_damage` - Significant damage
- `lost` - Item is lost

### refundStatus values:
- `pending_payment` - Awaiting refund transfer
- `processed` - Refund transferred to customer
- `cancelled` - Refund cancelled (e.g., dispute)

---

## 📱 Frontend Touchpoints

### Customer UI Needs:
1. **Return Request Form**
   - Condition selector
   - Photo uploader
   - Damage description textarea
   - Submit button

2. **Return Status Tracker**
   - Timeline visualization
   - Current status badge
   - Refund amount display
   - Photo gallery of submitted return

3. **Extension Request**
   - Date picker (new return date)
   - Price input (proposed)
   - Reason textarea
   - Submit button

### Vendor UI Needs:
1. **Inspection Queue**
   - List of pending returns
   - Filter by status
   - Sorting options

2. **Inspection Form**
   - View customer photos
   - Customer damage description
   - Damage status selector
   - Damage charge input
   - Notes textarea
   - Submit button

3. **Return History**
   - Completed returns list
   - Filter by date range
   - Export reports

---

## 🔐 Security Validations

```javascript
// Ownership Check
if (deal.customerId !== requestingCustomerId) {
  return 403 Forbidden
}

// Status Check
if (deal.status !== 'agreed') {
  return 400 Cannot return at this stage
}

// Timeline Check
if (actualReturnDate < borrowDate) {
  return 400 Cannot return before pickup date
}

// Damage Status Validation
if (!['none', 'minor', 'major', 'lost'].includes(damageStatus)) {
  return 400 Invalid damage status
}

// Extension Date Check
if (extendedDate <= currentReturnDate) {
  return 400 Extension date must be in future
}
```

---

*Complete Data Flow Documentation*
*Version: 1.0 - Ready for Implementation*
