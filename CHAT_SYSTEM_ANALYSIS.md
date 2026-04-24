# Chat System - Comprehensive Analysis

**Last Updated**: April 23, 2026

## 1. COMPLETE CHAT FLOW

### Message Sending Flow (End-to-End)

```
User (Customer/Vendor) 
  ↓
Frontend Chat Page Component
  ↓
Calls POST /api/chat
  ↓
Backend Reads chats.json
  ↓
Finds or Creates Chat Room (by serviceId + customerId)
  ↓
Appends Message to messages array
  ↓
Saves chats.json
  ↓
Returns Updated Chat Room
  ↓
Frontend Updates Local State
  ↓
Messages Displayed to User
```

### Deal Flow

```
Customer Sends "Accept Deal" 
  ↓
POST /api/deals with action: 'accept'
  ↓
Check if Deal Exists in deals.json
  ↓
If NOT Exist: Create new deal (customerAccepted: true, vendorAccepted: false)
  ↓
If Exists: Update deal (vendorAccepted: true, status: 'agreed')
  ↓
Create Notification
  ↓
Return Deal + Chat Data
  ↓
Frontend Updates dealData State
  ↓
Vendor Sees "Apply Discount" Option (if status === 'agreed')
```

---

## 2. DATA STRUCTURES

### Chat Room Object (chats.json)
```javascript
{
  id: "1775934661453",                    // Timestamp-based unique ID
  serviceId: "s1",                        // Links to services.json
  serviceTitle: "Laptop Rental",          // Service name (denormalized)
  vendorId: "1",                          // Links to users.json
  vendorName: "Apple Vendor",             // Vendor name (denormalized)
  customerId: "4",                        // Links to users.json
  customerName: "Strawberry Customer",    // Customer name (denormalized)
  messages: [
    {
      id: "1775934661454",                // Timestamp-based
      senderId: "4",                      // User who sent (customer or vendor)
      senderName: "Strawberry Customer",  // Display name
      message: "halo",                    // Message text
      timestamp: "2026-04-11T19:11:01.454Z"
    }
  ],
  createdAt: "2026-04-11T19:11:01.454Z", // Chat room creation time
  dealStatus: null                        // null | 'pending' | 'agreed' | 'cancelled'
}
```

**Issues with Chat Structure:**
- Denormalized fields (serviceTitle, vendorName, customerName) can become out of sync
- `dealStatus` is stored in chat but deal data is in separate file

### Deal Object (deals.json)
```javascript
{
  id: "1775934693221",
  chatId: "1775934661453",                // Links to chats.json
  customerId: "4",
  vendorId: "1",
  serviceId: "s1",
  customerAccepted: true,                 // When customer initiates deal
  vendorAccepted: true,                   // When vendor accepts
  status: "agreed",                       // 'pending' | 'agreed' | 'cancelled'
  createdAt: "2026-04-23T14:31:31.440Z",
  agreedAt: "2026-04-23T14:31:39.581Z"
}
```

**MISSING FIELDS:**
- `originalPrice`: Original service price (needed for discount calculation)
- `discountType`: "percent" | "fixed" (not stored)
- `discountValue`: Numeric discount amount (not stored)
- `finalPrice`: Price after discount (not stored)
- `discountAppliedAt`: When discount was applied

### Service Object (services.json) - Reference
```javascript
{
  id: "s1",
  vendorId: "1",
  title: "Laptop Rental",
  price: 150000,                          // Used for deal pricing
  description: "Premium laptop for business",
  // ... other fields
}
```

### User Object (users.json) - Reference
```javascript
{
  id: "1",
  username: "apple",
  name: "Apple Vendor",
  role: "vendor",                         // 'vendor' | 'customer'
  email: "apple@rentguard.com"
}
```

---

## 3. API ENDPOINTS

### 🔵 POST /api/chat
**Purpose**: Send a message or create a new chat room

**Request Body:**
```javascript
{
  serviceId: "s1",           // REQUIRED
  serviceTitle: "Laptop Rental",  // Optional but recommended
  vendorId: "1",             // REQUIRED
  vendorName: "Apple Vendor",     // Optional but recommended
  customerId: "4",           // REQUIRED
  customerName: "Strawberry Customer", // Optional but recommended
  message: "halo",           // REQUIRED - message text
  senderId: "4",             // Optional - if not provided, uses customerId
  senderName: "Strawberry Customer"    // Optional - if not provided, uses customerName
}
```

**Response (201 Created or existing chat updated):**
```javascript
{
  success: true,
  message: "Pesan berhasil dikirim",
  data: {
    // ... Full chat room object with updated messages
  }
}
```

**Logic:**
1. Reads chats.json
2. Searches for chat room: `serviceId === serviceId AND customerId === customerId`
3. If NOT found: Creates new chat room with empty messages array
4. Appends new message to messages array
5. Writes chats.json
6. Returns updated chat room

---

### 🔵 GET /api/chat
**Purpose**: Get single chat conversation

**Query Parameters:**
- `serviceId` (required)
- `customerId` (required)

**Response:**
```javascript
{
  success: true,
  data: {
    // Chat room object or null if not found
  }
}
```

---

### 🔵 GET /api/customer/chats
**Purpose**: Get all chats where user is a customer

**Query Parameters:**
- `customerId` (required)

**Response:**
```javascript
{
  success: true,
  data: [
    // Array of chat rooms where customerId matches
  ]
}
```

---

### 🔵 GET /api/vendor/chats
**Purpose**: Get all chats for a vendor

**Query Parameters:**
- `vendorId` (required)

**Response:**
```javascript
{
  success: true,
  data: [
    // Chats where vendorId === vendorId OR customerId === vendorId
    // (allows vendors to chat with each other as customers)
  ]
}
```

---

### 🔵 POST /api/deals
**Purpose**: Accept, cancel, or process deals

**Request Body - Accept Action:**
```javascript
{
  action: "accept",          // REQUIRED: 'accept' | 'cancel' | 'apply-discount'
  chatId: "1775934661453",   // REQUIRED
  customerId: "4",           // REQUIRED
  vendorId: "1",             // REQUIRED
  serviceId: "s1"            // REQUIRED
}
```

**Request Body - Apply Discount Action (BROKEN):**
```javascript
{
  action: "apply-discount",  // Frontend sends this, but API doesn't handle it!
  chatId: "1775934661453",
  vendorId: "1",
  discountType: "percent",   // 'percent' | 'fixed'
  discountValue: 10          // Numeric value
}
```

**Response (Accept):**
```javascript
{
  success: true,
  message: "Penawaran dikirim, menunggu vendor menerima" | "Deal diterima! Lanjutkan ke proses transaksi.",
  data: {
    deal: { /* deal object */ },
    chat: { /* updated chat object */ },
    readyForRating: false
  }
}
```

**Response (Cancel):**
```javascript
{
  success: true,
  message: "Deal dibatalkan",
  data: chatRoom  // Chat room with dealStatus: 'cancelled'
}
```

**Logic Issues:**
- Line with bug: `customerAccepted: customerId === customerId ? true : false` (always true)
- Should be: `customerAccepted: true` (since it's the customer sending the action)

---

### 🔵 GET /api/deals
**Purpose**: Get deal status for a chat

**Query Parameters:**
- `chatId` (required)

**Response:**
```javascript
{
  success: true,
  data: { /* deal object or null */ }
}
```

---

### 🔵 GET /api/deals/all
**Purpose**: Get all deals with enriched data

**Response:**
```javascript
[
  {
    // Deal object enriched with:
    id, chatId, customerId, vendorId, serviceId, // original fields
    itemName, vendorName, totalPrice, customerName, // enriched from related objects
    description, detailDescription, rating, rentCount, price, // service details
    jenisBarang, spesifikBarang, kebijakanKerusakan, // rental details
    dendaKeterlambatan, syaratKetentuan, jumlahBarang, lokasi
  }
]
```

---

## 4. FILE LOCATIONS & RESPONSIBILITIES

### Frontend Components

| File | Responsibility |
|------|-----------------|
| [src/app/customer/chats/page.js](src/app/customer/chats/page.js) | Customer chat page - Send messages, view chats, initiate deals |
| [src/app/vendor/chats/page.js](src/app/vendor/chats/page.js) | Vendor chat page - Reply to messages, accept/cancel deals, apply discounts |

### API Routes

| File | Responsibility |
|------|-----------------|
| [src/app/api/chat/route.js](src/app/api/chat/route.js) | Core chat messaging (GET/POST) |
| [src/app/api/customer/chats/route.js](src/app/api/customer/chats/route.js) | Fetch all chats for customer (GET) |
| [src/app/api/vendor/chats/route.js](src/app/api/vendor/chats/route.js) | Fetch all chats for vendor (GET) |
| [src/app/api/deals/route.js](src/app/api/deals/route.js) | Deal management - Accept/cancel/apply-discount (POST/GET) |
| [src/app/api/deals/all/route.js](src/app/api/deals/all/route.js) | Fetch all deals with enriched data (GET) |

### Data Files (JSON)

| File | Purpose |
|------|---------|
| [chats.json](chats.json) | All chat rooms and messages |
| [deals.json](deals.json) | All deals (agreements between customer and vendor) |
| [users.json](users.json) | User accounts (referenced by chats/deals) |
| [services.json](services.json) | Service/product listings (referenced by chats/deals) |
| [notifications.json](notifications.json) | System notifications (created when deals change) |

---

## 5. POTENTIAL ISSUES & MISSING LOGIC

### 🔴 CRITICAL ISSUES

#### 1. **Discount Application Not Implemented**
- **Location**: [src/app/api/deals/route.js](src/app/api/deals/route.js) - Missing handler for `action === 'apply-discount'`
- **Problem**: Vendor applies discount on frontend, data sent to POST /api/deals, but API doesn't process it
- **Impact**: Discounts are never saved to database, customer never sees discounted price
- **Fix Needed**: 
  ```javascript
  if (action === 'apply-discount') {
    // Update deal with discount info
    // Add originalPrice, discountType, discountValue, finalPrice
  }
  ```

#### 2. **Missing originalPrice in Deal Object**
- **Location**: Multiple - [src/app/vendor/chats/page.js#L161](src/app/vendor/chats/page.js#L161)
- **Problem**: Frontend accesses `dealData?.originalPrice` which is never set by API
- **Impact**: Discount preview shows `null`, calculations fail
- **Fix Needed**: Store original service price in deal object on creation

#### 3. **customerAccepted Always True Bug**
- **Location**: [src/app/api/deals/route.js](src/app/api/deals/route.js) line ~97
- **Code**: `customerAccepted: customerId === customerId ? true : false`
- **Problem**: Always evaluates to `true`, should just be `true` (customer initiated)
- **Impact**: Can't distinguish who initiated the deal acceptance

### 🟡 MAJOR ISSUES

#### 4. **No Real-Time Updates**
- **Problem**: Messages don't auto-refresh. Page refresh needed to see new messages
- **Missing**: WebSocket connection or polling mechanism
- **Location**: [src/app/customer/chats/page.js](src/app/customer/chats/page.js) & [src/app/vendor/chats/page.js](src/app/vendor/chats/page.js)

#### 5. **Chat Room Lookup Bug**
- **Location**: [src/app/api/chat/route.js#L22-L27](src/app/api/chat/route.js#L22-L27)
- **Problem**: Chat lookup uses `serviceId + customerId` but creation uses Date.now() as ID
- **Impact**: GET might not find existing chats if using different parameters
- **Example**: 
  - Chat created: `id = "1775934661453"` 
  - GET searches by: `serviceId === "s1" AND customerId === "4"`
  - Works via find(), but inconsistent with creation logic

#### 6. **Denormalized Data Can Go Out of Sync**
- **Location**: [chats.json](chats.json) - stores serviceTitle, vendorName, customerName
- **Problem**: If service title or user name changes, chats aren't updated
- **Impact**: Stale data in chat list

#### 7. **No Deal Notifications to Customer**
- **Location**: [src/app/api/deals/route.js#L118](src/app/api/deals/route.js#L118)
- **Problem**: `apply-discount` action isn't handled, so no notification sent
- **Impact**: Customer never knows vendor applied discount

### 🟠 MINOR ISSUES

#### 8. **Missing Input Validation**
- **Location**: Multiple API routes
- **Problem**: No validation of discount value ranges (e.g., discount > 100%)
- **Example**: Vendor could apply 200% discount

#### 9. **Notification Creation Doesn't Handle Errors**
- **Location**: [src/app/api/deals/route.js#L6-L23](src/app/api/deals/route.js#L6-L23)
- **Problem**: createNotification errors are silently caught
- **Impact**: Deal succeeds but notification fails silently

#### 10. **No Chat Pagination/Pagination Limit**
- **Location**: [src/app/api/customer/chats/route.js](src/app/api/customer/chats/route.js)
- **Problem**: Loads ALL chats at once
- **Impact**: Performance issues with many chats

#### 11. **Message Timestamp vs Chat Timestamp**
- **Location**: [chats.json](chats.json)
- **Problem**: Chat has `createdAt` but messages have `timestamp` - inconsistent naming

---

## 6. COMPLETE MESSAGE SEND FLOW (TECHNICAL)

### Frontend (Customer)
```javascript
// src/app/customer/chats/page.js - sendMessage()
1. User types message in input (newMessage state)
2. User clicks "Send" button
3. Check if message is not empty: if (!newMessage.trim()) return;
4. POST /api/chat with:
   {
     serviceId: selectedChat.serviceId,
     serviceTitle: selectedChat.serviceTitle,
     vendorId: selectedChat.vendorId,
     vendorName: selectedChat.vendorName,
     customerId: user.id,                    // From localStorage
     customerName: user.name,                // From localStorage
     message: newMessage,
     senderId: user.id,                      // Who is sending
     senderName: user.name                   // Display name
   }
5. On response, update local state:
   - setMessages(data.data.messages)        // Update message list
   - setNewMessage('')                      // Clear input
   - Update chats list with new chat room
6. Messages displayed immediately in UI
```

### Backend API
```javascript
// src/app/api/chat/route.js - POST
1. Parse request body
2. Validate required fields: serviceId, vendorId, customerId, message
3. Read chats.json from disk
4. Search for existing chat:
   const chatRoom = chats.find(
     c => c.serviceId === serviceId && c.customerId === customerId
   )
5. If NOT found, create new:
   chatRoom = {
     id: Date.now().toString(),
     serviceId, serviceTitle, vendorId, vendorName,
     customerId, customerName,
     messages: [],
     createdAt: new Date().toISOString(),
     dealStatus: null
   }
   chats.push(chatRoom)
6. Append message to messages array:
   chatRoom.messages.push({
     id: Date.now().toString(),
     senderId: user.id,
     senderName: user.name,
     message: messageText,
     timestamp: new Date().toISOString()
   })
7. Write entire chats.json to disk
8. Return HTTP 201 with updated chatRoom
```

### Frontend (Receive)
```javascript
1. Receive response from POST /api/chat
2. Extract chatRoom.messages
3. Update state: setMessages(data.data.messages)
4. React re-renders message list
5. User sees new message immediately
```

---

## 7. DEAL FLOW DETAILED

### Customer Initiates Deal
```javascript
// Customer clicks "Terima Deal" button
handleDealAction('accept')
  ↓
POST /api/deals {
  action: 'accept',
  chatId, customerId, vendorId, serviceId
}
  ↓
Backend checks: does deal exist?
  ↓
NO → Create new deal:
{
  id: Date.now(),
  chatId, customerId, vendorId, serviceId,
  customerAccepted: true,
  vendorAccepted: false,
  status: 'pending',
  createdAt: now
}
  ↓
Update chat.dealStatus = 'pending'
Create notification for vendor
Return deal + chat
  ↓
Frontend:
- setDealData(deal)
- alert('Penawaran dikirim, menunggu vendor menerima')
```

### Vendor Accepts Deal
```javascript
// Vendor clicks "Terima Deal" button
handleDealAction('accept')
  ↓
POST /api/deals {
  action: 'accept',
  chatId, customerId, vendorId, serviceId
}
  ↓
Backend checks: deal exists?
  ↓
YES → Update existing deal:
{
  ...existingDeal,
  vendorAccepted: true,
  status: 'agreed',
  agreedAt: now
}
  ↓
Update chat.dealStatus = 'agreed'
Create notification for customer
Return deal + chat
  ↓
Frontend:
- setDealData(deal)
- setDiscountMode('prompt')  // Show discount UI
- alert('Deal diterima!')
```

### Vendor Applies Discount (BROKEN)
```javascript
// Vendor selects discount type and value
computePreview() // Shows preview
applyDiscount()
  ↓
POST /api/deals {
  action: 'apply-discount',          // ← API doesn't handle this!
  chatId, vendorId,
  discountType: 'percent',
  discountValue: 10
}
  ↓
❌ API returns 400: "Action harus berisi accept atau cancel"
  ↓
Frontend shows error: "Gagal menerapkan diskon"
```

---

## 8. TECH STACK

- **Framework**: Next.js 16.1.6
- **Frontend**: React 19.2.3
- **Backend**: Node.js with Next.js API Routes
- **Storage**: JSON files (chats.json, deals.json, etc.)
- **State Management**: React useState/useEffect (client-side only)
- **Authentication**: localStorage (basic, no security)

---

## 9. SUMMARY TABLE

| Component | Status | Issues |
|-----------|--------|--------|
| Chat Message Sending | ✅ Working | No real-time updates |
| Chat Retrieval | ✅ Working | Inconsistent lookup logic |
| Deal Acceptance | ✅ Working | customerAccepted logic bug |
| Discount Application | ❌ Broken | API handler missing |
| Deal Notifications | ⚠️ Partial | Only for accept/cancel, not discount |
| Message Timestamps | ✅ Working | Inconsistent naming |
| Data Normalization | ⚠️ Risky | Denormalized fields can go stale |

---

## 10. RECOMMENDED FIXES (Priority Order)

### P0 - Critical
1. Implement `/api/deals` handler for `apply-discount` action
2. Add `originalPrice` and discount fields to deal object
3. Fix `customerAccepted` logic bug in deals route

### P1 - High
4. Add real-time updates (WebSocket or polling)
5. Fix chat room lookup inconsistency
6. Add input validation for discount values

### P2 - Medium
7. Add message pagination
8. Normalize chat data (don't store serviceTitle, vendorName, etc.)
9. Improve error handling in notifications

### P3 - Low
10. Standardize field naming (timestamp vs createdAt)
11. Add deal creation timestamp to deal object
12. Add indexes to JSON files for faster lookup

