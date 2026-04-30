# AVAILABILITY LOGIC - IMPLEMENTASI LENGKAP

## Ringkasan
Sistem availability logic telah diimplementasikan untuk validasi stok dan periode peminjaman barang/jasa. Sistem ini mencegah customer memesan jumlah barang lebih dari stok yang tersedia dan mencegah pemesanan untuk periode di mana barang sudah dipesan orang lain.

---

## 🎯 Fitur Utama

### 1. **Validasi Stok Real-time**
- Saat customer mengubah jumlah barang/jasa yang ingin dipinjam, sistem otomatis mengecek ketersediaan
- Menampilkan status availability (available/unavailable) dengan messaging yang jelas
- Mencegah checkout jika stok tidak mencukupi

### 2. **Validasi Periode Peminjaman**
- Saat customer memilih tanggal mulai dan durasi sewa, sistem mengecek apakah barang tersedia untuk seluruh periode tersebut
- Jika ada pemesanan yang overlap dengan periode, akan diperhitungkan dalam stok yang tersedia
- Status "confirmed" dan "pending" bookings diperhitungkan; "cancelled" dan "completed" tidak

### 3. **Automatic Booking Creation**
- Saat payment sukses, sistem otomatis membuat booking record dengan status "confirmed"
- Booking tersimpan di dalam service dengan informasi: transactionId, dealId, quantity, startDate, endDate

### 4. **Available Quantity Tracking**
- Field `availableQuantity` di setiap service diupdate secara otomatis
- Calculated sebagai: `totalQuantity - bookedQuantity`

---

## 📁 File & Struktur Data

### New API Endpoints

#### 1. **POST /api/availability/validate**
Validasi apakah barang tersedia untuk periode tertentu

```javascript
// Request
{
  "serviceId": "1704067202000",
  "quantity": 10,
  "startDate": "2026-05-01",
  "endDate": "2026-05-05"
}

// Success Response (200)
{
  "success": true,
  "message": "Stok tersedia",
  "available": true,
  "availableQuantity": 50,
  "requestedQuantity": 10,
  "totalQuantity": 120,
  "bookedQuantity": 70,
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-05"
}

// Error Response (400)
{
  "success": false,
  "message": "Stok tidak mencukupi. Tersedia: 5, diminta: 10",
  "available": false,
  "availableQuantity": 5,
  "requestedQuantity": 10,
  "totalQuantity": 120,
  "bookedQuantity": 115
}
```

#### 2. **POST /api/availability/reserve**
Membuat booking record untuk mereservasi barang

```javascript
// Request
{
  "serviceId": "1704067202000",
  "transactionId": "TRX-1234567890",
  "dealId": "1776954691440",
  "quantity": 10,
  "startDate": "2026-05-01",
  "endDate": "2026-05-05",
  "status": "confirmed" // default: "confirmed"
}

// Response (201)
{
  "success": true,
  "message": "Booking berhasil dibuat dan diresevasi",
  "booking": {
    "id": "BOOKING-1234567890",
    "transactionId": "TRX-1234567890",
    "dealId": "1776954691440",
    "quantity": 10,
    "startDate": "2026-05-01",
    "endDate": "2026-05-05",
    "status": "confirmed",
    "createdAt": "2026-04-30T12:00:00Z",
    "updatedAt": "2026-04-30T12:00:00Z"
  },
  "service": {
    "id": "1704067202000",
    "title": "Paket Kursi & Meja Serbaguna",
    "totalQuantity": 120,
    "bookedQuantity": 80,
    "availableQuantity": 40
  }
}
```

#### 3. **GET /api/availability/reserve?serviceId=xxx**
List semua bookings untuk service tertentu

```javascript
// Response (200)
{
  "success": true,
  "service": {
    "id": "1704067202000",
    "title": "Paket Kursi & Meja Serbaguna",
    "quantity": 120,
    "availableQuantity": 40
  },
  "bookings": [
    {
      "id": "BOOKING-1234567890",
      "transactionId": "TRX-1234567890",
      "dealId": "1776954691440",
      "quantity": 10,
      "startDate": "2026-05-01",
      "endDate": "2026-05-05",
      "status": "confirmed",
      "createdAt": "2026-04-30T12:00:00Z"
    },
    // ... more bookings
  ],
  "total": 2
}
```

#### 4. **PUT /api/availability/reserve**
Update status booking (untuk cancel/complete/etc)

```javascript
// Request
{
  "serviceId": "1704067202000",
  "bookingId": "BOOKING-1234567890",
  "newStatus": "cancelled" // atau "completed"
}

// Response (200)
{
  "success": true,
  "message": "Status booking berhasil diubah dari confirmed ke cancelled",
  "booking": { ... },
  "availableQuantity": 50
}
```

### Modified Files

#### 1. **services.json**
Setiap service sekarang memiliki:
```json
{
  "id": "1704067202000",
  "title": "Paket Kursi & Meja Serbaguna",
  "quantity": 120,
  "availableQuantity": 120,
  "bookings": [
    {
      "id": "BOOKING-1234567890",
      "transactionId": "TRX-1234567890",
      "dealId": "1776954691440",
      "quantity": 10,
      "startDate": "2026-05-01",
      "endDate": "2026-05-05",
      "status": "confirmed",
      "createdAt": "2026-04-30T12:00:00Z",
      "updatedAt": "2026-04-30T12:00:00Z"
    }
  ]
  // ... other fields
}
```

#### 2. **src/app/api/transactions/route.js**
- Tambahan: Validasi availability sebelum payment diproses
- Tambahan: Auto-create booking record saat payment status = 'success'

#### 3. **src/app/transaction/payment/page.js**
- Tambahan: Real-time availability checking saat quantity/duration/startDate berubah
- Tambahan: Menampilkan availability status badge (available/unavailable/checking)
- Tambahan: Validasi availability sebelum submit payment

---

## 🔄 Flow Pemesanan Dengan Availability

```
1. Customer membuka halaman payment (/transaction/payment?dealId=xxx)
   ↓
2. Customer mengubah quantity/duration/startDate
   ↓
3. → checkAvailability() dipanggil (debounce 500ms)
   ↓
4. → Panggil /api/availability/validate
   ↓
5. → API cek overlapping bookings dari service.bookings[]
   ↓
6. → Response dengan available/unavailable status
   ↓
7. Tampilkan status availability badge:
   - ✅ Stok tersedia: X dari Y unit (available)
   - ❌ Stok tidak mencukupi (unavailable)
   - ⏳ Memeriksa ketersediaan... (checking)
   ↓
8. Jika available, customer bisa lanjut ke pembayaran
   ↓
9. Customer klik "Bayar" → handlePayment()
   ↓
10. → Validasi: availabilityCheck !== 'available' ? reject : proceed
    ↓
11. → Buat transactionData dengan serviceId, quantity, startDate, endDate
    ↓
12. → POST /api/transactions
    ↓
13. → API transactions:
    - Final availability check
    - Jika tidak available: return 400 error
    - Jika available: proceed
    - Create booking record via internal logic
    - Return success
    ↓
14. Redirect ke /transaction/success
    ↓
15. Booking sudah di-create dengan status "confirmed"
    ↓
16. Jika order dibatalkan nanti, update booking status ke "cancelled"
```

---

## 🧪 Testing

### Test Case 1: Available Stock
```
1. Service: "Paket Kursi & Meja Serbaguna" (quantity: 120)
2. Quantity: 10
3. Start Date: 2026-05-01
4. Duration: 5 hari
5. Expected: ✅ Stok tersedia: 120 dari 120 unit
6. Can proceed: Yes
```

### Test Case 2: Stock Fully Booked
```
1. Service: "Paket Kursi & Meja Serbaguna" (quantity: 120)
2. Existing booking: 120 unit from 2026-05-01 to 2026-05-05
3. New request: 10 unit from 2026-05-01 to 2026-05-05
4. Expected: ❌ Stok tidak mencukupi. Tersedia: 0, diminta: 10
5. Can proceed: No
```

### Test Case 3: Partial Stock Available
```
1. Service: "Paket Kursi & Meja Serbaguna" (quantity: 120)
2. Existing booking: 115 unit from 2026-05-01 to 2026-05-05
3. New request: 10 unit from 2026-05-01 to 2026-05-05
4. Expected: ❌ Stok tidak mencukupi. Tersedia: 5, diminta: 10
5. Can proceed: No
```

### Test Case 4: Different Date Range (No Overlap)
```
1. Service: "Paket Kursi & Meja Serbaguna" (quantity: 120)
2. Existing booking: 100 unit from 2026-05-01 to 2026-05-05
3. New request: 30 unit from 2026-05-06 to 2026-05-10
4. Expected: ✅ Stok tersedia: 120 dari 120 unit (karena periode berbeda)
5. Can proceed: Yes
```

### Test Case 5: Partial Overlap
```
1. Service: "Paket Kursi & Meja Serbaguna" (quantity: 120)
2. Existing booking: 100 unit from 2026-05-01 to 2026-05-05
3. New request: 30 unit from 2026-05-04 to 2026-05-08
4. Expected: ❌ Stok tidak mencukupi. Tersedia: 20, diminta: 30
5. Can proceed: No
```

---

## 📝 Booking Status

- **pending**: Booking sudah dibuat tapi belum confirmed (untuk pay_after scenarios)
- **confirmed**: Booking confirmed, barang sudah dipesan untuk periode tersebut
- **cancelled**: Booking dibatalkan, barang available lagi
- **completed**: Peminjaman selesai, barang sudah dikembalikan

Hanya `confirmed` dan `pending` yang dihitung saat validasi. `cancelled` dan `completed` tidak.

---

## ⚙️ Implementasi Detail

### Client-side (payment/page.js)
```javascript
// State
const [availabilityCheck, setAvailabilityCheck] = useState(null);
const [availabilityMessage, setAvailabilityMessage] = useState('');

// Function
const checkAvailability = async (qty, duration, startDt) => {
  // Call /api/availability/validate
  // Update state dengan result
}

// Effect
useEffect(() => {
  const timer = setTimeout(() => {
    checkAvailability(quantity, durationDays, startDate);
  }, 500); // debounce
  return () => clearTimeout(timer);
}, [quantity, durationDays, startDate, deal]);

// Validation pada submit
const handlePayment = async (e) => {
  if (availabilityCheck !== 'available') {
    alert('❌ Barang tidak tersedia untuk periode ini');
    return;
  }
  // proceed with payment
}
```

### Server-side (transactions/route.js)
```javascript
// Availability check sebelum payment
if (body.serviceId && body.quantity && body.startDate) {
  // Validasi stok
  // Jika tidak available: return error 400
}

// Auto-create booking setelah payment success
if (body.status === 'success' && body.serviceId && body.quantity) {
  // Create booking record
  // Update availableQuantity
}
```

---

## 🔐 Keamanan & Edge Cases

1. **Race Condition**: Dua request pembayaran simultan
   - Solusi: Availability check di server-side transactions API sebelum booking dicreate
   
2. **Manual JSON Edit**: User edit services.json langsung
   - Solusi: Validasi API setiap kali ada booking/cancel

3. **Negative Quantity**: 
   - Solusi: MIN validation di form + parseInt validation di API

4. **Invalid Date Range**:
   - Solusi: Validasi startDate < endDate di API

5. **Timezone Issues**:
   - Solusi: Semua date string dalam format YYYY-MM-DD, timezone-agnostic

---

## 📊 Monitoring & Debugging

### Log Points
```javascript
// transactions/route.js
console.log(`AVAILABILITY CHECK FAILED: Service ${serviceId} - Available: ${availableQuantity}, Requested: ${quantity}`);
console.log(`Booking reserved: Transaction ${transactionId}, Service ${serviceId}, Qty: ${quantity}`);

// availability/validate/route.js
console.log(`Checking availability for Service ${serviceId}, Period: ${startDate} to ${endDate}`);
```

### Test Endpoints
```bash
# Validate availability
curl -X POST http://localhost:3000/api/availability/validate \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"1704067202000","quantity":10,"startDate":"2026-05-01","endDate":"2026-05-05"}'

# List bookings
curl http://localhost:3000/api/availability/reserve?serviceId=1704067202000

# Create booking (manual)
curl -X POST http://localhost:3000/api/availability/reserve \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"1704067202000","quantity":10,"startDate":"2026-05-01","endDate":"2026-05-05","status":"confirmed"}'
```

---

## 🚀 Future Enhancements

1. **Booking Calendar Widget**: Tampilkan grafis periode yang sudah booked
2. **Alternative Dates Suggestion**: Sarankan tanggal alternatif jika periode tidak tersedia
3. **Partial Booking**: Allow customer beli hanya item yang available + cancel sisanya
4. **Reservation Hold**: Hold booking untuk X menit sebelum payment, release jika timeout
5. **Waitlist**: Jika stok habis, customer bisa join waitlist untuk notifikasi
6. **Dynamic Pricing**: Harga bisa berbeda tergantung demand/availability

---

## 📞 Support

Jika ada error atau issue dengan availability:
1. Check `/api/availability/validate` response
2. Inspect services.json bookings array
3. Check transactions.json status
4. Review console logs untuk detail error

Created: 2026-04-30
Last Updated: 2026-04-30
