# RETURN FLOW - QUICK START GUIDE

## 🎯 Ringkasan Singkat

Setelah customer **membayar**, sistem otomatis:
1. ✅ Create booking record
2. ✅ Set return deadline
3. ✅ Reserve stok barang

Setelah rental selesai, customer dapat:
- **Return** barang dengan foto condition
- **Request Extension** jika butuh perpanjangan
- Vendor **inspect** dan set damage charge
- Automatic **refund** calculation

---

## 🔗 API Quick Reference

### 1️⃣ After Payment (Automatic - sudah implemented)
```
Transaction status: success
→ Auto-creates booking & timeline
→ borrowDate + expectedReturnDate set
```

### 2️⃣ Customer Submit Return
```bash
POST /api/returns
{
  "dealId": "1777493759494",
  "customerId": "4",
  "itemCondition": "good|minor_damage|major_damage|lost",
  "damageDescription": "...",
  "returnPhotos": ["url1", "url2"]
}
```

**Response:**
- actualReturnDate calculated
- daysLate & lateCharge calculated
- Status: pending_inspection

### 3️⃣ Vendor Inspect Return
```bash
PUT /api/returns
{
  "dealId": "1777493759494",
  "vendorId": "1",
  "damageStatus": "none|minor|major|lost",
  "damageCharge": 250000,
  "notes": "..."
}
```

**Auto-actions:**
- damageCharge set
- totalRefund calculated
- Status: inspected
- Auto-complete if: no damage + on-time + customer confirmed

### 4️⃣ Customer Confirm Return
```bash
DELETE /api/returns
{
  "dealId": "1777493759494",
  "customerId": "4"
}
```

**Result:**
- Status: completed
- Refund: processed

### 5️⃣ Extension Request (Optional)
```bash
POST /api/returns/extension
{
  "dealId": "1777493759494",
  "customerId": "4",
  "extendedReturnDate": "2026-05-10",
  "proposedPrice": 500000,
  "reason": "..."
}
```

Vendor dapat: **approve** / **reject** / **counter offer**

---

## 💰 Refund Calculation Formula

```
Base Price:          Rp X
- Late Charge:       Rp (daysLate × dailyRate)
- Damage Charge:     Rp (vendor assessed)
─────────────────────────
= Total Refund:      Rp Y
```

**Late Charge = daysLate × (totalPrice ÷ 5)**

---

## 📊 Status Flow

```
Payment ✓
   ↓
[agreed] (rental active)
   ├─ Can request extension
   └─ Can submit return
   ↓
POST /api/returns
   ↓
[returning] + pending_inspection
   ↓
PUT /api/returns (vendor inspects)
   ↓
[returning] + inspected
   ↓
Auto-complete OR DELETE /api/returns (manual)
   ↓
[completed] ✓ Refund processed
```

---

## 🎬 Example: Complete Flow

```
1. Customer pays Rp 1.500.000 for 5-day rental (May 1-6)
   ✓ borrowDate: 2026-05-01
   ✓ expectedReturnDate: 2026-05-06
   ✓ returnStatus: pending

2. Customer returns on May 8 (2 days late) with minor damage
   POST /api/returns {itemCondition: "minor_damage"}
   → actualReturnDate: 2026-05-08
   → daysLate: 2
   → lateCharge: Rp 600.000

3. Vendor inspects
   PUT /api/returns {damageStatus: "minor", damageCharge: Rp 250.000}
   → totalRefund = 1.500.000 - 600.000 - 250.000 = Rp 650.000

4. Customer confirms
   DELETE /api/returns
   → Status: completed
   → Refund Rp 650.000 ✓
```

---

## ✅ Implementation Checklist

- [x] Return API (GET/POST/PUT/DELETE)
- [x] Extension API (GET/POST/PUT)
- [x] Booking creation on payment
- [x] Late charge calculation
- [x] Damage assessment
- [x] Refund calculation
- [x] Auto-complete logic
- [ ] Frontend: Return request form
- [ ] Frontend: Inspection page (vendor)
- [ ] Frontend: Return status tracking
- [ ] Frontend: Extension request UI
- [ ] Refund payment processor integration
- [ ] SMS/Email notifications

---

## 🔔 Key Features

✨ **Auto-Complete:** No damage + on-time + customer confirmed = instant completion

💰 **Damage Charges:** Cannot be waived, automatically calculated

⏰ **Late Charges:** Automatic, calculated from days late

🎁 **Extension Support:** Customers can extend with vendor approval

📸 **Photo Evidence:** Required for damage assessment

🔐 **Secure:** Only customer/vendor can manage their own rentals

---

## 🚨 Important Rules

1. **Return deadline** = borrowDate + rentalDays
2. **Late charge** = max(0, daysLate × dailyRate)
3. **Damage is mandatory** - cannot be skipped
4. **Refund only after** vendor inspection + settlement
5. **Lost items** = no refund (100% damage charge)

---

## 📞 Support Scenarios

### "Saya terlambat return"
→ Late charges calculated automatically
→ Deducted from refund
→ No need to discuss with vendor

### "Ada kerusakan pada barang"
→ Customer submit with photos
→ Vendor assess damage cost
→ Deducted from refund

### "Saya butuh perpanjangan"
→ Submit extension request
→ Vendor approve/reject/counter
→ New deadline set

### "Barang hilang"
→ itemCondition: "lost"
→ damageCharge: 100% from rental price
→ No refund to customer

---

## 🔗 Related Endpoints

- **GET /api/ongoing** - View active rentals
- **GET /api/invoices** - View invoices & refunds
- **POST /api/ratings** - Leave review after completion
- **POST /api/complaints** - File dispute/complaint

---

*Last Updated: 2026-04-30*
*Version: 1.0 - Return Flow Complete*
