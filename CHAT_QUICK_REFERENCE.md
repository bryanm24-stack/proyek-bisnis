# Chat System - Quick Reference Guide

## 📋 API Endpoints Quick Reference

### Message APIs

| Method | Endpoint | Purpose | Required Params |
|--------|----------|---------|-----------------|
| POST | `/api/chat` | Send message or create chat | serviceId, vendorId, customerId, message |
| GET | `/api/chat` | Get single chat | serviceId, customerId |
| GET | `/api/customer/chats` | Get all customer chats | customerId |
| GET | `/api/vendor/chats` | Get all vendor chats | vendorId |

### Deal APIs

| Method | Endpoint | Purpose | Required Params | Actions |
|--------|----------|---------|-----------------|---------|
| POST | `/api/deals` | Manage deals | chatId, customerId, vendorId, serviceId | accept, cancel, apply-discount |
| GET | `/api/deals` | Get deal status | chatId | - |
| GET | `/api/deals/all` | Get all deals enriched | - | - |

---

## 🔄 Data Flow Summary

### Sending a Message
```
Frontend → POST /api/chat → Backend reads chats.json → 
Finds/creates chat room → Appends message → Saves to chats.json → Returns updated chat
```

### Creating a Deal
```
Customer clicks "Terima Deal" → 
POST /api/deals (action: accept) → 
Create new deal in deals.json → Update chat.dealStatus → 
Create notification → Return deal
```

### Accepting a Deal (Vendor)
```
Vendor clicks "Terima Deal" → 
POST /api/deals (action: accept) → 
Update existing deal → Set vendorAccepted: true, status: agreed → 
Create notification → Return deal
```

### Applying Discount (BROKEN)
```
Vendor selects discount → Clicks apply → 
POST /api/deals (action: apply-discount) → 
❌ API returns 400 error (not implemented)
```

---

## 📊 Data Structure Quick View

### Chat Room
```javascript
{
  id: string,              // Timestamp-based ID
  serviceId: string,       // Link to service
  serviceTitle: string,    // Denormalized - can be stale
  vendorId: string,        // Link to vendor user
  vendorName: string,      // Denormalized - can be stale
  customerId: string,      // Link to customer user
  customerName: string,    // Denormalized - can be stale
  messages: [              // Array of messages
    {
      id: string,
      senderId: string,
      senderName: string,
      message: string,
      timestamp: ISO8601
    }
  ],
  createdAt: ISO8601,
  dealStatus: null | 'pending' | 'agreed' | 'cancelled'
}
```

### Deal
```javascript
{
  id: string,
  chatId: string,
  customerId: string,
  vendorId: string,
  serviceId: string,
  customerAccepted: boolean,
  vendorAccepted: boolean,
  status: 'pending' | 'agreed' | 'cancelled',
  createdAt: ISO8601,
  agreedAt: ISO8601 | null,
  // MISSING:
  // originalPrice, discountType, discountValue, finalPrice, discountAppliedAt
}
```

### Message
```javascript
{
  id: string,              // Timestamp-based
  senderId: string,        // User ID (customer or vendor)
  senderName: string,      // Display name
  message: string,         // Message text
  timestamp: ISO8601       // When sent
}
```

---

## 🐛 Known Bugs Quick Checklist

- [ ] **Apply-discount not implemented** - Vendor can't save discounts
- [ ] **originalPrice missing** - Frontend discount preview breaks
- [ ] **customerAccepted always true** - Can't determine who initiated deal
- [ ] **Chat ID inconsistency** - Could create duplicate chats
- [ ] **No real-time updates** - Need page refresh to see new messages
- [ ] **Notification errors silent** - Deal succeeds even if notification fails
- [ ] **Denormalized data stale** - Name changes don't update old chats
- [ ] **No input validation** - Vendor could apply invalid discounts

---

## 🔍 Key Code Locations

### Frontend
- **Customer Chat**: [src/app/customer/chats/page.js](src/app/customer/chats/page.js)
  - `fetchCustomerChats()` - Load chats
  - `sendMessage()` - Send message via POST /api/chat
  - `handleDealAction('accept')` - Accept deal

- **Vendor Chat**: [src/app/vendor/chats/page.js](src/app/vendor/chats/page.js)
  - `fetchVendorChats()` - Load chats
  - `sendMessage()` - Send message via POST /api/chat
  - `handleDealAction('accept')` - Accept deal
  - `applyDiscount()` - Apply discount (sends to POST /api/deals) ❌ BROKEN

### Backend APIs
- **Chat Route**: [src/app/api/chat/route.js](src/app/api/chat/route.js)
  - `GET` - Get single chat by serviceId + customerId
  - `POST` - Send message or create chat room

- **Customer Chats**: [src/app/api/customer/chats/route.js](src/app/api/customer/chats/route.js)
  - `GET` - Filter chats where customerId matches

- **Vendor Chats**: [src/app/api/vendor/chats/route.js](src/app/api/vendor/chats/route.js)
  - `GET` - Filter chats where vendorId matches (as vendor or customer)

- **Deals Route**: [src/app/api/deals/route.js](src/app/api/deals/route.js)
  - `POST` - Handle accept/cancel actions ❌ Missing apply-discount
  - `GET` - Get deal by chatId

- **Deals All**: [src/app/api/deals/all/route.js](src/app/api/deals/all/route.js)
  - `GET` - Get all deals enriched with service/user data

### Data
- **Chats**: [chats.json](chats.json) - All chat rooms and messages
- **Deals**: [deals.json](deals.json) - All deals (minimal, missing discount fields)
- **Users**: [users.json](users.json) - User accounts
- **Services**: [services.json](services.json) - Service/product listings
- **Notifications**: [notifications.json](notifications.json) - System notifications

---

## 🎯 Critical Fixes Priority

### Must Fix First (P0)
1. Implement `apply-discount` handler in POST /api/deals
   - Add discount fields to deal object
   - Calculate final price
   - Create notification for customer

2. Add `originalPrice` to deal on creation
   - Read from services.json
   - Store in deal.originalPrice
   - Use for discount calculations

3. Fix `customerAccepted` bug
   - Change: `customerAccepted: customerId === customerId ? true : false`
   - To: `customerAccepted: true` (since customer initiating)

### Should Fix Soon (P1)
4. Implement real-time message updates
   - Add polling: `useEffect` with `setInterval` in chat pages
   - Or implement WebSocket for true real-time

5. Fix chat lookup inconsistency
   - Make chat IDs deterministic: `${serviceId}_${customerId}`
   - Or always search by serviceId + customerId (current logic works)

6. Improve error handling
   - Make notification creation return status
   - Log failures to console
   - Don't silently fail

### Could Improve Later (P2)
7. Add input validation for discount values
   - Validate on frontend (min 0, max 100% or price)
   - Validate on backend
   - Show error messages

8. Denormalize fix
   - Option A: Remove denormalized fields, always lookup
   - Option B: Add refresh logic to update stale data

---

## 🔗 Dependencies Between Systems

```
Chat System
  ├── Uses: users.json (lookup vendor/customer names)
  ├── Uses: services.json (lookup service title, price)
  ├── Creates: notifications.json (for deal events)
  ├── Stores: chats.json (messages, chat state)
  └── Stores: deals.json (deal state)

Frontend Pages
  ├── Customer Chat Page
  │   └── Uses: /api/customer/chats, /api/chat, /api/deals
  └── Vendor Chat Page
      └── Uses: /api/vendor/chats, /api/chat, /api/deals
```

---

## 📈 Test Scenarios

### Happy Path - Message Sending
```
1. Customer logs in
2. Customer navigates to /customer/chats
3. Customer clicks existing chat
4. Customer types message and clicks Send
5. Message sent via POST /api/chat
6. Chat updated, message appears immediately
✅ Expected: Message visible in both customer and vendor chats
```

### Happy Path - Deal Agreement (BROKEN)
```
1. Customer in chat sends message
2. Customer clicks "Terima Deal"
3. Deal created with status: 'pending'
4. Vendor receives notification
5. Vendor clicks "Terima Deal"
6. Deal updated with status: 'agreed'
7. Vendor sees discount UI
❌ BROKEN: Vendor tries to apply discount and gets 400 error
```

### Broken - Discount Application
```
1. Deal status is 'agreed'
2. Vendor selects discount type and value
3. Vendor clicks "Terapkan Diskon"
4. POST /api/deals with action: 'apply-discount'
❌ Expected: Discount saved, customer notified, deal updated
❌ Actual: 400 error "Action harus berisi accept atau cancel"
```

---

## 💡 Pro Tips for Debugging

### Check Chat Creation
```
Look in chats.json for entries with:
- serviceId
- customerId
- Note: serviceTitle, vendorName, customerName are denormalized copies
```

### Check Deal Status
```
Look in deals.json for entries with:
- chatId (links back to chats.json)
- status: 'pending' | 'agreed' | 'cancelled'
- ❌ Missing: originalPrice, discount fields
```

### Track Message Flow
```
Browser DevTools → Network tab → Filter by /api/chat
- POST requests should create new message
- Response includes full chat room with all messages
- Frontend updates local state from response
```

### Debug Discount Issue
```
1. Open vendor chat
2. Accept a deal (status becomes 'agreed')
3. Try to apply discount
4. Check Network tab → POST /api/deals
5. Will see 400 response with error about action
```

---

## 🚀 Performance Notes

**Current Bottlenecks:**
- No message pagination: all messages loaded for entire chat
- No chat pagination: all chats loaded on page load
- Reads entire chats.json/deals.json for every request
- Denormalized data requires separate lookups

**Future Optimization Ideas:**
- Add pagination to messages (load oldest first, then new on scroll)
- Add chat pagination (show first 20, load more on scroll)
- Add database indexes to JSON files
- Cache service/user data in memory
- Implement message archival (keep recent, archive old)

