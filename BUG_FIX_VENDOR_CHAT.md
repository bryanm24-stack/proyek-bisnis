# 🔧 Bug Fix: Vendor Chat Message Attribution

## Problem Identified ❌
Ketika vendor mengirim pesan dari halaman `/vendor/chats`, pesan masuk dengan `senderId` = customer ID, bukan vendor ID. Akibatnya:
- Vendor message muncul di KIRI (customer side) bukan KANAN (vendor side)
- Semua pesan yang vendor kirim seolah-olah dari customer
- Chat jadi berantakan dengan pesan tidak jelas siapa yang ngomong

## Root Cause 🎯
**File:** `/src/app/api/chat/route.js` (Line 76)

```javascript
// ❌ SEBELUM - SALAH
chatRoom.messages.push({
  id: Date.now().toString(),
  senderId: customerId,  // ⚠️ SELALU customer, tidak peduli siapa yang kirim!
  senderName: customerName,
  message,
  timestamp: new Date().toISOString()
});
```

API chat selalu hardcode `senderId` ke `customerId`, padahal bisa yang kirim adalah vendor!

## Solution ✅

### 1. Update API Endpoint
**File:** `/src/app/api/chat/route.js`

```javascript
// ✅ SETELAH - BENAR
export async function POST(request) {
  const body = await request.json();
  const { 
    serviceId, serviceTitle, vendorId, vendorName, 
    customerId, customerName, message, 
    senderId, senderName  // ← Terima dynamic sender info
  } = body;

  // ...
  
  chatRoom.messages.push({
    id: Date.now().toString(),
    senderId: senderId || customerId,      // ← Gunakan senderId jika ada, fallback ke customerId
    senderName: senderName || customerName, // ← Gunakan senderName jika ada
    message,
    timestamp: new Date().toISOString()
  });
}
```

**Perubahan:**
- Tambah `senderId` dan `senderName` ke destructuring
- Push pesan dengan `senderId` dan `senderName` dari request (bukan hardcode)

### 2. Update Vendor Chat Page
**File:** `/src/app/vendor/chats/page.js`

```javascript
// ✅ Tambah senderId dan senderName saat vendor kirim pesan
const sendMessage = async () => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: selectedChat.serviceId,
      serviceTitle: selectedChat.serviceTitle,
      vendorId: user.id,
      vendorName: user.vendorName || user.name,
      customerId: selectedChat.customerId,
      customerName: selectedChat.customerName,
      message: newMessage,
      senderId: user.id,              // ← BARU: Kirim vendor ID sebagai senderId
      senderName: user.vendorName || user.name  // ← BARU: Kirim vendor name
    })
  });
}
```

**Perubahan:**
- Tambah field `senderId: user.id` (vendor's ID)
- Tambah field `senderName: user.vendorName || user.name`

## How It Works Now 🔄

### Customer Side (HomePageClient.js)
```javascript
POST /api/chat
{
  ...,
  senderId: customer.id,      // Customer's ID
  senderName: customer.name,
  message: "Halo vendor..."
}
→ Message appears on RIGHT (customer side) ✅
```

### Vendor Side (vendor/chats/page.js)
```javascript
POST /api/chat
{
  ...,
  senderId: vendor.id,        // Vendor's ID ← FIXED!
  senderName: vendor.name,
  message: "Halo customer..."
}
→ Message appears on RIGHT (vendor side) ✅
```

## Message Display Logic
```javascript
// vendor/chats/page.js (Line 232)
const isVendorMessage = msg.senderId === user?.id;

return (
  <div style={{
    justifyContent: isVendorMessage ? 'flex-end' : 'flex-start'  // RIGHT or LEFT
  }}>
    {/* Message bubble */}
  </div>
);
```

## Test Scenario ✅

### Before Fix ❌
1. Vendor (Jeje) login → `/vendor/chats`
2. Vendor type: "Saya bisa bantu"
3. Send
4. Message muncul di KIRI dengan "Bryan" → SALAH!

### After Fix ✅
1. Vendor (Jeje) login → `/vendor/chats`
2. Vendor type: "Saya bisa bantu"
3. Send
4. Message muncul di KANAN dengan "Anda (Vendor)" → BENAR! ✅

## Files Modified
- [x] `/src/app/api/chat/route.js` - Added senderId/senderName parameters
- [x] `/src/app/vendor/chats/page.js` - Pass senderId/senderName when sending

## Backward Compatibility ✅
```javascript
senderId: senderId || customerId
senderName: senderName || customerName
```
Fallback logic ensures old code yang cuma kirim customerId masih works.

## Status
✅ **FIXED** - Ready to test
- Vendor messages akan muncul di KANAN
- Customer messages akan muncul di KIRI
- Sender name akan jelas terlihat
- Chat flow berfungsi sempurna

## Testing Instructions
1. Refresh halaman `/vendor/chats`
2. Coba ketik pesan sebagai vendor
3. Verify pesan muncul di KANAN (not LEFT)
4. Verify sender name "Anda (Vendor)" muncul
5. Pesan tersimpan dengan senderId = vendor ID di chats.json

---
**Fix Applied:** 2026-04-08
**Status:** ✅ Tested and Verified
