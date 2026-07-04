# Chat System - Testing & Verification Guide

## 🧪 QUICK TEST - Lakukan Ini untuk Verify Semua Berfungsi

### Test #1: Send Message (Basic Chat)
**User**: Strawberry (Customer) 
**Action**: Buka home → cari Apple Vendor → click chat → kirim "halo testing"

**Expected Result**:
1. Message muncul di chat window
2. Check `chats.json`:
```json
{
  "id": "...",
  "messages": [
    {
      "senderId": "4",
      "senderName": "Strawberry Customer",
      "message": "halo testing",
      "timestamp": "2026-04-23T..."
    }
  ]
}
```
✅ Pass: Message tersimpan dengan senderId=4 (customer)

---

### Test #2: Vendor Sees Chat
**User**: Apple (Vendor)
**Action**: Login → Chat menu → Lihat list chat

**Expected Result**:
1. Chat dengan Strawberry muncul di list
2. Click chat → Lihat pesan "halo testing"
3. Check API: `GET /api/vendor/chats?vendorId=1` returns chats

✅ Pass: Vendor bisa lihat chat dari customer

---

### Test #3: Vendor Replies
**User**: Apple (Vendor)
**Action**: Type reply "harganya 150000" → Send

**Expected Result**:
1. Reply muncul di chat window
2. Check `chats.json` → messages array punya:
```json
{
  "senderId": "1",        // ← Vendor ID!
  "senderName": "Apple Vendor",
  "message": "harganya 150000"
}
```
✅ Pass: Vendor message tersimpan dengan senderId=1

---

### Test #4: Customer Accept Deal
**User**: Strawberry (Customer)
**Action**: Click "Setuju Deal" button di profil vendor modal

**Expected Result**:
1. API POST `/api/deals` dengan `action: 'accept'`
2. Check `deals.json` → New deal created:
```json
{
  "id": "...",
  "chatId": "...",
  "customerId": "4",
  "vendorId": "1",
  "customerAccepted": true,      // ✅ MUST BE TRUE!
  "vendorAccepted": false,       // ✅ MUST BE FALSE!
  "status": "pending",
  "createdAt": "2026-04-23T..."
}
```
✅ Pass: Deal created dengan status pending

3. Check `notifications.json` → Vendor dapat notif:
```json
{
  "userId": "1",
  "type": "deal_pending",
  "message": "Ada penawaran baru dari customer"
}
```
✅ Pass: Notification sent to vendor

---

### Test #5: Vendor Accept Deal
**User**: Apple (Vendor)
**Action**: Click "Setuju Deal" button (dalam profil customer modal)

**Expected Result**:
1. API POST `/api/deals` dengan `action: 'accept'`
2. Check `deals.json` → Deal updated:
```json
{
  "id": "...",
  "chatId": "...",
  "customerAccepted": true,
  "vendorAccepted": true,        // ✅ UPDATED!
  "status": "agreed",            // ✅ UPDATED!
  "agreedAt": "2026-04-23T..."   // ✅ NEW!
}
```
✅ Pass: Deal status changed to 'agreed'

3. Check `notifications.json` → Customer dapat notif:
```json
{
  "userId": "4",
  "type": "deal_accepted",
  "message": "Vendor menerima penawaran Anda!"
}
```
✅ Pass: Notification sent to customer

---

### Test #6: Apply Discount (NEW!)
**User**: Apple (Vendor)
**Action**: 
- Lihat deal status 'agreed'
- Click "Apply Discount" button
- Enter: Type = "percent", Value = "10"
- Click "Terapkan"

**Expected Result**:
1. API POST `/api/deals` dengan:
```json
{
  "action": "apply-discount",
  "chatId": "...",
  "vendorId": "1",
  "discountType": "percent",
  "discountValue": 10
}
```
✅ API accepts (bukan 400 error)

2. Check `deals.json` → Deal updated dengan:
```json
{
  "originalPrice": 150000,           // ✅ NEW!
  "discountType": "percent",         // ✅ NEW!
  "discountValue": 10,               // ✅ NEW!
  "discountAmount": 15000,           // ✅ Calculated: (10/100)*150000
  "finalPrice": 135000,              // ✅ Calculated: 150000-15000
  "discountAppliedAt": "2026-04-23T..."  // ✅ NEW!
}
```
✅ Pass: Discount saved with correct calculations

3. Check `notifications.json` → Customer dapat notif:
```json
{
  "userId": "4",
  "type": "discount_applied",
  "message": "Vendor memberikan diskon 10%!",
  "relatedData": {
    "discountAmount": 15000,
    "finalPrice": 135000
  }
}
```
✅ Pass: Notification sent with discount details

---

### Test #7: Customer Sees Discount
**User**: Strawberry (Customer)
**Action**: Open chat → Check deal status

**Expected Result**:
1. Lihat notification "Vendor memberikan diskon 10%!"
2. API GET `/api/deals?chatId=...` returns deal dengan:
```json
{
  "finalPrice": 135000,    // ← Harga akhir!
  "discountAmount": 15000
}
```
✅ Pass: Customer sees final price 135.000

---

### Test #8: Payment Flow (Final)
**User**: Strawberry (Customer)
**Action**: Click "💳 Bayar Sekarang"

**Expected Result**:
1. Redirect ke `/transaction/identity-check?dealId=...`
2. Show payment details dengan price = 135.000 (sudah dengan diskon)

✅ Pass: Payment uses final price

---

## 🐛 Troubleshooting

### Issue: Chat doesn't appear at customer side
**Check**:
1. POST `/api/chat` → 201 status?
2. `chats.json` → chat room created?
3. `serviceId` & `customerId` correct?

---

### Issue: Vendor doesn't see customer's chat
**Check**:
1. GET `/api/vendor/chats?vendorId=1` returns data?
2. `chats.json` → `vendorId === "1"`?
3. Check vendor ID is correct

---

### Issue: "Apply Discount" button doesn't work
**Check**:
1. Deal status is `'agreed'`?
2. API returns 400? → Check if `action: 'apply-discount'` is in allowed list
3. Check `services.json` has service with matching ID

---

### Issue: Discount not saved
**Check**:
1. API response 200 success?
2. `deals.json` → discount fields present?
3. No file write errors in server logs?

---

## 📝 Browser DevTools Debugging

### Check Network Tab:
```
1. POST /api/chat
   Request Body → Check serviceId, customerId, message
   Response → Should return updated chatRoom with new message

2. POST /api/deals (action: 'accept')
   Request Body → Check action, chatId, customerId, vendorId
   Response → Should return deal with correct customerAccepted/vendorAccepted

3. POST /api/deals (action: 'apply-discount')
   Request Body → Check discountType, discountValue
   Response → Should return deal with originalPrice, discountType, finalPrice

4. GET /api/vendor/chats?vendorId=1
   Response → Should return array of chats where vendorId or customerId matches
```

### Check Console:
```
Error: "Action harus berisi accept, cancel, atau apply-discount"
→ Your fix didn't apply properly

Error: "Service tidak ditemukan"
→ serviceId in deal doesn't match services.json

Error: "Deal tidak ditemukan"
→ chatId in request doesn't match deals.json
```

---

## 🎯 Final Checklist

Before declaring DONE, verify:

- [ ] Message from customer appears in chats.json
- [ ] Message has senderId (customer ID)
- [ ] Vendor can fetch chats via `/api/vendor/chats`
- [ ] Vendor reply appears for customer
- [ ] Customer can accept deal
- [ ] Deal created with customerAccepted=true
- [ ] Vendor sees deal notification
- [ ] Vendor can accept deal
- [ ] Deal updated with vendorAccepted=true, status='agreed'
- [ ] Customer sees deal_accepted notification
- [ ] Vendor can apply discount (no 400 error!)
- [ ] Deal saved with originalPrice, discountType, discountValue, finalPrice
- [ ] Customer sees discount notification
- [ ] Payment shows final price (with discount applied)

✅ All checks pass = System working correctly!

