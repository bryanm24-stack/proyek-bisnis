# 📦 LOGIKA AVAILABILITY - RINGKASAN IMPLEMENTASI

## Apa yang Telah Diimplementasikan?

Anda sekarang memiliki sistem **availability checking** yang otomatis mengecek ketersediaan barang sebelum customer melakukan pembayaran.

---

## 🎯 Masalah yang Diselesaikan

### Sebelumnya:
- ❌ Customer bisa memesan 10 barang padahal hanya ada 5 stok
- ❌ Dua customer bisa memesan barang yang sama di periode yang sama
- ❌ Tidak ada tracking tentang periode peminjaman

### Sekarang:
- ✅ Sistem otomatis mengecek stok saat customer ubah jumlah
- ✅ Sistem otomatis mengecek apakah barang tersedia di periode yang diminta
- ✅ Semua pemesanan tercatat di dalam booking record dengan tanggal mulai & berakhir
- ✅ Stok tersedia otomatis diupdate setiap ada pemesanan baru atau dibatalkan

---

## 🔄 Alur Kerja Saat Customer Pesan Barang

```
1. Customer buka halaman pembayaran
                ↓
2. Ubah jumlah barang (e.g., dari 5 → 10)
                ↓
3. [OTOMATIS] Sistem cek: "Apakah ada 10 barang tersedia?"
                ↓
4. Sistem melihat ke services.json → hitung booked + available
                ↓
5. Tampilkan badge status:
   ✅ "Stok tersedia: 50 dari 120 unit" (HIJAU - Boleh lanjut)
   ❌ "Stok tidak mencukupi: 5 tersedia, 10 diminta" (MERAH - Tidak boleh lanjut)
                ↓
6. Jika hijau, customer bisa lanjut bayar
   Jika merah, customer harus ubah jumlah atau tanggal
                ↓
7. Customer klik "Bayar"
                ↓
8. [SEKALI LAGI] Sistem cek ketersediaan (final check di server)
                ↓
9. Jika available → Payment sukses + auto-create booking
   Jika tidak available → Pembayaran ditolak dengan pesan error
```

---

## 📝 Data yang Disimpan

### Di dalam `services.json` setiap barang:

```json
{
  "id": "1704067202000",
  "title": "Paket Kursi & Meja Serbaguna",
  "quantity": 120,                    // TOTAL stok
  "availableQuantity": 45,            // Stok yang masih bisa dipesan
  "bookings": [
    {
      "id": "BOOKING-1234567890",
      "transactionId": "TRX-xxx",
      "dealId": "deal-xxx",
      "quantity": 10,                 // Jumlah yang dipesan
      "startDate": "2026-05-01",      // Tanggal mulai sewa
      "endDate": "2026-05-05",        // Tanggal selesai sewa
      "status": "confirmed",           // Status: pending/confirmed/cancelled/completed
      "createdAt": "2026-04-30T12:00:00Z"
    },
    {
      "id": "BOOKING-1234567891",
      "transactionId": "TRX-yyy",
      "quantity": 65,
      "startDate": "2026-05-10",
      "endDate": "2026-05-15",
      "status": "confirmed"
    }
    // Jika ada: 120 - (10+65) = 45 tersisa
  ]
}
```

---

## 🔧 API Endpoints Baru

### 1. Cek Ketersediaan
```
POST /api/availability/validate
```
**Input:**
```json
{
  "serviceId": "1704067202000",
  "quantity": 10,
  "startDate": "2026-05-01",
  "endDate": "2026-05-05"
}
```

**Output Jika Tersedia:**
```json
{
  "success": true,
  "message": "Stok tersedia",
  "available": true,
  "availableQuantity": 50,
  "totalQuantity": 120
}
```

**Output Jika Tidak Tersedia:**
```json
{
  "success": false,
  "message": "Stok tidak mencukupi. Tersedia: 5, diminta: 10",
  "available": false,
  "availableQuantity": 5
}
```

---

### 2. Lihat Semua Booking untuk Barang Tertentu
```
GET /api/availability/reserve?serviceId=1704067202000
```

**Output:**
```json
{
  "success": true,
  "service": {
    "title": "Paket Kursi & Meja Serbaguna",
    "quantity": 120,
    "availableQuantity": 45
  },
  "bookings": [
    { ... booking 1 ... },
    { ... booking 2 ... }
  ],
  "total": 2
}
```

---

### 3. Buat Booking Baru (Otomatis saat Payment Sukses)
```
POST /api/availability/reserve
```

**Note:** Endpoint ini dipanggil otomatis oleh transactions API setelah payment berhasil. 
Customer tidak perlu panggil manual.

---

### 4. Update Status Booking (Untuk Cancel/Complete)
```
PUT /api/availability/reserve
```

**Input:**
```json
{
  "serviceId": "1704067202000",
  "bookingId": "BOOKING-1234567890",
  "newStatus": "cancelled"  // atau: "completed", "pending"
}
```

---

## 🧪 Cara Testing

### Scenario 1: Stok Tersedia (Success)
1. Buka halaman pembayaran untuk barang "Paket Kursi & Meja" (120 stok)
2. Ubah quantity menjadi 10
3. Lihat badge: ✅ "Stok tersedia: 120 dari 120 unit"
4. Bisa lanjut bayar

### Scenario 2: Stok Tidak Cukup (Failure)
1. Asumsikan sudah ada 115 barang yang dibooked
2. Coba pesan 10 barang untuk tanggal yang sama
3. Lihat badge: ❌ "Stok tidak mencukupi. Tersedia: 5, diminta: 10"
4. Tidak bisa lanjut bayar (tombol bayar akan disabled)

### Scenario 3: Periode Berbeda (Success)
1. Ada 100 barang dibooked dari 2026-05-01 s/d 2026-05-05
2. Coba pesan 30 barang dari 2026-05-06 s/d 2026-05-10
3. Lihat badge: ✅ "Stok tersedia: 120 dari 120 unit" (karena periode berbeda)
4. Bisa lanjut bayar

---

## 📊 Booking Status Dijelaskan

| Status | Artinya | Dihitung ke "Booked"? |
|--------|---------|-----|
| **pending** | Belum dikonfirmasi | ✅ Ya |
| **confirmed** | Sudah dikonfirmasi | ✅ Ya |
| **cancelled** | Sudah dibatalkan | ❌ Tidak |
| **completed** | Sudah diselesaikan | ❌ Tidak |

Jadi kalau ada booking dengan status `cancelled`, stok yang di-booking tersebut akan kembali tersedia untuk dipesan.

---

## 🎨 User Interface Update

### Di halaman pembayaran (`/transaction/payment?dealId=xxx`)

**Sebelum:**
```
Jumlah Item
[ - ] [ 10 ] [ + ] item
```

**Sekarang:**
```
Jumlah Item
[ - ] [ 10 ] [ + ] item

✅ Stok tersedia: 50 dari 120 unit
```
atau
```
❌ Stok tidak mencukupi. Tersedia: 5, diminta: 10
```

Badge ini akan berubah otomatis saat customer ubah:
- Jumlah barang (quantity)
- Durasi sewa (duration)
- Tanggal mulai sewa (startDate)

---

## 🔐 Validasi di Dua Tempat

### 1. Client-side (Browser)
- Cek setiap kali quantity/duration/date berubah (500ms delay)
- Tampilkan status badge
- Disable tombol "Bayar" jika tidak available

### 2. Server-side (Before Payment Created)
- Final check sebelum transaction dibuat
- Jika stok tiba-tiba habis (race condition), pembayaran akan ditolak
- Create booking record dengan informasi lengkap

---

## 📱 Contoh Error Messages

### ✅ Success
```
Stok tersedia: 50 dari 120 unit
```

### ❌ Quantity Tidak Cukup
```
Stok tidak mencukupi. Tersedia: 5, diminta: 10
```

### ❌ Periode Sudah Full-Booked
```
Stok tidak mencukupi. Tersedia: 0, diminta: 10
(untuk periode 2026-05-01 to 2026-05-05)
```

### ❌ Periode Overlap Partial
```
Stok tidak mencukupi. Tersedia: 20, diminta: 30
(ada 100 barang sudah dibooked dari 2026-05-04 s/d 2026-05-08)
```

---

## 🚀 Maintenance & Troubleshooting

### Jika ada yang error:

1. **"Availability check failed"**
   - Check services.json `bookings[]` array
   - Verify tanggal format (YYYY-MM-DD)
   - Check quantity sesuai integer

2. **Stok tidak diupdate**
   - Check services.json `availableQuantity` field
   - Lihat di payment page, booking harus di-create saat payment sukses

3. **Booking tidak muncul**
   - Check `/api/availability/reserve?serviceId=xxx`
   - Verify transactionId match dengan transactions.json
   - Check booking status bukan "completed" atau "cancelled"

---

## 📚 File Referensi

- **Dokumentasi Lengkap**: [AVAILABILITY_LOGIC.md](AVAILABILITY_LOGIC.md)
- **API Endpoints**:
  - `/src/app/api/availability/validate/route.js`
  - `/src/app/api/availability/reserve/route.js`
- **Payment Page**: `/src/app/transaction/payment/page.js`
- **Transaction Handler**: `/src/app/api/transactions/route.js`

---

## 🎓 Kesimpulan

Sekarang sistem sudah **smart** dan tidak akan biarkan double-booking atau overselling barang. Customer akan mendapat feedback real-time tentang ketersediaan barang, dan booking akan otomatis tercatat dengan periode sewa yang jelas.

✨ **Happy Renting!** ✨

Created: 2026-04-30
