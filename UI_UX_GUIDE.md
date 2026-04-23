# 🎨 Pay-After Feature - UI/UX Guide

## Payment Page - Payment Type Selection

### Before (Full Payment Only)
```
┌─────────────────────────────────────┐
│  Pilih Metode Pembayaran            │
├─────────────────────────────────────┤
│  ◉ 💳 QRIS                          │
│    Scan QR code dengan aplikasi     │
│    pembayaran Anda                  │
├─────────────────────────────────────┤
│  ○ 🏦 Debit/Credit Card             │
│    Gunakan kartu debit atau         │
│    credit card Anda                 │
└─────────────────────────────────────┘
```

### After (with Pay-After Option)
```
┌─────────────────────────────────────────────┐
│  Pilih Metode Pembayaran                    │
├─────────────────────────────────────────────┤
│  TIPE PEMBAYARAN                            │
├─────────────────────────────────────────────┤
│  ◉ 💰 Bayar Penuh                           │
│    Bayar 100% sekarang                      │
│    Rp 625,000                               │
├─────────────────────────────────────────────┤
│  ○ 🔄 Bayar Kemudian (Pay After)            │
│    Bayar 20% sekarang, sisa 80% dalam      │
│    2 hari setelah kedua belah pihak setuju │
│    📌 Uang muka (20%): Rp 125,000           │
│    📋 Sisa pembayaran (80%): Rp 500,000     │
├─────────────────────────────────────────────┤
│  ◉ 💳 QRIS                                  │
│    Scan QR code dengan aplikasi             │
│    pembayaran Anda                          │
├─────────────────────────────────────────────┤
│  ○ 🏦 Debit/Credit Card                     │
│    Gunakan kartu debit atau                 │
│    credit card Anda                         │
└─────────────────────────────────────────────┘
```

### Payment Summary Panel (Right Side)

**Full Payment Selected**:
```
┌──────────────────────────────┐
│ Ringkasan Pesanan            │
├──────────────────────────────┤
│ Subtotal       Rp 500,000    │
│ Biaya layanan  Rp 25,000     │
├──────────────────────────────┤
│ TOTAL          Rp 625,000    │
└──────────────────────────────┘
```

**Pay-After Selected**:
```
┌──────────────────────────────┐
│ Ringkasan Pesanan            │
├──────────────────────────────┤
│ Subtotal       Rp 500,000    │
│ Biaya layanan  Rp 25,000     │
├──────────────────────────────┤
│ Pembayaran Sekarang (20%)    │
│ Rp 125,000                   │
│                              │
│ Sisa pembayaran Rp 500,000   │
│ jatuh tempo dalam 2 hari     │
│ setelah deal disepakati      │
└──────────────────────────────┘
```

---

## New Page: /customer/invoices

### Invoice List View
```
┌──────────────────────────────────────────────────────┐
│  📋 Invoice yang Menunggu Pembayaran                 │
│  Daftar pembayaran 80% yang jatuh tempo              │
├──────────────────────────────────────────────────────┤
│  ┌─ INVOICE INV-1702895234 ──────────────┐          │
│  │ Status: ✅ Aktif                       │ ⏱ 1h    │
│  │         (⏱ 1h 30m tersisa)             │ 23m     │
│  ├───────────────────────────────────────┤          │
│  │ Sisa Pembayaran (80%)                 │          │
│  │ Rp 500,000                            │          │
│  │ Jatuh Tempo: 18 Desember 2024        │          │
│  ├───────────────────────────────────────┤          │
│  │ [         Bayar Sekarang          ]   │          │
│  └───────────────────────────────────────┘          │
│                                                      │
│  ┌─ INVOICE INV-1702800000 ──────────────┐          │
│  │ Status: ⚠️ SUDAH LEWAT               │          │
│  │                                       │          │
│  ├───────────────────────────────────────┤          │
│  │ Sisa Pembayaran (80%)                 │          │
│  │ Rp 450,000                            │          │
│  │ Jatuh Tempo: 15 Desember 2024        │          │
│  ├───────────────────────────────────────┤          │
│  │ [         Bayar Sekarang          ]   │          │
│  └───────────────────────────────────────┘          │
└──────────────────────────────────────────────────────┘
```

### Invoice Selected - Payment Form
```
┌──────────────────────────────────────┬─────────────┐
│  Pilih Metode Pembayaran             │ Ringkasan   │
├──────────────────────────────────────┤             │
│  ◉ 💳 QRIS                           │ Sisa        │
│    Scan QR code dengan aplikasi      │ Pembayaran  │
│    pembayaran Anda                   │ Rp 500,000  │
│                                      │             │
│  📲 Scan QR Code                     │ Jatuh Tempo │
│  ┌──────────────────┐               │ 18 Des 2024 │
│  │      📱         │               │             │
│  │   QR CODE      │               │ Rp 500,000  │
│  │      HERE      │               │ (20% down)  │
│  └──────────────────┘               │             │
│  Silahkan scan QR code dengan        │             │
│  aplikasi pembayaran Anda            │             │
├──────────────────────────────────────┤             │
│  ○ 🏦 Debit/Credit Card              │             │
│    Gunakan kartu debit atau          │             │
│    credit card Anda                  │             │
│                                      │             │
│  [Nama Pemilik Kartu             ]  │             │
│  [Nomor Kartu                    ]  │             │
│  [MM/YY]              [CVV       ]  │             │
│                                      │             │
│  ┌──────────────────────────────┐   │             │
│  │   [  💳 Bayar Sekarang   ]   │   │             │
│  │   [      ← Batal         ]   │   │             │
│  └──────────────────────────────┘   │             │
└──────────────────────────────────────┴─────────────┘
```

---

## Customer Ongoing Page - Updated Navigation

### Before
```
┌─────────────────────────────────────┐
│  [Home] [Chat] [Sedang Berlangsung] │
└─────────────────────────────────────┘
```

### After
```
┌──────────────────────────────────────────────────┐
│  [Home] [Chat] [Sedang Berlangsung] [📋 Invoice] │
└──────────────────────────────────────────────────┘
```

---

## Countdown Timer States

### Green - Plenty of Time
```
┌─────────────────────┐
│ Status: ✅ Aktif    │
│ ⏱ 2d 5h tersisa     │
└─────────────────────┘
Color: #22c55e (Green)
Background: Light green background
```

### Orange - Deadline Approaching
```
┌─────────────────────┐
│ Status: ✅ Aktif    │
│ ⏱ 12h 30m tersisa   │
└─────────────────────┘
Color: #f59e0b (Amber/Orange)
Background: Light orange background
```

### Red - Overdue
```
┌─────────────────────┐
│ Status: ⚠️ OVERDUE  │
│ (No countdown)      │
└─────────────────────┘
Color: #dc2626 (Red)
Background: Light red background
```

---

## Mobile Responsive Layout

### Mobile Payment Page
```
┌──────────────────────────────┐
│ 🛍️ RentGuard          ← Back │
├──────────────────────────────┤
│ Pilih Metode Pembayaran      │
├──────────────────────────────┤
│ ◉ 💰 Bayar Penuh            │
│   100% sekarang             │
│   Rp 625,000                │
├──────────────────────────────┤
│ ○ 🔄 Bayar Kemudian         │
│   20% sekarang: Rp 125,000  │
│   80% kemudian: Rp 500,000  │
├──────────────────────────────┤
│ ◉ 💳 QRIS                    │
│   Scan QR code              │
├──────────────────────────────┤
│ ○ 🏦 Card                    │
│   Enter card details        │
├──────────────────────────────┤
│ Ringkasan Pesanan           │
│ Subtotal: Rp 500,000        │
│ Fee:      Rp 25,000         │
│ TOTAL:    Rp 125,000        │
│ (20% only if pay-after)     │
├──────────────────────────────┤
│ [  💳 Bayar Sekarang   ]    │
└──────────────────────────────┘
```

### Mobile Invoices Page
```
┌──────────────────────────────┐
│ 📋 Invoice Pending  ← Back   │
├──────────────────────────────┤
│ ┌─ INV-1702895234 ───────┐  │
│ │ ✅ Aktif   ⏱ 1h 30m   │  │
│ │ Rp 500,000             │  │
│ │ 18 Desember 2024       │  │
│ │ [  Bayar Sekarang   ]  │  │
│ └────────────────────────┘  │
│                              │
│ ┌─ INV-1702800000 ───────┐  │
│ │ ⚠️ OVERDUE              │  │
│ │ Rp 450,000             │  │
│ │ 15 Desember 2024       │  │
│ │ [  Bayar Sekarang   ]  │  │
│ └────────────────────────┘  │
├──────────────────────────────┤
│ [Invoice Details for Mobile] │
│ When Selected:               │
│ - Show payment method picker │
│ - Full card form on screen   │
│ - Easier scrolling           │
└──────────────────────────────┘
```

---

## Color Scheme

### Status Colors
- ✅ **Active (Pending)**: Green (#22c55e)
- ⏱ **Approaching Deadline**: Orange (#f59e0b)
- ⚠️ **Overdue**: Red (#dc2626)

### UI Colors
- **Primary**: Purple (#7c3aed)
- **Success**: Green (#22c55e)
- **Info**: Blue (#2563eb)
- **Warning**: Orange (#f59e0b)
- **Danger**: Red (#dc2626)
- **Background**: Light Purple (#f5f3ff)
- **Card**: White (#ffffff)

---

## Interaction Flows

### User Flow - Select Pay-After
```
1. Customers selects "Bayar Kemudian" radio button
2. UI updates showing:
   - 📌 Down payment (20%): [amount]
   - 📋 Remaining (80%): [amount]
3. Customer selects payment method (QRIS or Card)
4. Customer submits payment
5. Success page shown
6. Invoice created automatically
```

### User Flow - Pay Invoice
```
1. Customer navigates to /customer/invoices
2. Sees list of pending invoices
3. Clicks "Bayar Sekarang" button
4. Invoice details expand and payment form shows
5. Customer selects payment method
6. Customer submits payment
7. Invoice marked as paid
8. Invoice disappears from list
9. Success message shown
```

---

## Accessibility Features

✅ **Clear Visual Hierarchy**
- Large headings (28px for page title)
- Medium subheadings (20px for sections)
- Proper contrast ratios (WCAG compliant)

✅ **Status Indicators**
- Color-coded badges (Green/Orange/Red)
- Emoji icons (✅, ⏱, ⚠️) for quick scanning
- Text labels for screen readers

✅ **Form Accessibility**
- Clear input labels
- Error messages below fields
- Disabled states for unavailable options
- Loading states on buttons

✅ **Mobile Friendly**
- Touch-friendly buttons (40px+ height)
- Readable font sizes (14px minimum)
- Responsive grid layout
- Full-width inputs on mobile

---

## Animation & Micro-interactions

### Button States
```
Normal: Background color with shadow
Hover: Slightly darker shade + slight lift
Active: Darker shade + pressed effect
Disabled: Grayed out with cursor not-allowed
Loading: Content replaced with spinner text
```

### Transitions
- All transitions: 0.2s ease-out
- Smooth color changes
- Subtle scale changes on hover
- Fade in/out for modals

### Live Updates
- Countdown timer updates every second
- Invoice status updates immediately on payment
- No page reload needed
- Smooth list removal animation

---

## Error & Success Messages

### Success Message
```
✅ Pembayaran berhasil! Invoice sudah terbayar.
[Modal Alert with OK button]
```

### Error Message
```
❌ Terjadi kesalahan saat memproses pembayaran
[Modal Alert with OK button]
```

### Validation Error
```
[Red border on input field]
Color: #dc2626 (Red)
Message: Specific error text below field
```

---

## Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | <640px | Single column, full-width |
| Tablet | 640-1024px | Single or two-column |
| Desktop | >1024px | Two-column grid layout |

---

**UI/UX Implementation**: ✅ COMPLETE  
**Responsive Design**: ✅ VERIFIED  
**Accessibility**: ✅ INCLUDED  
**Mobile Friendly**: ✅ TESTED  
