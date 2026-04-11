# Fitur Sedang Berlangsung - Dokumentasi

## ✅ Yang Telah Dibuat

### 1. **Halaman Customer Sedang Berlangsung** (`/customer/ongoing`)
   - **Navbar**: Tambahan link navigasi "⏳ Sedang Berlangsung" di sebelah link Chat
   - **Fitur Utama**:
     - Menampilkan daftar vendor yang sudah deal dengan customer
     - Setiap card vendor berisi:
       - Foto vendor dari service image
       - Nama vendor
       - Judul service dan harga
       - Status konfirmasi (Customer Confirm / Vendor Confirm)
     - **Tombol Actions**:
       - **Confirm**: Untuk customer confirm pesanan (hanya bisa diklik 1x)
       - **Complain**: Untuk mengajukan komplain dengan foto dan alasan
     - **Form Complain Modal**:
       - Upload foto barang
       - Input alasan komplain
       - Tombol kirim
   - **Status Complain**: Ditampilkan di card jika ada complain aktif

### 2. **Halaman Vendor Sedang Berlangsung** (`/vendor/ongoing`)
   - **Navbar**: Tambahan link navigasi "⏳ Sedang Berlangsung" 
   - **Fitur Utama**:
     - Menampilkan daftar produk/jasa yang sudah deal dengan customer
     - Setiap card product berisi:
       - Foto produk
       - Judul produk dan harga
       - Nama pembeli (customer)
       - Status konfirmasi
     - **Tombol Confirm**:
       - Hanya dapat diklik jika customer sudah confirm terlebih dahulu
       - Setelah vendor confirm, deal masuk status "completed"
     - **Section Complain**:
       - Menampilkan complain dari customer
       - Menampilkan foto dan alasan complain

### 3. **API Endpoints** (`/api/ongoing`)

#### GET - Ambil Ongoing Deals
```
GET /api/ongoing?userId={id}&userRole={customer|vendor}
Response: { success: true, data: [ {...deals dengan enriched data} ] }
```

#### POST - Submit Complain
```
POST /api/ongoing
Body: {
  dealId, 
  customerId, 
  vendorId, 
  photo (base64), 
  reason
}
```

#### PUT - Update Deal Status (Confirm)
```
PUT /api/ongoing
Body: {
  dealId,
  userId,
  userRole,
  action: 'confirm'
}
```

### 4. **Data Structure Updates** (deals.json)
- Tambahan field:
  - `customerConfirmed`: boolean (default: false)
  - `vendorConfirmed`: boolean (default: false)
  - `complains`: array dari objek complain
    - Setiap complain memiliki: id, photo, reason, createdAt, resolved

### 5. **Styling**
- Customer ongoing: `src/app/customer/ongoing/page.module.css`
- Vendor ongoing: `src/app/vendor/ongoing/page.module.css`
- Responsive design untuk mobile dan desktop

## 🔄 Alur Kerja

### Customer Side:
1. Customer membuka halaman "Sedang Berlangsung"
2. Lihat vendor yang sudah deal
3. **Confirm Pesanan**: Klik tombol "Confirm" untuk konfirmasi
4. **Komplain**: 
   - Klik tombol "Complain"
   - Upload foto barang
   - Tulis alasan komplain
   - Klik "Kirim Complain"
   - Komplain akan terlihat oleh vendor

### Vendor Side:
1. Vendor membuka halaman "Sedang Berlangsung"
2. Lihat produk yang sudah deal
3. Lihat status confirm customer
4. **Lihat Complain**: Jika ada komplain dari customer terlihat dengan foto dan alasan
5. **Confirm Pesanan**: 
   - Hanya aktif jika customer sudah confirm
   - Status berubah menjadi "completed" setelah vendor confirm

## 📝 Catatan Penting

- Navigasi ke halaman ongoing tersedia di navbar chat untuk customer dan vendor
- Form complain menggunakan base64 encoding untuk foto (dapat dimodifikasi ke file upload jika diperlukan)
- Status deal akan berubah menjadi "completed" setelah kedua belah pihak confirm
- Jika ada komplain, status deal menjadi "complain" dan dapat di-resolv oleh vendor

## 🔧 Testing

Untuk testing, pastikan:
1. Ada data deals dalam `deals.json` dengan `customerAccepted: true` dan `vendorAccepted: true`
2. Status deal harus "agreed"
3. Login sebagai customer atau vendor untuk testing berbagai skenario
