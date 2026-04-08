# 🎨 RentGuard Design Integration - Complete Implementation Guide

## Overview
Panduan step-by-step untuk mengintegrasikan Figma design ke semua pages dengan konsistensi penuh.

---

## 🎯 Design System

### Color Palette
```
Primary: #7C3AED (Purple)
Primary Light: #A855F7
Primary Dark: #5B21B6
Secondary: #1E3A8A (Dark Blue)
Success: #10B981 (Green)
Danger: #EF4444 (Red)
Neutral: #6B7280 (Gray)
Background: #F9FAFB
White: #FFFFFF
Text Dark: #1A1A1A
Text Light: #666666
```

### Gradient
```css
linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)
```

### Typography
```
Font: system-ui, -apple-system, sans-serif
Sizes: 
- Display: 48px (700)
- Heading 1: 32px (600)
- Heading 2: 28px (700)
- Heading 3: 20px (600)
- Body: 14px (400)
- Small: 12px (400)
- Label: 13px (600)
```

### Spacing
```
8px, 12px, 16px, 20px, 24px, 32px, 40px, 60px
```

### Border Radius
```
Small: 6px
Medium: 8px
Large: 12px
Rounded: 16px
Full: 50% (circles)
```

---

## 📄 PAGE-BY-PAGE IMPLEMENTATION

### 1. LOGIN PAGE ✅ DONE
- [x] Gradient background
- [x] Form with icons
- [x] Styled inputs
- [x] Gradient buttons
- [x] Error message styling
- [x] Links and dividers

**File:** `src/app/login/page.js`

---

### 2. REGISTER PAGE ✅ DONE
- [x] Gradient background
- [x] Benefits list with checkmarks
- [x] Form with icons
- [x] Terms checkbox styling
- [x] Gradient buttons
- [x] Google button

**File:** `src/app/register/page.js`

---

### 3. HOME PAGE - NAVBAR 🔄 TODO

**Location:** `src/app/components/HomePageClient.js` (Line ~220)

**Current Code:**
```javascript
<nav className="navbar">
  <div className="nav-brand">RentGuard</div>
  <div className="nav-search">...</div>
  <div className="nav-actions">
    <span>🔔</span>
    <span>❤️</span>
    <span>📋</span>
    {/* User menu... */}
  </div>
</nav>
```

**Update Needed:**
```
- [x] Update navbar styling (gradient background atau solid)
- [x] Logo: Add icon (🛡️) with text
- [x] Search bar: Improve styling
- [ ] Notification bell (🔔): 
  * Add functional component
  * Show badge with count
  * Click → Show dropdown with notifications
  * Notifications for: Deal accepted/rejected/cancelled
- [ ] Replace heart (❤️) with 💬 Chat:
  * Add click handler → Go to chat page
  * For customer: Show customer chat list
  * For vendor: Already goes to /vendor/chats
- [ ] Remove calendar (📋):
  * Delete this icon completely
- [ ] Update user profile styling:
  * Add dropdown menu
  * Better styling
```

**New Navbar HTML Structure:**
```jsx
<nav className="navbar">
  <div className="nav-left">
    <Link href="/" className="logo">
      🛡️ RentGuard
    </Link>
    <div className="nav-search">
      <input placeholder="Cari vendor, layanan sewa..." />
      <span>🔍</span>
    </div>
  </div>

  <div className="nav-right">
    {/* Notification Bell - with click handler */}
    <button className="nav-icon" onClick={handleNotificationClick}>
      🔔
      {hasNotifications && <span className="badge">{notificationCount}</span>}
    </button>

    {/* Chat Heart - with routing */}
    <button className="nav-icon" onClick={handleChatClick}>
      💬
    </button>

    {/* User Menu - dropdown */}
    {user && (
      <div className="user-menu">
        <button className="user-button" onClick={toggleUserMenu}>
          <div className="avatar">{user.name.charAt(0)}</div>
          <span>{user.name}</span>
        </button>
        {/* Dropdown menu */}
      </div>
    )}
  </div>
</nav>
```

**Styling to Add:**
```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 40px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #7c3aed;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-search {
  position: relative;
  width: 300px;
}

.nav-search input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.nav-search span {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-icon {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  position: relative;
}

.nav-icon .badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.user-menu {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 0;
}

.avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-button span {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}
```

---

### 4. HOME PAGE - SERVICE CARDS 🔄 TODO

**Location:** `src/app/components/HomePageClient.js` (Around line ~350-400)

**Current Card Structure:**
```jsx
<div className="service-card">
  <img src={service.image} />
  <div className="card-content">
    <h3>{service.title}</h3>
    <p>{service.description}</p>
    <div className="card-footer">
      <span className="rating">⭐ {service.rating}</span>
      <span className="price">{service.price}</span>
    </div>
  </div>
</div>
```

**Update Needed:**
```
- [ ] Add "Popular" badge on card
- [ ] Better image thumbnail styling
- [ ] Show vendor name (not in current design)
- [ ] Show short description (detailDescription)
- [ ] Update rating display format (4.7, with count)
- [ ] Update rent count display (1.3K disewa)
- [ ] Price formatting (Rp 500.000)
- [ ] "Lihat Detail" button (instead of text link)
- [ ] Hover effects (shadow, lift)
```

**New Card HTML:**
```jsx
<div className="service-card">
  {/* Popular Badge */}
  {isPopular && <div className="popular-badge">🔥 Populer</div>}

  {/* Image */}
  <div className="card-image">
    <img src={service.image} alt={service.title} />
  </div>

  {/* Content */}
  <div className="card-content">
    <h3 className="card-title">{service.title}</h3>
    <p className="card-vendor">{service.vendorName}</p>
    <p className="card-description">{service.detailDescription}</p>
    
    {/* Ratings & Stats */}
    <div className="card-stats">
      <div className="stat">
        <span className="rating-stars">⭐ {service.rating.toFixed(1)}</span>
        <span className="rating-count">({service.rentCount} disewa)</span>
      </div>
    </div>

    {/* Price & Button */}
    <div className="card-footer">
      <div className="price">
        <span className="label">Rp</span>
        <span className="amount">{formatPrice(service.price)}</span>
        <span className="period">/ hari</span>
      </div>
      <button className="btn-detail">Lihat Detail</button>
    </div>
  </div>
</div>
```

**Styling:**
```css
.service-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  transition: all 0.3s;
  position: relative;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  border-color: #7c3aed;
}

.popular-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  z-index: 10;
}

.card-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f3f4f6;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-content {
  padding: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #1a1a1a;
}

.card-vendor {
  font-size: 13px;
  color: #7c3aed;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.card-description {
  font-size: 13px;
  color: #666;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating-stars {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.rating-count {
  font-size: 12px;
  color: #999;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.price {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.price .label {
  font-size: 12px;
  color: #7c3aed;
  font-weight: 600;
}

.price .amount {
  font-size: 18px;
  font-weight: 700;
  color: #7c3aed;
}

.price .period {
  font-size: 12px;
  color: #999;
}

.btn-detail {
  padding: 8px 16px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-detail:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}
```

---

### 5. SERVICE DETAIL MODAL 🔄 TODO

**Update Needed:**
```
- [ ] Better modal styling (border, shadow)
- [ ] Gradient close button
- [ ] Service image larger
- [ ] Better typography hierarchy
- [ ] "Chat Vendor" button styling (prominent)
- [ ] Consistency with other modals
```

---

### 6. CHAT MODAL 🔄 TODO

**Update Needed:**
```
- [ ] Better modal styling
- [ ] Message styling consistency
- [ ] Button styling (Deal, Cancel)
- [ ] Rating form styling
- [ ] Input field styling
```

---

### 7. VENDOR CHAT PAGE (/vendor/chats/page.js) 🔄 TODO

**Update Needed:**
```
- [ ] Navbar consistency
- [ ] Sidebar styling
- [ ] Chat bubbles (already done)
- [ ] Button styling
- [ ] Input fields
```

---

### 8. VENDOR DASHBOARD (/vendor/page.js) 🔄 TODO

**Update Needed:**
```
- [ ] Navbar consistency
- [ ] Form styling
- [ ] Button styling
- [ ] Service list styling
```

---

### 9. ADMIN DASHBOARD 🔄 TODO

**Update Needed:**
```
- [ ] Navbar consistency
- [ ] Vendor list styling
- [ ] Action buttons
- [ ] Status badges
```

---

## 🔔 NOTIFICATION SYSTEM IMPLEMENTATION

### What to Build:
1. **Notification State:** Add to HomePageClient.js
2. **Notification Storage:** Create `notifications.json`
3. **Notification API:** Create `/api/notifications` endpoint
4. **UI Component:** Notification dropdown with badge
5. **Trigger Events:** When deal is accepted/rejected/cancelled

### Notification Types:
```
- Deal Accepted: "Vendor XXX menerima penawaran Anda"
- Deal Rejected: "Vendor XXX menolak penawaran Anda"
- Deal Cancelled: "Penawaran dibatalkan"
- Message Received: "Vendor XXX mengirim pesan"
```

---

## 💬 CHAT NAVIGATION IMPLEMENTATION

### What to Build:
1. **Chat Heart Handler:** Replace ❤️ with click handler
2. **Customer Side:** 
   * Option A: Go to dedicated chat list page at `/customer/chats`
   * Option B: Show chat list in modal
3. **Vendor Side:** Already at `/vendor/chats`

### Routes Needed:
```
/customer/chats - List all chats for customer
/vendor/chats - List all chats for vendor (already exists)
```

---

## 🗂️ FILES TO UPDATE

### Priority 1 (Highest):
1. `src/app/components/HomePageClient.js` - Navbar, cards, modals
2. Create notification system
3. Implement chat navigation

### Priority 2 (High):
1. `src/app/vendor/chats/page.js` - Design consistency
2. `src/app/vendor/page.js` - Design consistency

### Priority 3 (Medium):
1. Admin dashboard pages
2. Any helper pages

---

## 📋 STEP-BY-STEP CHECKLIST

### Week 1:
- [ ] Update HomePageClient navbar
- [ ] Update HomePageClient service cards
- [ ] Update modals styling
- [ ] Create notification system API

### Week 2:
- [ ] Implement notification UI
- [ ] Implement chat navigation (heart button)
- [ ] Update Vendor Dashboard
- [ ] Update Vendor Chat page

### Week 3:
- [ ] Update Admin Dashboard
- [ ] Final styling polish
- [ ] Responsive testing
- [ ] Cross-page consistency check

---

## 🎨 USEFUL CSS SNIPPETS

### Gradient Button
```css
.btn-primary {
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
}
```

### Card Hover Effect
```css
.card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}
```

### Badge
```css
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  min-width: 20px;
  padding: 0 6px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
}
```

---

## 🚀 NEXT STEPS

This guide covers all pages. Choose one section and follow the instructions carefully.

**Recommended order:**
1. Navbar (affects all pages)
2. Service cards
3. Notification system
4. Chat navigation
5. Individual pages

---

**Document Version:** 1.0
**Created:** 2026-04-08
**Status:** Ready for Implementation
