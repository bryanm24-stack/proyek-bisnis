# Chat System - Code Issues & Fixes

## Issue 1: Missing Discount Application Handler

**Severity**: 🔴 CRITICAL

**Location**: [src/app/api/deals/route.js](src/app/api/deals/route.js) - Line ~147

**Current Code**:
```javascript
export async function POST(request) {
  const body = await request.json();
  const { action, chatId, customerId, vendorId, serviceId } = body;

  if (!['accept', 'cancel'].includes(action)) {
    return NextResponse.json({
      success: false,
      message: 'Action harus berisi accept atau cancel'
    }, { status: 400 });
  }

  // Only handles 'accept' and 'cancel'
  // Missing: 'apply-discount'
}
```

**Problem**: 
- Frontend sends `action: 'apply-discount'` with discount data
- API rejects it with 400 error
- Discount is never saved to database

**Frontend Trigger** [src/app/vendor/chats/page.js#L187](src/app/vendor/chats/page.js#L187):
```javascript
const body = {
  action: 'apply-discount',  // ← API doesn't accept this
  chatId: selectedChat.id,
  vendorId: user.id,
  discountType,      // 'percent' | 'fixed'
  discountValue: Number(discountValue)
};

const res = await fetch('/api/deals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
```

**Required Fix**:
```javascript
if (!['accept', 'cancel', 'apply-discount'].includes(action)) {
  return NextResponse.json({
    success: false,
    message: 'Action harus berisi accept, cancel, atau apply-discount'
  }, { status: 400 });
}

// ... existing accept and cancel logic ...

if (action === 'apply-discount') {
  // Find deal
  const deal = deals.find(d => d.chatId === chatId);
  if (!deal) {
    return NextResponse.json({
      success: false,
      message: 'Deal tidak ditemukan'
    }, { status: 404 });
  }

  // Extract discount data from request
  const { discountType, discountValue } = body;
  const service = services[deal.serviceId]; // Need to read services.json
  const originalPrice = service?.price || 0;
  
  // Calculate discount
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = Math.round((discountValue / 100) * originalPrice);
  } else if (discountType === 'fixed') {
    discountAmount = discountValue;
  }
  
  // Prevent negative prices
  const finalPrice = Math.max(0, originalPrice - discountAmount);
  
  // Update deal
  deal.originalPrice = originalPrice;
  deal.discountType = discountType;
  deal.discountValue = discountValue;
  deal.discountAmount = discountAmount;
  deal.finalPrice = finalPrice;
  deal.discountAppliedAt = new Date().toISOString();
  
  await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
  
  // Create notification for customer
  await createNotification(
    deal.customerId,
    'discount_applied',
    `Vendor memberikan diskon ${discountValue}${discountType === 'percent' ? '%' : ''}!`,
    chatId,
    { vendorId, discount: discountValue, finalPrice }
  );

  return NextResponse.json({
    success: true,
    message: 'Diskon berhasil diterapkan',
    data: { deal }
  }, { status: 200 });
}
```

---

## Issue 2: Missing originalPrice Field in Deal

**Severity**: 🔴 CRITICAL

**Location**: Multiple
1. [src/app/api/deals/route.js#L97-L108](src/app/api/deals/route.js#L97-L108) - Deal creation
2. [src/app/vendor/chats/page.js#L161](src/app/vendor/chats/page.js#L161) - Frontend access

**Current Deal Structure**:
```javascript
{
  id: "1775934693221",
  chatId: "1775934661453",
  customerId: "4",
  vendorId: "1",
  serviceId: "s1",
  customerAccepted: true,
  vendorAccepted: true,
  status: "agreed",
  createdAt: "2026-04-23T14:31:31.440Z",
  agreedAt: "2026-04-23T14:31:39.581Z"
  // ❌ Missing: originalPrice, discountType, discountValue, finalPrice
}
```

**Frontend Code Trying to Use It**:
```javascript
// src/app/vendor/chats/page.js - Line 161
const original = dealData?.originalPrice ?? null;  // Always null!

// Line 166-173
const val = Number(discountValue) || 0;
let amount = 0;
if (discountType === 'percent') {
  amount = Math.round((val / 100) * original);  // Original is null
} else {
  amount = Number(val) || 0;
}
```

**Problem**: Frontend accesses `dealData?.originalPrice` which is never set by API

**Required Fix** (in /api/deals/route.js):
```javascript
// When creating a new deal
const service = services.find(s => s.id === serviceId); // Need to read services.json
const originalPrice = service?.price || 0;

const newDeal = {
  id: Date.now().toString(),
  chatId,
  customerId,
  vendorId,
  serviceId,
  originalPrice,  // ✅ ADD THIS
  customerAccepted: true,
  vendorAccepted: false,
  status: 'pending',
  createdAt: new Date().toISOString(),
  agreedAt: null,
  discountType: null,   // ✅ ADD THIS
  discountValue: null,  // ✅ ADD THIS
  discountAmount: null, // ✅ ADD THIS
  finalPrice: originalPrice, // ✅ ADD THIS
  discountAppliedAt: null    // ✅ ADD THIS
};
```

---

## Issue 3: customerAccepted Logic Bug

**Severity**: 🔴 CRITICAL

**Location**: [src/app/api/deals/route.js#L97](src/app/api/deals/route.js#L97)

**Current Code**:
```javascript
const newDeal = {
  id: Date.now().toString(),
  chatId,
  customerId,
  vendorId,
  serviceId,
  customerAccepted: customerId === customerId ? true : false,  // ❌ BUG
  vendorAccepted: false,
  status: 'pending',
  createdAt: new Date().toISOString(),
  agreedAt: null
};
```

**Problem**: 
- `customerId === customerId` is always true
- Should be: customer who initiated the deal always accepts
- Can't distinguish who initiated the deal

**Required Fix**:
```javascript
const newDeal = {
  id: Date.now().toString(),
  chatId,
  customerId,
  vendorId,
  serviceId,
  customerAccepted: true,  // ✅ Customer is initiating, so always true
  vendorAccepted: false,   // Vendor hasn't accepted yet
  status: 'pending',
  createdAt: new Date().toISOString(),
  agreedAt: null
};
```

---

## Issue 4: Chat Lookup Inconsistency

**Severity**: 🟡 MAJOR

**Location**: [src/app/api/chat/route.js](src/app/api/chat/route.js)

**GET Method** (Line 22-27):
```javascript
const chatRoom = chats.find(
  c => c.serviceId === serviceId && c.customerId === customerId
);
// Searches by: serviceId + customerId
```

**POST Method** (Line 54-56):
```javascript
let chatRoom = chats.find(
  c => c.serviceId === serviceId && c.customerId === customerId
);

if (!chatRoom) {
  chatRoom = {
    id: Date.now().toString(),  // ← ID created as timestamp
    serviceId,
    serviceTitle,
    vendorId,
    vendorName,
    customerId,
    customerName,
    messages: [],
    createdAt: new Date().toISOString(),
    dealStatus: null
  };
  chats.push(chatRoom);
}
```

**Problem**: 
- Logic is consistent (both use serviceId + customerId)
- But the ID is Date.now() instead of a consistent key
- If same user sends 2 messages to same service, could create 2 chat rooms

**Risk Scenario**:
1. Customer sends message at 14:31 → Chat created with id "1775934661453"
2. Customer sends another message at 14:32 (before GET finishes) → New chat room created with id "1775934661514"
3. Now two chat rooms exist for same service+customer pair

**Required Fix** (Option A - Better):
```javascript
const chatRoomId = `${serviceId}_${customerId}`; // Deterministic ID

let chatRoom = chats.find(c => c.id === chatRoomId);

if (!chatRoom) {
  chatRoom = {
    id: chatRoomId,  // ✅ Consistent, deterministic ID
    serviceId,
    serviceTitle,
    // ...
  };
  chats.push(chatRoom);
}
```

**Or Option B** (Keep current, just consistent):
```javascript
let chatRoom = chats.find(
  c => c.serviceId === serviceId && c.customerId === customerId
);
// Always search by serviceId + customerId, not by ID
// This is currently working, but risky with Date.now() IDs
```

---

## Issue 5: No Real-Time Message Updates

**Severity**: 🟡 MAJOR

**Location**: 
- [src/app/customer/chats/page.js](src/app/customer/chats/page.js) (no polling/websocket)
- [src/app/vendor/chats/page.js](src/app/vendor/chats/page.js) (no polling/websocket)

**Current Behavior**:
```javascript
// Customer sends message
const sendMessage = async () => {
  const response = await fetch('/api/chat', { /* ... */ });
  const data = await response.json();
  setMessages(data.data.messages || []);  // Only updates from response
  // No automatic refresh
};

// Vendor sends message
const sendMessage = async () => {
  const response = await fetch('/api/chat', { /* ... */ });
  const data = await response.json();
  setMessages(data.data.messages || []);  // Only updates from response
  // No automatic refresh
};
```

**Problem**: 
- Messages only update when current user sends a message
- If vendor receives message from customer, customer doesn't see vendor's response until they send another message
- Requires manual page refresh to see new messages

**Quick Fix (Polling)**:
```javascript
useEffect(() => {
  if (!selectedChat) return;

  const interval = setInterval(async () => {
    try {
      const response = await fetch(
        `/api/chat?serviceId=${selectedChat.serviceId}&customerId=${selectedChat.customerId}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        setMessages(data.data.messages || []);
        setSelectedChat(data.data);
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }, 2000);  // Poll every 2 seconds

  return () => clearInterval(interval);
}, [selectedChat]);
```

**Better Fix (WebSocket)**: Requires backend WebSocket server implementation

---

## Issue 6: Notification Errors Silently Fail

**Severity**: 🟠 MINOR

**Location**: [src/app/api/deals/route.js#L6-L23](src/app/api/deals/route.js#L6-L23)

**Current Code**:
```javascript
async function createNotification(userId, type, message, relatedId, relatedData = {}) {
  try {
    const notificationsPath = path.join(process.cwd(), 'notifications.json');
    const data = await fs.readFile(notificationsPath, 'utf-8');
    const notifications = JSON.parse(data);

    const newNotification = {
      id: `notif_${Date.now()}`,
      userId,
      type,
      message,
      relatedId,
      relatedData,
      read: false,
      createdAt: new Date().toISOString()
    };

    notifications.push(newNotification);
    await fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2));

    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // ❌ Error is silently caught, deal still succeeds
  }
}
```

**Problem**: 
- Notifications fail silently
- Deal processing succeeds even if notification fails
- User never knows notification wasn't created

**Usage**:
```javascript
// Called but error is ignored
await createNotification(
  vendorId,
  'deal_pending',
  'Ada penawaran baru dari customer',
  chatId,
  { customerId, serviceId }
);

// Deal returns success even if notification failed!
return NextResponse.json({
  success: true,
  message: 'Penawaran dikirim, menunggu vendor menerima',
  data: { deal: newDeal, chat: chatRoom }
}, { status: 201 });
```

**Required Fix**:
```javascript
async function createNotification(userId, type, message, relatedId, relatedData = {}) {
  try {
    const notificationsPath = path.join(process.cwd(), 'notifications.json');
    const data = await fs.readFile(notificationsPath, 'utf-8');
    const notifications = JSON.parse(data);

    const newNotification = {
      id: `notif_${Date.now()}`,
      userId,
      type,
      message,
      relatedId,
      relatedData,
      read: false,
      createdAt: new Date().toISOString()
    };

    notifications.push(newNotification);
    await fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2));

    return { success: true, notification: newNotification };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };  // ✅ Return status
  }
}

// Usage:
const notifResult = await createNotification(
  vendorId,
  'deal_pending',
  'Ada penawaran baru dari customer',
  chatId,
  { customerId, serviceId }
);

if (!notifResult.success) {
  console.warn('Notification creation failed, but deal still processing');
  // Log it or handle it somehow
}
```

---

## Issue 7: Denormalized Chat Data Can Go Stale

**Severity**: 🟡 MAJOR

**Location**: [chats.json](chats.json)

**Current Structure**:
```javascript
{
  id: "1775934661453",
  serviceId: "s1",
  serviceTitle: "Laptop Rental",  // ❌ Denormalized - can go stale
  vendorId: "1",
  vendorName: "Apple Vendor",      // ❌ Denormalized - can go stale
  customerId: "4",
  customerName: "Strawberry Customer",  // ❌ Denormalized - can go stale
  messages: [ /* ... */ ],
  createdAt: "2026-04-11T19:11:01.454Z",
  dealStatus: null
}
```

**Problem**:
- If vendor name changes in users.json → chat still shows old name
- If service title changes in services.json → chat still shows old title
- Can cause confusing UI

**Example Scenario**:
1. Vendor "Apple Vendor" creates service "Laptop Rental"
2. Customer sends message → chat stored with vendorName: "Apple Vendor"
3. Vendor changes name to "Premium Laptops LLC" in settings
4. Customer's chat list still shows "Apple Vendor" (stale data)

**Recommended Fix**:
```javascript
// Don't store denormalized data
{
  id: "1775934661453",
  serviceId: "s1",    // Lookup service title from services.json
  vendorId: "1",      // Lookup vendor name from users.json
  customerId: "4",    // Lookup customer name from users.json
  messages: [ /* ... */ ],
  createdAt: "2026-04-11T19:11:01.454Z",
  dealStatus: null
  // Removed: serviceTitle, vendorName, customerName
}
```

**Or, if denormalization needed for performance**:
Add a flag to track if data needs refresh:
```javascript
{
  // ... all fields ...
  _metadata: {
    lastUpdated: "2026-04-23T14:40:21.925Z",
    serviceTitle: "Laptop Rental",
    vendorName: "Apple Vendor",
    customerName: "Strawberry Customer"
  }
}
```

---

## Issue 8: No Input Validation for Discount Values

**Severity**: 🟠 MINOR

**Location**: [src/app/vendor/chats/page.js#L466-L468](src/app/vendor/chats/page.js#L466-L468)

**Current Code**:
```javascript
<input 
  value={discountValue} 
  onChange={(e) => setDiscountValue(e.target.value)} 
  // No validation!
/>
```

**Frontend Validation Issue**:
```javascript
// Vendor could enter:
// - Negative discount: -50 (price goes up?)
// - 200% discount (price becomes negative)
// - Non-numeric values
```

**Required Fix**:
```javascript
<input
  type="number"
  min="0"
  max={discountType === 'percent' ? '100' : originalPrice}
  value={discountValue}
  onChange={(e) => {
    let val = parseFloat(e.target.value) || 0;
    
    // Validate range
    if (discountType === 'percent') {
      val = Math.max(0, Math.min(100, val));
    } else {
      val = Math.max(0, Math.min(originalPrice, val));
    }
    
    setDiscountValue(val.toString());
  }}
/>
```

**Backend Validation** (in apply-discount handler):
```javascript
if (action === 'apply-discount') {
  const { discountType, discountValue } = body;
  
  if (!discountType || !['percent', 'fixed'].includes(discountType)) {
    return NextResponse.json({
      success: false,
      message: 'Tipe diskon harus percent atau fixed'
    }, { status: 400 });
  }
  
  if (typeof discountValue !== 'number' || discountValue < 0) {
    return NextResponse.json({
      success: false,
      message: 'Nilai diskon harus angka positif'
    }, { status: 400 });
  }
  
  if (discountType === 'percent' && discountValue > 100) {
    return NextResponse.json({
      success: false,
      message: 'Diskon persen tidak boleh lebih dari 100%'
    }, { status: 400 });
  }
  
  const originalPrice = /* get from service */;
  if (discountType === 'fixed' && discountValue > originalPrice) {
    return NextResponse.json({
      success: false,
      message: 'Diskon tetap tidak boleh lebih dari harga'
    }, { status: 400 });
  }
  
  // ... continue with discount application
}
```

---

## Summary of All Issues

| # | Issue | Severity | Status |
|-|-------|----------|--------|
| 1 | Missing apply-discount handler | 🔴 | ❌ Broken |
| 2 | Missing originalPrice field | 🔴 | ❌ Broken |
| 3 | customerAccepted logic bug | 🔴 | ⚠️ Logic error |
| 4 | Chat lookup inconsistency | 🟡 | ⚠️ Risk |
| 5 | No real-time updates | 🟡 | ❌ Missing |
| 6 | Notification errors silent | 🟠 | ⚠️ Poor UX |
| 7 | Denormalized data stale | 🟡 | ⚠️ Risk |
| 8 | No discount validation | 🟠 | ⚠️ Weak |

