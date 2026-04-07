# 💬 Vendor Chat Interface - Panduan Penggunaan

## Apa Itu Vendor Chat?

Vendor Chat adalah interface khusus untuk vendor agar bisa melihat dan membalas pesan dari customer yang tertarik dengan layanan mereka.

## 📍 Cara Akses

### Dari Vendor Dashboard
1. Klik "Dashboard Vendor" (jika sudah login sebagai vendor)
2. Klik tombol "💬 Pesan Customer" di navbar
3. Atau buka URL: `http://localhost:3000/vendor/chats`

### Dari Home Page (Navbar)
1. Login sebagai vendor
2. Lihat navbar di atas
3. Klik "💬 Pesan Customer"

## 🎯 Fitur Vendor Chat

### 1. **Daftar Chat** (Sidebar Kiri)
- Menampilkan semua pesan dari customer
- Tampil nama customer, judul layanan, jumlah pesan
- Klik untuk membuka percakapan
- Highlight biru menunjukkan chat yang sedang dibuka

### 2. **Area Chat** (Bagian Utama)
- Menampilkan percakapan lengkap dengan customer
- Pesan vendor tampil di sebelah kanan (berwarna ungu)
- Pesan customer tampil di sebelah kiri (berwarna abu-abu)
- Setiap pesan menampilkan waktu pengiriman

### 3. **Deal Management Buttons**
Dua tombol penting untuk mengelola deal:

#### ✅ **Tombol Terima Deal** (Hijau)
- Klik untuk menerima penawaran dari customer
- Tombol akan disabled jika deal sudah diterima atau ditolak
- Setelah diterima, deal status berubah menjadi "Deal Diterima"

#### ❌ **Tombol Tolak Deal** (Merah)
- Klik untuk menolak penawaran dari customer
- Tombol akan disabled jika deal sudah ditolak
- Setelah ditolak, deal status berubah menjadi "Deal Ditolak"

### 4. **Status Badge**
Menampilkan status terkini dari deal:
- ✓ **Deal Diterima** (Biru) - Customer akan dapat merating
- ✗ **Deal Ditolak** (Merah) - Customer tidak dapat merating

### 5. **Chat Input** (Bawah)
- Input field untuk mengetik pesan
- Tombol "Kirim" untuk mengirim pesan
- Tekan Enter untuk kirim cepat
- Pesan akan muncul di sebelah kanan setelah dikirim

## 📋 Workflow Vendor Chat

```
1. Vendor Login
   ↓
2. Buka "Pesan Customer"
   ↓
3. Lihat Daftar Chat dari Customers
   ↓
4. Klik Chat untuk Membaca Pesan
   ↓
5. Balas Pesan Customer
   ↓
6. Customer Klik "Deal"
   ↓
7. Vendor Klik "Terima Deal" atau "Tolak Deal"
   ↓
8. Jika Diterima:
   - Deal Status jadi "Agreed"
   - Customer bisa merating
   - Service metrics terupdate
```

## 🔄 Workflow Lengkap Chat System

```
CUSTOMER SIDE:
1. Browse services → Click "Lihat Detail" → Click "Chat Vendor"
2. Chat modal opens → Send message → Click "Deal"
3. Wait vendor response → Rating form appears (if deal accepted)
4. Submit rating → Service metrics updated

VENDOR SIDE:
1. Login as vendor → Click "Pesan Customer"
2. See chat list → Click chat to open
3. Read customer message → Type & send reply
4. Customer sent deal → Click "Terima Deal" or "Tolak Deal"
5. If accepted: Customer can rate
```

## 💡 Tips Penggunaan

### Best Practices
✅ Balas pesan customer dengan cepat (dalam 24 jam)
✅ Jelas dan profesional saat berkomunikasi
✅ Tanyakan detail kebutuhan customer
✅ Jelaskan terms & conditions dengan jelas
✅ Terima deal jika customer sudah sesuai

### Hindari
❌ Tidak membalas pesan lama
❌ Komunikasi yang tidak profesional
❌ Membuat janji yang tidak bisa dipenuhi
❌ Menerima deal tanpa negosiasi jelas
❌ Menolak deal tanpa alasan yang jelas

## 🔍 Contoh Chat Flow

```
Customer: "Halo, saya mau sewa alat konstruksi untuk project kecil"

Vendor: "Halo! Terima kasih minat dengan layanan kami. 
         Bisa kasih tahu project Anda butuh berapa hari?"

Customer: "Sekitar 3 hari, Senin sampai Rabu"

Vendor: "OK, untuk 3 hari harganya Rp 500rb. 
        Sudah termasuk pengiriman & pickup. Bagaimana?"

Customer: (Klik Deal Button)

Vendor: (Klik Terima Deal)
        "Terima kasih sudah percaya. Akan kami kirim Senin pagi ✓"

→ Deal Status: "Agreed"
→ Customer sekarang bisa submit rating untuk layanan ini
```

## 📊 Data yang Tersimpan

### Setiap Chat Berisi:
- Chat ID (unique)
- Customer Info (ID, Nama)
- Service Info (ID, Judul)
- Message History (semua pesan)
- Deal Status (null/pending/agreed/cancelled)
- Timestamps (kapan dibuat)

### Message Fields:
- Sender ID (siapa yang kirim)
- Sender Name (nama pengirim)
- Message (isi pesan)
- Timestamp (waktu pengiriman)

## ⚠️ Catatan Penting

1. **Chat adalah Satu-satu**: Setiap customer hanya bisa chat dengan satu service Anda
2. **Pesan Permanen**: Semua pesan tersimpan di database
3. **Deal adalah Commitment**: Jika Anda klik "Terima Deal", Anda berkomitmen melayani
4. **Rating Setelah Deal**: Customer hanya bisa rating jika deal diterima
5. **No Rating jika Ditolak**: Jika deal ditolak, customer tidak bisa rating

## 🆘 Troubleshooting

### Chat tidak loading?
- Refresh halaman
- Pastikan sudah login sebagai vendor
- Check browser console untuk errors

### Pesan tidak terkirim?
- Pastikan input tidak kosong
- Check internet connection
- Coba kirim lagi

### Deal button disabled?
- Deal sudah pernah diterima/ditolak
- Tidak bisa diubah kembali
- Hubungi admin jika ada kesalahan

## 📱 Kompatibilitas

✅ Desktop (Chrome, Firefox, Safari, Edge)
✅ Tablet
✅ Mobile (responsive design)

---

## Next Steps

Fitur yang akan datang:
- [ ] Notification untuk pesan baru
- [ ] Chat search functionality
- [ ] Typing indicator
- [ ] Message read receipts
- [ ] File attachments
- [ ] Chat history archive

---

**Version:** 1.0
**Last Updated:** 2024
**Status:** Ready to use ✅
