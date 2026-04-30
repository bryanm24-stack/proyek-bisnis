# 🧪 AVAILABILITY - TESTING & EXTENSION GUIDE

## Quick Test Commands

### Test 1: Validate Availability (Available Stock)

```bash
curl -X POST http://localhost:3000/api/availability/validate \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "1704067202000",
    "quantity": 10,
    "startDate": "2026-05-01",
    "endDate": "2026-05-05"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Stok tersedia",
  "available": true,
  "availableQuantity": 120,
  "totalQuantity": 120,
  "bookedQuantity": 0
}
```

---

### Test 2: Get All Bookings for Service

```bash
curl http://localhost:3000/api/availability/reserve?serviceId=1704067202000
```

**Expected Result:**
```json
{
  "success": true,
  "service": {
    "id": "1704067202000",
    "title": "Paket Kursi & Meja Serbaguna",
    "quantity": 120,
    "availableQuantity": 120
  },
  "bookings": [],
  "total": 0
}
```

---

### Test 3: Create Booking Manually

```bash
curl -X POST http://localhost:3000/api/availability/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "1704067202000",
    "transactionId": "TRX-TEST-001",
    "dealId": "DEAL-TEST-001",
    "quantity": 50,
    "startDate": "2026-05-01",
    "endDate": "2026-05-05",
    "status": "confirmed"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Booking berhasil dibuat dan diresevasi",
  "booking": {
    "id": "BOOKING-1234567890",
    "transactionId": "TRX-TEST-001",
    "dealId": "DEAL-TEST-001",
    "quantity": 50,
    "startDate": "2026-05-01",
    "endDate": "2026-05-05",
    "status": "confirmed",
    "createdAt": "2026-04-30T12:00:00Z"
  },
  "service": {
    "totalQuantity": 120,
    "bookedQuantity": 50,
    "availableQuantity": 70
  }
}
```

---

### Test 4: Verify Availability After Booking

```bash
# After booking 50 units for 2026-05-01 to 2026-05-05
curl -X POST http://localhost:3000/api/availability/validate \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "1704067202000",
    "quantity": 30,
    "startDate": "2026-05-01",
    "endDate": "2026-05-05"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "available": true,
  "availableQuantity": 70,
  "requestedQuantity": 30,
  "bookedQuantity": 50
}
```

---

### Test 5: Test Insufficient Stock

```bash
# Trying to book more than available
curl -X POST http://localhost:3000/api/availability/validate \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "1704067202000",
    "quantity": 100,
    "startDate": "2026-05-01",
    "endDate": "2026-05-05"
  }'
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Stok tidak mencukupi. Tersedia: 70, diminta: 100",
  "available": false,
  "availableQuantity": 70,
  "requestedQuantity": 100
}
```

---

### Test 6: Test Different Date Range (No Overlap)

```bash
# Booking different period - should not affect each other
curl -X POST http://localhost:3000/api/availability/validate \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "1704067202000",
    "quantity": 80,
    "startDate": "2026-05-06",
    "endDate": "2026-05-10"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "available": true,
  "availableQuantity": 120,
  "message": "Stok tersedia"
}
```

---

### Test 7: Update Booking Status

```bash
# Cancel a booking
curl -X PUT http://localhost:3000/api/availability/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "1704067202000",
    "bookingId": "BOOKING-1234567890",
    "newStatus": "cancelled"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Status booking berhasil diubah dari confirmed ke cancelled",
  "booking": {
    "id": "BOOKING-1234567890",
    "status": "cancelled",
    "updatedAt": "2026-04-30T12:30:00Z"
  },
  "availableQuantity": 120
}
```

---

## 🧬 Code Extension Guide

### Adding New Booking Status

File: `src/app/api/availability/reserve/route.js`

Current status types: `pending`, `confirmed`, `cancelled`, `completed`

To add new status:
```javascript
// 1. Update validation in PUT handler
const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'NEW_STATUS'];

if (!validStatuses.includes(newStatus)) {
  return NextResponse.json({
    success: false,
    message: 'Invalid status'
  }, { status: 400 });
}

// 2. Update availableQuantity calculation logic if needed
for (const booking of service.bookings) {
  if (booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'NEW_STATUS') {
    bookedQuantity += booking.quantity || 0;
  }
}
```

---

### Adding Booking Limit Per User

File: `src/app/api/availability/validate/route.js`

```javascript
// Add to POST handler before availability check
const body = await request.json();

// Check if user has too many active bookings
if (body.userId) {
  const userBookings = service.bookings.filter(b => 
    b.customerId === body.userId && b.status === 'confirmed'
  );
  
  const MAX_BOOKINGS_PER_USER = 5;
  if (userBookings.length >= MAX_BOOKINGS_PER_USER) {
    return NextResponse.json({
      success: false,
      message: `Maximum ${MAX_BOOKINGS_PER_USER} active bookings per user`
    }, { status: 400 });
  }
}
```

---

### Adding Minimum Stock Reserve

File: `src/app/api/availability/validate/route.js`

```javascript
// Add to availability calculation
const totalQuantity = Number(service.quantity) || 0;
const MINIMUM_RESERVE = 5; // Always keep 5 in stock

const effectiveAvailable = totalQuantity - MINIMUM_RESERVE - bookedQuantity;

if (effectiveAvailable < requestedQuantity) {
  return NextResponse.json({
    success: false,
    message: `Insufficient stock. Available: ${Math.max(0, effectiveAvailable)}, Requested: ${requestedQuantity}`,
    available: false,
    availableQuantity: Math.max(0, effectiveAvailable)
  }, { status: 400 });
}
```

---

### Adding Booking Time Window (e.g., min 3 days)

File: `src/app/api/availability/reserve/route.js`

```javascript
// Add to POST handler
const { startDate, endDate } = body;
const start = new Date(startDate);
const end = new Date(endDate);
const days = (end - start) / (1000 * 60 * 60 * 24);

const MIN_DURATION_DAYS = 3;
if (days < MIN_DURATION_DAYS) {
  return NextResponse.json({
    success: false,
    message: `Minimum rental duration is ${MIN_DURATION_DAYS} days`
  }, { status: 400 });
}
```

---

### Adding Price-based Availability (Premium Tier)

File: `src/app/transaction/payment/page.js`

```javascript
// Add to checkAvailability function
const response = await fetch('/api/availability/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceId: deal?.serviceId || deal?.id,
    quantity: Number(qty),
    startDate: startDt,
    endDate: endDateStr,
    userTier: user?.tier, // Add tier info
    priceMultiplier: appliedPromo?.priceMultiplier // Add promo
  })
});
```

---

### Adding Booking History Tracking

File: `src/app/api/availability/reserve/route.js`

```javascript
// Add field to booking record
const newBooking = {
  id: `BOOKING-${Date.now()}`,
  transactionId: transactionId,
  dealId: dealId,
  quantity: Number(quantity),
  startDate: startDate,
  endDate: endDate,
  status: status,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  
  // NEW FIELDS
  createdBy: request.user?.id, // Track who created
  history: [{
    status: status,
    timestamp: new Date().toISOString(),
    reason: 'Initial booking'
  }]
};

// When updating status:
booking.history.push({
  status: newStatus,
  timestamp: new Date().toISOString(),
  reason: body.reason || 'Status updated'
});
```

---

### Adding Calendar View Component

New File: `src/app/components/BookingCalendar.js`

```javascript
'use client';

import React, { useState, useEffect } from 'react';

export default function BookingCalendar({ serviceId }) {
  const [bookings, setBookings] = useState([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    const fetchBookings = async () => {
      const response = await fetch(`/api/availability/reserve?serviceId=${serviceId}`);
      const data = await response.json();
      setBookings(data.bookings || []);
    };
    fetchBookings();
  }, [serviceId]);

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const isDateBooked = (day) => {
    const checkDate = new Date(month.getFullYear(), month.getMonth(), day);
    return bookings.some(booking => {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      return checkDate >= start && checkDate <= end && booking.status === 'confirmed';
    });
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
      <h3>Kalender Ketersediaan</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
        {Array.from({ length: 42 }).map((_, index) => {
          const day = index - firstDay + 1;
          const isCurrentMonth = day > 0 && day <= daysInMonth(month);
          const isBooked = isCurrentMonth && isDateBooked(day);
          
          return (
            <div
              key={index}
              style={{
                padding: '10px',
                textAlign: 'center',
                background: !isCurrentMonth ? '#eee' : isBooked ? '#fee2e2' : '#dcfce7',
                borderRadius: '4px',
                color: isBooked ? '#b91c1c' : '#1f2937',
                fontWeight: isCurrentMonth ? '600' : '400'
              }}
            >
              {isCurrentMonth ? day : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Usage:
```javascript
import BookingCalendar from './components/BookingCalendar';

// In component:
<BookingCalendar serviceId={deal?.serviceId || deal?.id} />
```

---

### Adding Notification for Low Stock

File: `src/app/api/availability/validate/route.js`

```javascript
// Add notification system
if (availableQuantity < 10 && availableQuantity > 0) {
  // Create notification for admin
  // POST /api/notifications
  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'low_stock',
      serviceId: serviceId,
      message: `Stock ${service.title} tinggal ${availableQuantity} unit`,
      severity: 'warning'
    })
  });
}
```

---

## 🐛 Debugging Tips

### Check Booking Creation
```javascript
// In browser console
fetch('/api/availability/reserve?serviceId=1704067202000')
  .then(r => r.json())
  .then(data => console.log(data.bookings))
```

### Monitor Real-time Changes
```javascript
// Add to payment page
useEffect(() => {
  console.log('Availability:', availabilityCheck, availabilityMessage);
}, [availabilityCheck, availabilityMessage]);
```

### Verify Data Consistency
```javascript
// Check if services.json bookings match with transactions.json
const services = require('./services.json');
const transactions = require('./transactions.json');

services.forEach(service => {
  service.bookings.forEach(booking => {
    const transaction = transactions.find(t => t.id === booking.transactionId);
    if (!transaction) console.warn(`Missing transaction for booking ${booking.id}`);
  });
});
```

---

## 📋 Performance Optimization

### Caching Bookings
```javascript
// Add to availability/validate/route.js
const cache = new Map();

export async function POST(request) {
  const body = await request.json();
  const cacheKey = `${body.serviceId}-${body.startDate}-${body.endDate}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 5000) { // 5 second cache
      return NextResponse.json(cached.data);
    }
  }
  
  // ... existing logic ...
  
  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  return NextResponse.json(result);
}
```

---

## 🔒 Security Checklist

- [ ] Validate all input parameters (type, range, format)
- [ ] Check user authentication before modifying bookings
- [ ] Sanitize date strings to prevent injection
- [ ] Rate limit booking creation (e.g., 10 per minute per user)
- [ ] Log all booking changes for audit trail
- [ ] Validate quantity doesn't exceed maximum allowed

---

Created: 2026-04-30
Last Updated: 2026-04-30
