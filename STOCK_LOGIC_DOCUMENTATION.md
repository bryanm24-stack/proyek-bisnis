# 📊 Stock Logic Documentation

## Overview

Stock management telah di-differentiate antara **JASA** dan **BARANG** untuk logika yang lebih konsisten dan masuk akal.

---

## 🎯 Model Stock

### JASA (Service) - e.g., Fotografer, Dekorator
```json
{
  "id": "1704067200000",
  "type": "jasa",
  "title": "Paket Fotografi Profesional",
  "quantity": 3,  // ← Ada 3 fotografer/tim tersedia
  "items": [
    {
      "id": "item-foto-halfday",
      "namaJasa": "Half Day (6 jam)",
      "hargaSesi": 1200000
      // NO stok field - paket jasa tidak bisa "kehabisan"
    }
  ]
}
```

**Logic:**
- `quantity` = Jumlah provider/tim yang bisa melayani secara bersamaan
- Booking akan check: `available = service.quantity - booked_on_date`
- Saat booking di tanggal yang sama, hanya bisa max 3 (misalnya)

---

### BARANG (Goods) - e.g., Furniture, Elektronik
```json
{
  "id": "1704067202000",
  "type": "barang",
  "title": "Paket Kursi & Meja Serbaguna",
  // NO quantity field - gunakan item stok saja
  "items": [
    {
      "id": "item-kursi-modern",
      "namaBarang": "Kursi Modern Minimalis",
      "hargaPcs": 50000,
      "stok": 40  // ← 40 unit tersedia
    },
    {
      "id": "item-kursi-klasik",
      "namaBarang": "Kursi Klasik Bantalan Empuk",
      "hargaPcs": 75000,
      "stok": 30  // ← 30 unit tersedia
    },
    {
      "id": "item-meja-panjang",
      "namaBarang": "Meja Panjang (4-6 orang)",
      "hargaPcs": 150000,
      "stok": 25  // ← 25 unit tersedia
    },
    {
      "id": "item-meja-bundar",
      "namaBarang": "Meja Bundar (5-6 orang)",
      "hargaPcs": 120000,
      "stok": 15  // ← 15 unit tersedia
    }
  ]
}
```

**Logic:**
- `quantity` field TIDAK ADA di level service
- Total available = sum(items[*].stok) = 40 + 30 + 25 + 15 = 110 units
- Booking will check: `available = 110 - booked_qty`
- Stok bisa decline jika ada booking untuk items

---

## 🔄 Availability Checking Flow

### Request Data
```javascript
{
  "serviceId": "1704067202000",
  "quantity": 50,           // Berapa unit yang diminta
  "startDate": "2026-05-05",
  "endDate": "2026-05-10"   // Periode booking
}
```

### Validation Process

#### JASA Service
```
1. Get total quantity = service.quantity (e.g., 3)
2. Query bookings di periode startDate → endDate
3. booked = sum dari overlapping bookings
4. available = total - booked
5. Check: available >= requested (3 >= 2? YES ✅)
```

#### BARANG Service  
```
1. Get total quantity = sum(items[*].stok) (e.g., 110)
2. Query bookings di periode startDate → endDate
3. booked = sum dari overlapping bookings
4. available = total - booked
5. Check: available >= requested (110 >= 50? YES ✅)
```

---

## 📍 API Endpoints Updated

| Endpoint | Changes |
|----------|---------|
| `POST /api/transactions` | Distinguish JASA vs BARANG untuk availability check |
| `POST /api/availability/validate` | Check berdasarkan service type |
| `POST /api/availability/reserve` | Recalc availableQuantity dengan benar |
| `GET /api/availability/reserve` | Return correct quantity info |
| `PUT /api/availability/reserve` | Update availableQuantity correctly |

---

## 📊 Database Structure

### services.json

**JASA Record:**
```json
{
  "type": "jasa",
  "quantity": 3,          // ← Service level
  "items": [
    { "namaJasa": "...", "hargaSesi": 1200000 }  // NO stok
  ]
}
```

**BARANG Record:**
```json
{
  "type": "barang",
  // NO quantity field here
  "items": [
    { "namaBarang": "...", "hargaPcs": 50000, "stok": 40 },  // ← Item level
    { "namaBarang": "...", "hargaPcs": 75000, "stok": 30 }
  ]
}
```

### Booking Structure (Same for Both)
```json
{
  "bookings": [
    {
      "id": "BOOKING-1704067260000",
      "transactionId": "TXN-123",
      "dealId": "DEAL-456",
      "quantity": 50,        // Berapa unit di-book
      "startDate": "2026-05-05",
      "endDate": "2026-05-10",
      "status": "confirmed",
      "createdAt": "2026-05-02T10:00:00Z"
    }
  ],
  "availableQuantity": 60   // Calculated: total - booked
}
```

---

## ✅ Testing Checklist

- [ ] JASA: Book 1 quantity, check quantity = service.quantity
- [ ] JASA: Book 2 quantities same date, verify overlap check
- [ ] BARANG: Book 50 units, verify sum(items.stok) calculation
- [ ] BARANG: No `quantity` field at service level
- [ ] Availability endpoint returns correct info for both types
- [ ] UI shows correct available qty in payment page

---

## 🐛 Common Issues & Solutions

### Issue: "quantity tidak ada di BARANG service"
**Solution:** Correct! Use sum of items stok instead.

### Issue: "Booking bisa exceed available"
**Solution:** API now checks against correct total based on type.

### Issue: "availableQuantity salah hitung"
**Solution:** Recalculation considers service.type:
- JASA → `service.quantity`
- BARANG → `sum(service.items[*].stok)`

---

## 🚀 Migration Notes

If ada existing BARANG services dengan `quantity` field:
1. Backup data
2. Run migration: Remove quantity field, verify items have stok
3. Test availability checking
4. Deploy to production

