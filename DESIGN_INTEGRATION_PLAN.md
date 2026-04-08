# 🎨 Design Integration Plan - RentGuard

## Status Update

✅ **SELESAI:**
1. Login Page - Redesigned dengan Figma design (gradient, form, styling)
2. Register Page - Redesigned dengan Figma design (benefits, form styling)

## ⏳ Tahap Berikutnya (Prioritas)

Karena ini adalah task besar yang melibatkan semua pages, saya buatkan roadmap yang terstruktur:

### **Phase 1: Core Pages** (Paling Penting)

#### 1. **Home Page (HomePageClient.js)** 
**Perubahan:**
- Update navbar: Tambah notification bell, ganti heart dengan chat link, hilangkan calendar
- Update service cards dengan design Figma
- Update service detail modal dengan consistent styling
- Update chat modal styling

**File:** `src/app/components/HomePageClient.js`

#### 2. **Vendor Chat Page (/vendor/chats/page.js)**
**Perubahan:**
- Sesuaikan dengan design Figma
- Update navbar consistency
- Improve chat UI

**File:** `src/app/vendor/chats/page.js`

#### 3. **Vendor Dashboard (/vendor/page.js)**
**Perubahan:**
- Update navbar
- Form styling untuk tambah service
- Service list styling

**File:** `src/app/vendor/page.js`

#### 4. **Admin Dashboard**
**Perubahan:**
- Update vendor verification page design
- Form styling

**File:** Check admin related files

### **Phase 2: Features**

#### 1. **Notification System**
- Bell icon di navbar
- Show pending deals/cancellations
- Click notification → show detail
- Mark as read

#### 2. **Chat Navigation (Heart Button)**
- Replace heart icon dengan chat link
- For Customer: Go to `/` with chat modal open atau dedicated chat page
- For Vendor: Already implemented at `/vendor/chats`

#### 3. **Remove Calendar Icon**
- Hilangkan dari navbar
- Update icon positioning

### **Phase 3: Consistency**
- Colors: Use #7C3AED (purple) as primary throughout
- Buttons: Consistent gradient style
- Spacing: Consistent padding/margins
- Typography: System font stack

---

## 🎯 Quick Implementation Guide

### Untuk Melanjutkan, Saya Perlu:

```
USER CHOICE A: "Lanjutkan redesign Home Page sekarang"
USER CHOICE B: "Lanjutkan dengan Vendor Dashboard dulu"
USER CHOICE C: "Implementasi Notification System dulu"
USER CHOICE D: "Implementasi Chat Navigation (heart) dulu"
```

---

## 📋 Checklist untuk Setiap Page

### Home Page Requirements:
- [ ] Navbar dengan notification bell
- [ ] Navbar dengan chat heart (ganti hati asli)
- [ ] Remove calendar icon
- [ ] Service cards dengan design Figma (rating, harga, badge)
- [ ] Service detail modal styling
- [ ] Chat modal styling

### Vendor Chat Page Requirements:
- [ ] Navbar consistency
- [ ] Chat UI sesuai design
- [ ] Message bubbles proper styling

### Vendor Dashboard Requirements:
- [ ] Navbar consistency
- [ ] Form styling untuk service
- [ ] Service list presentation

### Admin Dashboard Requirements:
- [ ] Vendor verification UI
- [ ] Form styling

---

## 🔧 Technical Notes

**Primary Color:** `#7C3AED` (Purple)
**Gradient:** `linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)`
**Radius:** `8px` (standard)
**Typography:** `system-ui, -apple-system, sans-serif`
**Icons:** Emoji untuk simple icons (✉️, 🔐, 👤, etc)

---

## ⚡ Next Steps

Saya sudah siap untuk:

1. **Update Home Page** - Sesuaikan navbar, cards, modals
2. **Add Notification Bell** - Functionality untuk deal notifications
3. **Implement Chat Heart** - Navigation ke chat pages
4. **Remove Calendar** - Clean up navbar icons
5. **Update Remaining Pages** - Vendor dashboard, admin dashboard

---

## 💬 Untuk Melanjutkan:

**Silakan pilih prioritas:**

```
Option 1: "Lanjutkan Home Page redesign"
Option 2: "Setup notification system dulu"  
Option 3: "Setup chat heart navigation dulu"
Option 4: "Lanjutkan semuanya sekaligus"
```

**Saya akan mulai dengan pilihan yang Anda tentukan!**

---

## 📊 Implementation Progress

| Component | Status | Priority |
|-----------|--------|----------|
| Login Page | ✅ Done | - |
| Register Page | ✅ Done | - |
| Home Page Navbar | ⏳ TODO | HIGH |
| Home Page Cards | ⏳ TODO | HIGH |
| Service Modal | ⏳ TODO | HIGH |
| Chat Modal | ⏳ TODO | MEDIUM |
| Vendor Chat Page | ⏳ TODO | MEDIUM |
| Vendor Dashboard | ⏳ TODO | MEDIUM |
| Admin Dashboard | ⏳ TODO | LOW |
| Notification System | ⏳ TODO | HIGH |
| Chat Navigation | ⏳ TODO | HIGH |

---

**Version:** 3.0 (Design Integration Started)
**Status:** In Progress
**Created:** 2026-04-08
