# System Architecture Diagram

## Component Hierarchy

```
App (page.js)
└── HomePageClient
    ├── Navbar
    │   ├── Search
    │   ├── Actions (🔔 ❤️ 📋)
    │   └── User Profile
    ├── Hero Section
    ├── Trust Badges
    ├── Service Grid
    │   └── Service Cards (multiple)
    │       ├── Image
    │       ├── Title
    │       ├── Vendor Name
    │       ├── Rating Badge
    │       ├── Description
    │       ├── Stats
    │       ├── Price
    │       └── "Lihat Detail" Button → {opens Detail Modal}
    ├── Detail Modal (conditional)
    │   ├── Header (Title, Close)
    │   ├── Image
    │   ├── Info Sections
    │   │   ├── Vendor Name
    │   │   ├── Rating & Reviews
    │   │   ├── Price
    │   │   └── Description
    │   └── Actions
    │       ├── "💬 Chat Vendor" Button → {opens Chat Modal}
    │       └── "Tutup" Button → {closes modal}
    └── Chat Modal (conditional)
        ├── Header (Vendor Name, Service Title, Close)
        ├── Deal Actions
        │   ├── ✅ Deal Button
        │   ├── ❌ Cancel Button
        │   └── Status Badge (dynamic)
        ├── Chat Messages Area
        │   └── Message Bubbles (customer/vendor styles)
        ├── Rating Form (conditional - shows when deal="agreed")
        │   ├── Title: "Berikan Rating & Review"
        │   ├── 5-Star Selector
        │   ├── Review TextArea
        │   └── "Kirim Rating" Button
        └── Chat Input (conditional - hides when showing rating)
            ├── Input Field
            └── "Kirim" Button
```

## Data Flow Diagram

```
USER INTERACTIONS
    │
    ├─→ Click "Lihat Detail"
    │       ↓
    │   openModal(service)
    │       ↓
    │   setModalOpen = true
    │       ↓
    │   Detail Modal Renders
    │
    ├─→ Click "💬 Chat Vendor"
    │       ↓
    │   openChatModal(service)
    │       ├─→ GET /api/chat (load history)
    │       ├─→ GET /api/deals (load deal status)
    │       ↓
    │   setChatModalOpen = true
    │       ↓
    │   Chat Modal Renders
    │
    ├─→ Type Message & Press Enter
    │       ↓
    │   sendMessage()
    │       ├─→ POST /api/chat {message data}
    │       ↓
    │   Response: {success, data: chat}
    │       ├─→ setChatData = response
    │       ├─→ setMessages = chat.messages
    │       ↓
    │   Messages re-render
    │
    ├─→ Click "✅ Deal"
    │       ↓
    │   handleDealAction('accept')
    │       ├─→ POST /api/deals {action: 'accept'}
    │       ↓
    │   Response: {success, data: {deal, chat}}
    │       ├─→ setDealData = deal
    │       ├─→ setChatData = chat
    │       │
    │       ├─ IF both parties accept:
    │       │   ├─→ setShowRatingForm = true
    │       │   └─→ Rating form renders
    │       │
    │       └─ IF still pending:
    │           └─→ Show "menunggu vendor..."
    │
    ├─→ Click Star to Rate
    │       ↓
    │   setRatingValue = clicked_star
    │       ↓
    │   Stars re-render with visual feedback
    │
    ├─→ Type Review (optional)
    │       ↓
    │   setRatingReview = text
    │       ↓
    │   TextArea updates
    │
    ├─→ Click "Kirim Rating"
    │       ↓
    │   submitRating()
    │       ├─→ POST /api/ratings {rating, review}
    │       ↓
    │   Response: {success, data: {rating, updatedService}}
    │       ├─→ Update services[] in state
    │       ├─→ setServices = updated list
    │       ├─→ closeChatModal()
    │       ↓
    │   Modal closes, service list refreshed
    │
    └─→ Click "❌ Cancel"
            ↓
        handleDealAction('cancel')
            ├─→ POST /api/deals {action: 'cancel'}
            ↓
        Response: {success, data: {deal, chat}}
            ├─→ setDealData = deal (status: cancelled)
            ├─→ setShowRatingForm = false
            ↓
        Rating form hidden, cancel irreversible
```

## API Call Sequence

```
1. CHAT MODAL OPENS
   ┌────────────────────────────────────────┐
   │ openChatModal(service)                 │
   ├────────────────────────────────────────┤
   │ GET /api/chat?serviceId=X&customerId=Y│
   │ GET /api/deals?chatId=Z                │
   └────────────────────────────────────────┘
            ↓
   Response: {chat}, {deal}
            ↓
   State: chatData, dealData, messages updated

2. SEND MESSAGE
   ┌────────────────────────────────────────┐
   │ POST /api/chat                         │
   │ {serviceId, vendorId, message, ...}    │
   └────────────────────────────────────────┘
            ↓
   Response: {data: {chatRoom with messages}}
            ↓
   State: messages updated

3. ACCEPT DEAL (CUSTOMER)
   ┌────────────────────────────────────────┐
   │ POST /api/deals                        │
   │ {action: 'accept', chatId, ...}        │
   └────────────────────────────────────────┘
            ↓
   Response: {deal: {status: 'pending'}}
   or
   Response: {deal: {status: 'agreed'}, readyForRating: true}
            ↓
   State: dealData updated, showRatingForm toggled

4. SUBMIT RATING
   ┌────────────────────────────────────────┐
   │ POST /api/ratings                      │
   │ {serviceId, rating, review, ...}       │
   └────────────────────────────────────────┘
            ↓
   Response: {data: {updatedService}}
   - rentCount: +1
   - rating: recalculated average
            ↓
   State: services[] updated, modal closes
```

## State Management Tree

```
HomePageClient Component State
│
├─ services: []
│  └─ Updated by: fetchServices(), submitRating()
│
├─ user: {id, name, email, role}
│  └─ Updated by: localStorage on mount
│
├─ selectedService: {id, title, vendorId, ...}
│  └─ Updated by: openModal(), openChatModal()
│
├─ modalOpen: boolean
│  └─ Updated by: openModal(), closeModal()
│
├─ chatModalOpen: boolean
│  └─ Updated by: openChatModal(), closeChatModal()
│
├─ chatData: {id, messages[], dealStatus, ...}
│  └─ Updated by: openChatModal(), sendMessage(), handleDealAction()
│
├─ messages: [{id, senderId, message, timestamp}, ...]
│  └─ Updated by: sendMessage() from chatData
│
├─ newMessage: string
│  └─ Updated by: onChange on input field
│
├─ dealData: {id, status, customerAccepted, vendorAccepted, ...}
│  └─ Updated by: openChatModal(), handleDealAction()
│
├─ showRatingForm: boolean
│  └─ Updated by: handleDealAction('accept'), closeChatModal()
│
├─ ratingValue: 1-5
│  └─ Updated by: onClick on star
│
└─ ratingReview: string
   └─ Updated by: onChange on textarea
```

## File I/O Operations

```
WRITE Operations
├─ chats.json ← sendMessage()
├─ deals.json ← handleDealAction()
└─ ratings.json ← submitRating()
   └─ Also triggers: services.json update (rentCount, rating)

READ Operations
├─ chats.json ← openChatModal(), sendMessage()
├─ deals.json ← openChatModal(), handleDealAction()
├─ ratings.json ← submitRating() (for calculation only)
└─ services.json ← submitRating() (for update)
```

## Feature Toggle Flow

```
Deal Status: null/undefined
├─ Show: Chat input
├─ Show: Deal buttons (enabled)
└─ Show: Rating form (NO)

Deal Status: 'pending'
├─ Show: Chat input
├─ Show: Deal buttons (disabled)
└─ Show: Rating form (NO)

Deal Status: 'agreed'
├─ Show: Chat input (NO)
├─ Show: Deal buttons (disabled)
└─ Show: Rating form (YES) ← Customer can rate here

Deal Status: 'cancelled'
├─ Show: Chat input (NO)
├─ Show: Deal buttons (disabled)
└─ Show: Rating form (NO)
```

## Error Handling Flow

```
Any API Call
    ↓
try {
    ├─ Fetch from API
    ├─ Parse response
    └─ Update state
}
catch (error) {
    ├─ console.error(error)
    ├─ alert('Gagal [operasi]')
    └─ State unchanged
}
```

## Responsive Breakpoints

```
Mobile (<768px)
└─ Chat modal: 90vw width
   Messages area: smaller padding
   Stars: smaller font

Tablet (768px - 1024px)
└─ Chat modal: 500px or 90vw (whichever smaller)

Desktop (>1024px)
└─ Chat modal: 500px fixed width
   Full styling applied
```

## Performance Optimizations

Current:
- ✅ Lazy loading services on component mount
- ✅ State consolidation (no redundant states)
- ✅ Event handlers defined once (not in render)

Future:
- [ ] Memoization of components
- [ ] Pagination for messages
- [ ] Virtual scrolling for chat
- [ ] Service list caching
- [ ] Debounce on input
