# RETURN/REFUND FLOW - Dokumentasi Lengkap

## 📋 Overview

Sistem pengembalian barang (return) dirancang untuk menangani:
1. **Pengambilan barang** setelah pembayaran
2. **Pengembalian barang** sebelum/sesudah deadline
3. **Penilaian kerusakan** oleh vendor
4. **Perhitungan denda** untuk keterlambatan
5. **Proses refund** berdasarkan kondisi barang

---

## 🔄 Flow Lengkap (Step-by-Step)

### TAHAP 1: AFTER PAYMENT SUCCESS ✅ Booking Created

**Status: `confirmed`**

```
Customer bayar → Transaction status: success
                ↓
         Create booking record:
         - borrowDate: today
         - expectedReturnDate: borrowDate + rentalDays
         - rentalDays: calculated from deal
         - returnStatus: "pending"
         - deal.status: "agreed"
```

**Data yang tersimpan:**
```json
{
  "dealId": "1777493759494",
  "totalPrice": 1500000,
  "borrowDate": "2026-05-01",
  "expectedReturnDate": "2026-05-06",
  "rentalDays": 5,
  "returnStatus": "pending",
  "damageStatus": "none",
  "daysLate": 0,
  "lateCharge": 0
}
```

---

### TAHAP 2: DURING RENTAL 📦 Customer Has Item

**Status: `agreed` (still active)**

Customer memiliki barang selama periode rental. UI menampilkan:
- ✅ Days remaining counter
- ✅ Return deadline highlighted
- ✅ Option to request extension
- ✅ Pre-return checklist

**Extension Option** (Optional):
- Customer: "Saya butuh perpanjangan sampai 10 Mei, mau bayar Rp 500.000"
- Vendor bisa: approve, reject, atau counter offer
- Jika approved: expectedReturnDate berubah menjadi "2026-05-10"
- Jika reject: tetap kembali pada tanggal asli

---

### TAHAP 3: RETURN INITIATION 🔄 Customer Starts Return

**API: `POST /api/returns`**

Customer mengajukan pengembalian dengan info:
```json
{
  "dealId": "1777493759494",
  "customerId": "4",
  "itemCondition": "good|minor_damage|major_damage|lost",
  "damageDescription": "Layar pecah di sudut kiri",
  "returnPhotos": ["url1", "url2", "url3"]
}
```

**Sistem automatis:**
1. Set `actualReturnDate` = hari ini
2. Hitung `daysLate` = max(0, actualReturnDate - expectedReturnDate)
3. Hitung `lateCharge` = daysLate × (totalPrice / 5)
4. Set `returnStatus` = "pending_inspection"
5. Set `status` = "returning"

**Hasil:**
```json
{
  "actualReturnDate": "2026-05-08",
  "daysLate": 2,
  "lateCharge": 600000,
  "estimatedRefund": 900000,
  "returnStatus": "pending_inspection"
}
```

---

### TAHAP 4: VENDOR INSPECTION 🔍 Vendor Assesses Damage

**API: `PUT /api/returns`**

Vendor menginspeksi barang dan menilai kerusakan:
```json
{
  "dealId": "1777493759494",
  "vendorId": "1",
  "damageStatus": "minor",
  "damageCharge": 250000,
  "notes": "Layar pecah minor, masih bisa diperbaiki"
}
```

**Sistem automatis:**
1. Set `damageStatus` dari inspeksi
2. Set `damageCharge` sesuai penilaian vendor
3. Hitung `totalRefund` = totalPrice - damageCharge - lateCharge
4. Set `vendorConfirmed` = true
5. Set `refundStatus` = "pending_payment"

**Refund Calculation:**
```
Base Price:       Rp 1.500.000
Late Charge:      Rp   600.000
Damage Charge:    Rp   250.000
─────────────────────────────
Total Refund:     Rp   650.000
```

**Auto-Complete Scenario:**
Jika:
- damageStatus = "none" ✓
- daysLate = 0 ✓
- customerConfirmed = true ✓

Maka: status = "completed" (instant, no need to wait for customer confirmation)

---

### TAHAP 5: SETTLEMENT & REFUND 💰 Final Confirmation

**API: `DELETE /api/returns`** (Customer confirms)

Customer confirm pengembalian setelah lihat hasil inspeksi:
```json
{
  "dealId": "1777493759494",
  "customerId": "4"
}
```

**Sistem:**
1. Set `customerConfirmed` = true
2. Jika `vendorConfirmed` sudah true → status = "completed"
3. Set `settlementDate` = hari ini
4. Set `refundStatus` = "processed"

**Final Status:**
```json
{
  "status": "completed",
  "returnStatus": "completed",
  "totalRefund": 650000,
  "refundStatus": "processed",
  "settlementDate": "2026-05-08"
}
```

**Refund diproses ke customer dalam 1-2 hari kerja**

---

## 💸 DAMAGE CHARGE SCENARIOS

### Scenario 1: Barang Dalam Kondisi Baik ✅
```
returnPhotos: [good condition photos]
itemCondition: "good"
damageStatus: "none"
damageCharge: Rp 0
lateCharge: Rp 600.000 (2 hari terlambat)
─────────────────────────────
totalRefund: Rp 900.000
```

### Scenario 2: Kerusakan Ringan 🟡
```
itemCondition: "minor_damage"
damageDescription: "Goresan kecil di layar"
damageCharge: Rp 200.000
lateCharge: Rp 0 (tepat waktu)
─────────────────────────────
totalRefund: Rp 1.300.000
```

### Scenario 3: Kerusakan Berat 🔴
```
itemCondition: "major_damage"
damageDescription: "Layar pecah parah, tidak bisa perbaiki"
damageCharge: Rp 1.200.000
lateCharge: Rp 300.000 (1 hari terlambat)
─────────────────────────────
totalRefund: Rp 0 (tidak ada refund)
```

### Scenario 4: Barang Hilang ❌
```
itemCondition: "lost"
damageStatus: "lost"
damageCharge: Rp 1.500.000 (100% dari harga)
lateCharge: Rp 0
─────────────────────────────
totalRefund: Rp 0
```

---

## 🔌 API Endpoints Reference

### 1. GET Return Status
```
GET /api/returns?dealId=1777493759494

Response:
{
  "dealId": "1777493759494",
  "status": "returning|returning",
  "borrowDate": "2026-05-01",
  "expectedReturnDate": "2026-05-06",
  "actualReturnDate": "2026-05-08",
  "returnStatus": "pending_inspection|inspected|completed",
  "damageStatus": "none|minor|major|lost",
  "damageCharge": 250000,
  "lateCharge": 600000,
  "totalRefund": 650000,
  "refundStatus": "pending_payment|processed"
}
```

### 2. Initiate Return (Customer)
```
POST /api/returns
{
  "dealId": "1777493759494",
  "customerId": "4",
  "itemCondition": "minor_damage",
  "damageDescription": "Layar goresan kecil",
  "returnPhotos": ["url1", "url2"]
}

Response:
{
  "message": "Permintaan pengembalian berhasil diajukan",
  "data": {
    "actualReturnDate": "2026-05-08",
    "daysLate": 2,
    "lateCharge": 600000,
    "returnStatus": "pending_inspection",
    "estimatedRefund": 900000
  }
}
```

### 3. Inspect Return & Assess Damage (Vendor)
```
PUT /api/returns
{
  "dealId": "1777493759494",
  "vendorId": "1",
  "damageStatus": "minor",
  "damageCharge": 250000,
  "notes": "Layar bisa diperbaiki dengan biaya 250rb"
}

Response:
{
  "message": "Inspeksi pengembalian berhasil disimpan",
  "data": {
    "damageStatus": "minor",
    "damageCharge": 250000,
    "lateCharge": 600000,
    "totalRefund": 650000,
    "refundStatus": "pending_payment",
    "autoCompleted": false
  }
}
```

### 4. Confirm Return (Customer)
```
DELETE /api/returns
{
  "dealId": "1777493759494",
  "customerId": "4"
}

Response:
{
  "message": "Pengembalian berhasil diselesaikan",
  "data": {
    "status": "completed",
    "totalRefund": 650000,
    "refundStatus": "processed",
    "settlementDate": "2026-05-08"
  }
}
```

### 5. Request Extension
```
POST /api/returns/extension
{
  "dealId": "1777493759494",
  "customerId": "4",
  "extendedReturnDate": "2026-05-10",
  "proposedPrice": 500000,
  "reason": "Masih butuh sehari lagi untuk project"
}

Response:
{
  "message": "Permintaan perpanjangan berhasil dikirim",
  "data": {
    "id": "ext_1777493759494",
    "status": "pending",
    "extendedReturnDate": "2026-05-10",
    "proposedPrice": 500000
  }
}
```

### 6. Respond to Extension (Vendor)
```
PUT /api/returns/extension
{
  "dealId": "1777493759494",
  "vendorId": "1",
  "extensionRequestId": "ext_1777493759494",
  "action": "approve|reject|counter",
  "counterPrice": 600000  // only if action = "counter"
}

Response:
{
  "message": "Permintaan perpanjangan disetujui",
  "data": {
    "newReturnDate": "2026-05-10",
    "newTotalPrice": 2000000
  }
}
```

---

## 📊 State Diagram

```
Payment Success
      ↓
[confirmed] → Return Deadline Approaching
      ↓
[agreed] ← Extension (optional)
      ↓
  Customer Can:
  ├─ Return (on-time)
  ├─ Return (late)
  └─ Request Extension
      ↓
  POST /api/returns
      ↓
[returning] + returnStatus: pending_inspection
      ↓
  Vendor Inspects
  PUT /api/returns
      ↓
[returning] + returnStatus: inspected
      ↓
  Auto-Complete OR Wait for Confirmation
      ↓
DELETE /api/returns (if manual confirmation needed)
      ↓
[completed] + refundStatus: processed
      ↓
Refund Processed (1-2 hari)
      ↓
[completed] + refundStatus: completed
```

---

## 🎯 Business Rules

1. **Late Charges:**
   - Calculated as: `daysLate × (totalPrice / 5)`
   - Only charged if actualReturnDate > expectedReturnDate
   - Cannot be waived (automatic)

2. **Damage Assessment:**
   - Vendor has 24 hours to inspect after return request
   - Damage charge is mandatory if damage found
   - Customer can dispute in chat/complain system

3. **Auto-Complete:**
   - Happens only if:
     - No damage reported
     - No late charges
     - Customer already confirmed
   - Skips waiting for vendor confirmation

4. **Refund Processing:**
   - Manual transfer after settlement
   - Should be processed within 1-2 business days
   - If > 3 days, customer can escalate

5. **Extension:**
   - Can only be requested during "agreed" status
   - Counter-offer possible
   - New total price = old price + extension price

---

## ⚠️ Exception Handling

### Customer forgot to return on time
- System auto-calculates late charge
- Customer still can return and pay charges
- Charges deducted from refund

### Item is lost
- damageCharge = 100% of rental price
- No refund to customer
- Vendor can file insurance claim

### Damage dispute
- Customer can complain in chat
- Both parties discuss via messaging
- Admin can mediate if needed

### Vendor doesn't inspect on time
- After 48 hours, assume no damage
- Auto-approve 50% refund
- Full refund after 5 days no inspection

---

## 📱 Frontend Integration Points

### Customer Dashboard - Ongoing Rentals:
```
Show:
- Item details
- Days remaining countdown
- Return deadline (red if < 3 days)
- "Return Item" button
- "Request Extension" button
```

### Customer - Return Page:
```
Step 1: Confirm item condition
- [ ] Barang dalam kondisi baik
- [ ] Ada kerusakan ringan
- [ ] Ada kerusakan berat
- [ ] Barang hilang

Step 2: Upload return photos
- [Upload photos]

Step 3: Submit
- Shows estimated refund calculation
```

### Vendor - Return Inspection Page:
```
Show:
- Customer photos
- Damage description
- Approve damage amount
- Notes (optional)
- [Submit Inspection] button
```

### Refund Status Page:
```
Show timeline:
✓ 05-08: Customer submit return
✓ 05-08: Vendor inspect (damage: Rp 250rb)
✓ 05-08: Refund approved (Rp 650rb)
⏳ 05-10: Processing (estimasi)
```

---

## 🔐 Security Notes

1. Only customer can submit return for their rental
2. Only vendor can inspect return for their item
3. Damage charges cannot be edited after settlement
4. All photos stored with timestamps
5. Complain system logs all disputes

---

## 📝 Example Workflows

### Workflow 1: Perfect Return (No Issues)
```
1. Customer returns on 2026-05-06 (exact deadline)
2. Photos show item in perfect condition
3. API call: POST /api/returns (itemCondition: "good")
4. API call: PUT /api/returns (damageStatus: "none")
5. Auto-complete triggered
6. Refund: Rp 1.500.000 (100%) ✅
```

### Workflow 2: Late Return with Damage
```
1. Customer returns on 2026-05-08 (2 days late)
2. Photos show minor damage
3. API call: POST /api/returns (itemCondition: "minor_damage")
   - daysLate = 2
   - lateCharge = Rp 600.000
4. API call: PUT /api/returns (damageStatus: "minor", damageCharge: 250k)
   - totalRefund = 1.500.000 - 600.000 - 250.000 = Rp 650.000
5. API call: DELETE /api/returns (customer confirms)
6. Refund: Rp 650.000 (processed) ✅
```

### Workflow 3: Extension Then On-Time Return
```
1. Customer requests extension on 2026-05-05
2. Vendor approves, new deadline: 2026-05-10
3. Customer returns on 2026-05-10 (exact new deadline)
4. Photos show good condition
5. Auto-complete
6. Refund: Rp 2.000.000 (base + extension) ✅
```

---

## 🚀 Future Enhancements

1. **Damage Estimation AI** - Auto-assess damage from photos
2. **Insurance Integration** - Auto-claim for lost items
3. **Late Fee Waiver** - Special offers for loyal customers
4. **Return Pickup Service** - Free pickup for high-value items
5. **Refund to Original Payment Method** - Automatic routing
