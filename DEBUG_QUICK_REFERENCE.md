# 🔧 CHAT SYSTEM - QUICK DEBUG REFERENCE

**If something doesn't work, check this first!**

---

## ❓ CUSTOMER SENDS MESSAGE BUT VENDOR CAN'T SEE

**What to check:**

1. **Browser Console** → Any errors?
   ```
   Error: "customerId diperlukan"
   → Customer ID not being sent
   ```

2. **Check POST /api/chat request:**
   - DevTools → Network tab → POST /api/chat
   - Check Request Body:
     ```json
     {
       "serviceId": "s1",        ← Required!
       "vendorId": "1",          ← Required!
       "customerId": "4",        ← Required!
       "message": "test",        ← Required!
       "senderId": "4",          ← Optional but good to have
       "senderName": "Customer"   ← Optional
     }
     ```

3. **Check Response:**
   - Should be `201` status
   - Should return chatRoom with message

4. **Check chats.json:**
   ```bash
   # Windows PowerShell
   Get-Content chats.json | ConvertFrom-Json | Select-Object -First 1
   
   # Check if your chat exists
   ```

5. **If still not working:**
   - Check `serviceId` matches a real service in `services.json`
   - Check `vendorId` is valid (exists in `users.json`)
   - Check `customerId` is valid (exists in `users.json`)

---

## ❓ VENDOR CAN'T LOAD CHATS

**What to check:**

1. **API Request:**
   - DevTools → Network → GET `/api/vendor/chats?vendorId=1`
   - Check vendorId is correct

2. **Response:**
   - Should return array of chats
   - Should include chats where `vendorId === "1"` OR `customerId === "1"`

3. **Check chats.json:**
   ```javascript
   // Should have chats like:
   {
     "vendorId": "1",    // ← Matches vendor's ID
     // ...
   }
   // OR
   {
     "customerId": "1",  // ← Vendor as customer (vendor chatting with another vendor)
     // ...
   }
   ```

4. **If no chats appear:**
   - Maybe chat hasn't been created yet (customer hasn't sent first message)
   - Check Step 1 above

---

## ❓ DEAL "ACCEPT" NOT WORKING

**What to check:**

1. **API Request:**
   - DevTools → Network → POST `/api/deals`
   - Check Request Body:
     ```json
     {
       "action": "accept",    ← Must be "accept"
       "chatId": "...",
       "customerId": "4",
       "vendorId": "1",
       "serviceId": "s1"
     }
     ```

2. **Check Response:**
   - Status should be `201` (new deal) or `200` (updated deal)
   - NOT `400` with message "Action harus..."

3. **Check deals.json:**
   ```bash
   # Windows PowerShell
   Get-Content deals.json | ConvertFrom-Json
   
   # Should see:
   {
     "chatId": "...",
     "customerAccepted": true,   ← ✅ Should be true if customer accepted
     "vendorAccepted": false,    ← Should be false initially
     "status": "pending"
   }
   ```

4. **Check notifications.json:**
   - Vendor should receive notification:
     ```json
     {
       "userId": "1",
       "type": "deal_pending",
       "message": "Ada penawaran baru dari customer"
     }
     ```

---

## ❓ APPLY DISCOUNT NOT WORKING

**What to check:**

1. **Check Deal Status:**
   - Deal status must be `'agreed'`
   - Both sides must have accepted first
   - Then vendor can apply discount

2. **API Request:**
   - DevTools → Network → POST `/api/deals`
   - Check Request Body:
     ```json
     {
       "action": "apply-discount",      ← NEW ACTION!
       "chatId": "1775934661453",
       "vendorId": "1",
       "customerId": "4",
       "discountType": "percent",       ← 'percent' or 'fixed'
       "discountValue": 10              ← 10 or 20000
     }
     ```

3. **Check Response Status:**
   - ❌ **400 Error**: "Action harus berisi accept, cancel, atau apply-discount"
     → Your code changes didn't apply! Re-check the fix
   
   - ✅ **200 Success**: "Diskon berhasil diterapkan"
     → Good! Check deals.json for discount fields

4. **Check deals.json:**
   ```json
   {
     "chatId": "1775934661453",
     "originalPrice": 150000,        ← ✅ Should be present
     "discountType": "percent",      ← ✅ Should be 'percent' or 'fixed'
     "discountValue": 10,            ← ✅ Should match your input
     "discountAmount": 15000,        ← ✅ Calculated: (10/100)*150000
     "finalPrice": 135000,           ← ✅ Calculated: 150000-15000
     "discountAppliedAt": "2026-04-23T..."  ← ✅ Should be present
   }
   ```

5. **Check math:**
   - Percent: `discountAmount = (value/100) * originalPrice`
   - Fixed: `discountAmount = value`
   - `finalPrice = originalPrice - discountAmount`

6. **If discount fields missing:**
   - Check `services.json` has the service with matching ID
   - Check file write permissions
   - Check server logs for errors

---

## ❓ CHAT BUTTONS BLOCKING CHAT (SCREENSHOT ISSUE)

**What to check:**

1. **Customer Chat Page:**
   - Check vendor name is clickable
   - Click vendor name → Modal should appear
   - Modal should have "✅ Setuju Deal" & "❌ Tolak Deal" buttons

2. **Buttons should NOT be in chat header area:**
   - ❌ If you see Deal buttons above messages → Bug not fixed
   - ✅ If you see only vendor name + 👤 Profil button → Correct

3. **Modal:**
   - Should show vendor name & service
   - Should have two buttons (Setuju Deal, Tolak Deal)
   - Should have "Tutup" button

---

## 📊 EXPECTED FLOW CHECKLIST

When everything works:

```
Step 1: Customer sends "Halo"
        ✅ Message appears in chat
        ✅ Message saved in chats.json with senderId="4"
        ↓
Step 2: Vendor opens chat
        ✅ Message visible to vendor
        ✅ Vendor can reply
        ↓
Step 3: Customer clicks "Setuju Deal"
        ✅ Modal opens with Setuju/Tolak buttons
        ✅ POST /api/deals returns 201
        ✅ Deal created in deals.json
        ✅ Vendor gets notification
        ↓
Step 4: Vendor clicks "Setuju Deal"
        ✅ POST /api/deals returns 200
        ✅ Deal updated: vendorAccepted=true, status='agreed'
        ✅ Customer gets notification
        ↓
Step 5: Vendor applies 10% discount
        ✅ POST /api/deals (action='apply-discount') returns 200
        ✅ Deal has: originalPrice, discountType, discountAmount, finalPrice
        ✅ finalPrice = 135000 (if original was 150000)
        ✅ Customer gets notification with discount amount
        ↓
Step 6: Customer sees final price
        ✅ GET /api/deals returns deal with finalPrice
        ✅ Payment shows Rp 135.000 (not 150.000)
```

---

## 🛠️ QUICK FIXES TO TRY

### Fix #1: 400 Error on apply-discount
```javascript
// File: src/app/api/deals/route.js
// Line: ~39

// Find this:
if (!['accept', 'cancel'].includes(action)) {

// Change to:
if (!['accept', 'cancel', 'apply-discount'].includes(action)) {
```

### Fix #2: customerAccepted always true
```javascript
// File: src/app/api/deals/route.js
// Line: ~94

// Find this:
customerAccepted: customerId === customerId ? true : false,

// Change to:
customerAccepted: true,
```

### Fix #3: Deal buttons blocking chat
```javascript
// File: src/app/customer/chats/page.js
// Around line 260-320

// Remove these buttons from chat header:
<button onClick={() => handleDealAction('accept')}>✅ Setuju Deal</button>
<button onClick={() => handleDealAction('cancel')}>❌ Tolak Deal</button>

// Add in vendor profile modal instead
```

---

## 🔍 HOW TO READ API RESPONSES

### Example: POST /api/chat Response
```json
{
  "success": true,
  "message": "Pesan berhasil dikirim",
  "data": {
    "id": "1775934661453",
    "messages": [
      {
        "id": "1775934661454",
        "senderId": "4",
        "message": "Halo"
      }
    ]
  }
}
```

### Example: POST /api/deals (action=accept) Response
```json
{
  "success": true,
  "message": "Penawaran dikirim, menunggu vendor menerima",
  "data": {
    "deal": {
      "customerAccepted": true,
      "vendorAccepted": false,
      "status": "pending"
    }
  }
}
```

### Example: POST /api/deals (action=apply-discount) Response
```json
{
  "success": true,
  "message": "Diskon berhasil diterapkan",
  "data": {
    "deal": {
      "originalPrice": 150000,
      "discountType": "percent",
      "discountValue": 10,
      "discountAmount": 15000,
      "finalPrice": 135000,
      "discountAppliedAt": "2026-04-23T..."
    }
  }
}
```

---

## 📞 WHO TO CONTACT

If you find issues:
1. Check chats.json & deals.json for data
2. Check browser console for errors
3. Check server logs
4. Review the code changes in this commit

**Everything should work now after the fixes!**

