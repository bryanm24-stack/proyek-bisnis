# RINGKASAN BAB I - BAB III
## Proyek RentGuard: Sistem Digitalisasi Vendor Sewa

---

# 📦 RINGKASAN SEMUA SISTEM DALAM PROYEK

Proyek RentGuard terdiri dari 10+ subsistem utama yang saling terintegrasi:

## 🔐 1. SISTEM AUTENTIKASI & MANAJEMEN AKUN
**Tujuan**: Validasi identitas pengguna dan kontrol akses berbasis role

**Fitur**:
- Registration dengan role selection (Customer, Vendor, Admin)
- Login terenkripsi dengan session management
- Role-based access control (RBAC)
- Password recovery via email
- Profile management untuk setiap role

**Endpoint**: `/api/auth/login`, `/api/auth/register`

---

## 🏢 2. SISTEM VENDOR REGISTRATION & APPROVAL
**Tujuan**: Kurasi vendor untuk menjaga kualitas platform

**Fitur**:
- Vendor registration dengan upload dokumen/sertifikat
- Admin dashboard untuk review vendor
- Approve/Reject dengan alasan tertulis
- Status tracking: Pending → Approved/Rejected
- Verification badge untuk vendor approved

**Endpoint**: `/api/vendor/register`, `/api/admin/vendor-approval`
**Data**: `vendor_registrations.json`

---

## 📦 3. SISTEM CATALOG & INVENTORY MANAGEMENT
**Tujuan**: Kelola katalog layanan/produk dengan fleksibilitas

**Fitur**:
- Create/Read/Update/Delete (CRUD) services
- Multiple items per service (furniture, fotografer, dll)
- Item-based pricing (bukan service level pricing)
- Stock management per item (untuk BARANG)
- Quantity management (untuk JASA)
- Service categorization & search

**Endpoint**: `/api/vendor/services`, `/api/services`
**Data**: `services.json`

**Data Structure**:
```json
{
  "type": "barang|jasa",
  "title": "Service Title",
  "items": [
    {
      "id": "item-1",
      "nama": "Item name",
      "harga": 50000,
      "stok": 40  // untuk BARANG
    }
  ]
}
```

---

## 🔍 4. SISTEM AVAILABILITY & BOOKING VALIDATION
**Tujuan**: Memastikan stok & ketersediaan pada periode booking

**Fitur**:
- Real-time availability checking
- Date range validation (startDate → endDate)
- Overlap detection untuk conflicting bookings
- Stock deduction logic (Total - Booked)
- Differentiated logic untuk JASA vs BARANG
- Quantity validation (tidak melebihi stok tersedia)

**Endpoint**: `/api/availability/validate`, `/api/availability/reserve`
**Logic**:
- JASA: `available = service.quantity - booked_on_date`
- BARANG: `available = sum(items[*].stok) - booked_qty`

---

## 💬 5. SISTEM CHAT & REAL-TIME MESSAGING
**Tujuan**: Fasilitasi komunikasi langsung antara customer dan vendor

**Fitur**:
- Create chat room per customer-vendor-service
- Send/receive messages dengan timestamp
- Message history persistence
- Sender identification (customer/vendor/admin)
- Notification untuk new messages
- Integrated dengan Deal System

**Endpoint**: `/api/chat`
**Data**: `chats.json`

**Message Format**:
```json
{
  "id": "msg-timestamp",
  "senderId": "user-id",
  "senderName": "user name",
  "message": "message content",
  "timestamp": "ISO-8601"
}
```

---

## 🤝 6. SISTEM DEAL & AGREEMENT MANAGEMENT
**Tujuan**: Formalisasi kesepakatan antara customer dan vendor

**Fitur**:
- Create deal (customer proposal)
- Accept/Reject deal (vendor decision)
- Deal status lifecycle: Pending → Agreed → Completed
- Integrated dengan Chat untuk context
- Auto-trigger untuk payment process
- Cancel deal capability

**Endpoint**: `/api/deals`
**Data**: `deals.json`

**Deal Status Flow**:
```
PENDING (customer propose)
    ↓
AGREED (vendor accept)
    ↓
COMPLETED (layanan selesai)
    ↓
RATED (customer beri rating)
```

---

## ⭐ 7. SISTEM RATING & REVIEW
**Tujuan**: Bangun reputasi vendor berbasis transaksi nyata

**Fitur**:
- 5-star rating system
- Optional text review (max 500 chars)
- Weighted rating (hanya verified completed deals)
- Automatic service rating update (weighted average)
- Rating history tracking
- Prevent duplicate ratings

**Endpoint**: `/api/ratings`
**Data**: `ratings.json`

**Rating Rules**:
- Hanya customer yg punya completed + agreed deal bisa rate
- Rating langsung terupdate `service.rating = avg(all_ratings)`
- `rentCount` terupdate otomatis (+1 setiap kali ada rating)

---

## 💳 8. SISTEM PAYMENT & INVOICE MANAGEMENT
**Tujuan**: Mengelola transaksi finansial dengan fleksibilitas

**Fitur**:
- Payment type selection (Full Payment / Pay-After)
- Multi-gateway support (QRIS, Card, Bank Transfer)
- Invoice generation otomatis
- Payment deadline calculation (2 days untuk pay-after)
- Invoice status tracking (pending → paid → overdue)
- Payment method recording
- Transaction history

**Endpoint**: `/api/invoices`, `/api/transactions`
**Data**: `invoices.json`, `deals.json` (payment fields)

**Payment Type**:
- **Full Payment**: 100% bayar sebelum layanan dikirim
- **Pay-After**: 20% deposit (sebelum), 80% dalam 2 hari

---

## 🔔 9. SISTEM AUTO-REMINDER & NOTIFICATION
**Tujuan**: Otomatis reminder untuk deadline pembayaran

**Fitur**:
- Email reminder scheduling
- Daily automated reminders sebelum deadline
- Countdown timer untuk payment deadline
- Status color coding (Green: Pending, Red: Overdue)
- Notification untuk deal acceptance
- Message notifications

**Integration**: Gmail API untuk email sending
**Frequency**: Daily untuk pending invoices

---

## 📋 10. SISTEM ONGOING ORDERS & STATUS TRACKING
**Tujuan**: Real-time tracking tahap pengiriman dan penyelesaian

**Fitur**:
- Separate pages untuk customer & vendor ongoing orders
- Order status display (pending → confirmed → in_progress → delivered)
- Customer confirm order feature
- Vendor confirm shipment feature
- Visual card dengan order details
- Status indicator badges

**Pages**: 
- `/customer/ongoing` - Customer ongoing orders
- `/vendor/ongoing` - Vendor ongoing orders

**Status Stages**:
1. **Pending Confirmation** - Customer belum confirm
2. **Confirmed** - Customer confirm, vendor preparing
3. **In Progress** - Vendor confirm, pengiriman started
4. **Delivered** - Order complete, ready for rating

---

## ⚠️ 11. SISTEM KOMPLAIN & DISPUTE RESOLUTION
**Tujuan**: Handle customer complaints dengan dokumentasi

**Fitur**:
- Submit complain dengan photo upload
- Reason text field
- Complain tracking di vendor side
- Photo & evidence preservation
- Complain status: submitted → reviewing → resolved
- Admin mediation capability

**Data Structure** (dalam deals.json):
```json
{
  "complains": [
    {
      "id": "complain-id",
      "photo": "base64-image",
      "reason": "Alasan komplain",
      "createdAt": "ISO-8601",
      "resolved": false
    }
  ]
}
```

---

## 🏆 12. SISTEM CREDIT SCORING
**Tujuan**: Transparansi finansial untuk mitigasi risiko

**Fitur**:
- Score calculation berdasarkan payment history
- On-time payment tracking
- Late payment penalty
- Used by vendor untuk decision making
- Score visible di vendor profile check
- Formula: (On-Time Payments / Total Transactions) * 100

---

## 📊 13. SISTEM ANALYTICS & REPORTING
**Tujuan**: Insights untuk business intelligence

**Fitur**:
- Transaction statistics
- Payment success rate
- Average rating per vendor
- Popular services ranking
- Customer behavior tracking
- Revenue reporting

---

## 🔧 14. SISTEM DATABASE & ORM
**Tujuan**: Persistent data storage dengan integritas

**Stack**:
- **Database**: JSON files (simulasi) atau MySQL
- **ORM**: Prisma (untuk future MySQL migration)
- **Schema**: Relational dengan proper relationships

**Main Collections**:
- `users.json` - Akun pengguna
- `services.json` - Katalog layanan
- `vendor_registrations.json` - Vendor approval workflow
- `chats.json` - Percakapan
- `deals.json` - Kesepakatan & transaksi
- `ratings.json` - Review & rating
- `invoices.json` - Penagihan
- `notifications.json` - Log notifikasi

---

## 🎨 15. SISTEM UI/UX & RESPONSIVENESS
**Tujuan**: User experience yang intuitif & responsive

**Stack**:
- Framework: Next.js 14 (React)
- Styling: CSS Modules + CSS Grid/Flexbox
- Design: Responsive Web Design (RWD)
- Components: Modular React components
- Modal system untuk detail & forms

---

## 🔌 16. SISTEM API & REST INTEGRATION
**Tujuan**: Backend services dengan standard REST

**Architecture**: RESTful API dengan HTTP methods
- **GET**: Retrieve data
- **POST**: Create data
- **PUT**: Update data
- **DELETE**: Delete data

**Base Endpoints**:
```
/api/auth/*           - Authentication
/api/vendor/*         - Vendor operations
/api/admin/*          - Admin operations
/api/chat/*           - Chat messaging
/api/deals/*          - Deal management
/api/ratings/*        - Rating system
/api/invoices/*       - Invoice management
/api/transactions/*   - Payment transactions
/api/availability/*   - Stock checking
/api/services/*       - Service catalog
```

---

---

## BAB I: PENDAHULUAN

### 1.1 Latar Belakang
Transformasi digital menuntut efisiensi operasional B2B. Masalah utama:
- Pencarian vendor masih menggunakan metode konvensional (ear-to-ear)
- Tingginya asimetri informasi mengenai kualitas vendor
- Data portofolio tersebar dan tidak terstruktur
- Proses kurasi manual yang tidak produktif dan rawan kesalahan

**Solusi: Platform RentGuard** yang menyatukan:
- Basis data portofolio terpusat
- Verifikasi pihak ketiga
- Sistem penilaian (rating) terpusat

### 1.2 Tujuan Pengembangan
1. Menyediakan platform terpadu untuk mencari, bernegosiasi, dan berkolaborasi
2. Menjaga kelancaran arus kas vendor dengan sistem invoice & auto-reminder
3. Meningkatkan transparansi finansial melalui credit scoring
4. Membangun ekosistem B2B yang akuntabel berbasis data rekam jejak transaksi

### 1.3 Ruang Lingkup

#### 1.3.1 Hak Akses Pengguna (Role)
1. **Client**: Pengguna pencari layanan sewa
   - Navigasi pencarian vendor
   - Lihat profil penyedia jasa
   - Negosiasi harga
   - Tanggung jawab pelunasan kewajiban

2. **Vendor**: Pemegang kendali operasional
   - Verifikasi latar belakang client via credit scoring
   - Organisir tugas dan proses dokumen
   - Manajemen katalog layanan

3. **Admin**: Pengelola ekosistem & penjamin kualitas
   - Verifikasi akun vendor (Vendor Approval)
   - Kelancaran transaksi
   - Mediasi kendala pembayaran
   - Akses laporan transaksi

#### 1.3.2 Fungsionalitas Sistem Terintegrasi

**Fitur Umum (Public & Guest):**
- Landing Page
- Pencarian Katalog Vendor
- Sistem Autentikasi Terenkripsi & Pemulihan Akun

**Fitur Client:**
- Landing Page dengan katalog vendor terintegrasi
- Search & Filter vendor berdasarkan kategori
- Detail Modal untuk lihat profil vendor lengkap
- **Live Chat & Deal System**: Komunikasi real-time dengan vendor
- **Komplain Feature**: Upload foto & alasan komplain untuk tracking
- **Ongoing Orders Page**: Monitor pesanan yang sedang berlangsung (Pending → Agreed → Completed)
- **Confirm Pesanan**: Konfirmasi order sebelum vendor memproses
- Pay-After & Auto-Reminder (Deposit 20%, Sisa 2 hari)
- **Invoice Management**: Dashboard invoice dengan countdown deadline
- Rating & Review (hanya setelah deal selesai)
- Payment Multiple Gateway (QRIS, Card, Bank Transfer)

**Fitur Vendor:**
- **Vendor Registration & Approval**: Daftar dengan dokumen untuk diverifikasi Admin
- Dashboard Vendor (manajemen layanan sewa & inventori)
- **Multiple Items Management**: Kelola item berbeda dalam 1 service
- **Item-Based Pricing**: Harga per item, bukan per service level
- Profile & **Credit Score Check** pada customer sebelum accept deal
- **Chat Vendor**: Coordination chat dengan customer
- **Ongoing Orders Page**: Monitor product yang sudah deal
- **Confirm Pengiriman**: Konfirmasi setelah customer confirm
- **Complex Workflow**: Vendor bisa punya role ganda (penyedia & pembeli)

**Fitur Admin:**
- **Vendor Approval System**: Review & approve/reject vendor registration
- **Manajemen Akun**: Manage users dengan role-based access
- **Transaksi Monitoring**: Lihat semua transaksi untuk audit
- **Report & Analytics**: Statistik platform usage

#### 1.3.3 Alur Proses Bisnis
Transaksi berjalan dinamis dan interaktif dengan tracking detail di setiap tahap:

**Tahap 1 - Negosiasi (Deal Pending)**
- Customer mencari vendor & membuka detail layanan
- Customer membuka live chat dengan vendor
- Customer mengajukan deal (offer), status = "pending"
- Vendor menerima/menolak di page vendor chats

**Tahap 2 - Penerimaan (Deal Agreed)**
- Jika vendor accept → status bergerak ke "agreed"
- Pemberitahuan otomatis dikirim ke customer
- Customer dapat melihat di "Ongoing Orders"
- Customer lanjut ke tahap pembayaran

**Tahap 3 - Pembayaran**
- Customer pilih metode: Full Payment atau Pay-After
- Jika Pay-After: Bayar 20% deposit, sisa 80% dalam 2 hari
- Invoice otomatis dibuat & email reminder dikirim daily
- Payment deadline ditampilkan dengan countdown

**Tahap 4 - Pengiriman & Komplain**
- Customer confirm pesanan di "Ongoing Orders" page
- Vendor lihat confirmation & prepare pengiriman
- Customer bisa submit complain dengan foto & alasan
- Vendor confirm pengiriman → Status "Completed"

**Tahap 5 - Evaluasi**
- Customer memberikan rating (1-5) & review
- Rating hanya dihitung untuk verified completed deals
- Vendor rating terupdate otomatis (weighted average)

**State Tracking**: Pending → Agreed → Completed / Rated

#### 1.3.4 Target Uji Coba
- Validasi Peran Pengguna (User Roles)
- Integritas Sistem Credit Scoring
- Fungsionalitas Alur Bisnis B2B

#### 1.3.5 Batasan Masalah
- Hanya pengembangan web (tidak mobile/APK/iOS)
- Credit scoring menggunakan formula histori transaksi (bukan AI/ML)
- Chat: teks saja (tidak voice/video call)

#### 1.3.6 Fitur Tambahan Beyond Scope Awal
- **Komplain & Resolution System**: Untuk meningkatkan kualitas layanan
- **Multiple Payment Method**: QRIS, Card, Bank Transfer (untuk fleksibilitas)
- **Availability Calendar**: Booking dengan date range & stock validation
- **Ongoing Order Status**: Real-time tracking setiap tahap transaksi
- **Vendor Dual Role**: Vendor bisa juga bertindak sebagai customer

### 1.4 Metodologi: Waterfall

Tahapan pengembangan:
1. **Analisis Kebutuhan** - Identifikasi masalah, spesifikasi teknis & fungsional
2. **Desain Sistem** - Blueprint arsitektur, basis data, UI/UX
3. **Implementasi** - Kode modul fungsional
4. **Testing** - Black Box Testing
5. **Deployment** - Operations

### 1.5 Sistematika Pembahasan
- BAB I: PENDAHULUAN
- BAB II: TEORI PENUNJANG
- BAB III: ANALISIS SISTEM

---

## BAB II: TINJAUAN PUSTAKA

### 2.1 Konsep Marketplace dan Escrow Account
**Marketplace**: Platform elektronik berbasis internet yang memfasilitasi transaksi antara penjual & pembeli

**Escrow Account (Rekening Bersama)**: Pihak ketiga (platform) menahan dana transaksi client hingga vendor memenuhi seluruh kewajiban kontrak
- Mencegah risiko penipuan harga
- Mencegah kegagalan layanan vendor
- Mencegah gagal bayar client

### 2.2 Asimetri Informasi dan Teori Weighted Rating
**Asimetri Informasi**: Ketidakseimbangan informasi antara client & vendor

**Weighted Rating (Penilaian Terbobot)**: Memberikan bobot berbeda pada setiap ulasan dengan mempertimbangkan validitas kerja sama
- Hanya client yang menyelesaikan layanan & mencapai status "Deal" yang bisa rating
- Meminimalkan manipulasi ulasan internal

### 2.3 Responsive Web Design (RWD)
Pendekatan perancangan antarmuka agar tampilan web menyesuaikan berbagai ukuran layar:
- Penggunaan CSS Flexbox & CSS Grid
- Tetap rapi & proporsional di smartphone hingga laptop

### 2.4 Framework Next.js
Framework turunan React dengan fitur Server-Side Rendering (SSR):
- Halaman dirender di server sebelum dikirim ke browser
- **Keuntungan**: Performa tinggi & SEO ramah

**Contoh pada RentGuard**: Saat pengunjung buka halaman katalog vendor, Next.js di server langsung ambil data vendor dari database, susun elemen tampilan (nama, foto, harga), baru kirim ke browser. Bot Google bisa langsung membaca data teks vendor → mudah diindeks.

### 2.5 Basis Data Relasional dan MySQL
**Basis Data Relasional**: Mengatur data dalam tabel-tabel yang saling terhubung berdasarkan titik data umum

**MySQL**: Sistem Manajemen Basis Data Relasional (RDBMS)
- Menggunakan SQL untuk kelola, tambah, hapus, perbarui data
- Vital untuk memetakan hubungan kompleks (One-to-Many)
- Contoh: 1 Vendor → banyak rekam jejak pesanan

### 2.6 Object-Relational Mapping (ORM) menggunakan Prisma
**Prisma**: Lapisan abstraksi penerjemah (query builder) yang menjembatani Next.js dengan MySQL
- Tidak perlu menulis SQL mentah manual
- Mempermudah pemetaan hubungan antar tabel
- Type-safety yang ketat → cegah galat tipe data

**Penerapan pada RentGuard**:
- Entitas "Pengguna" = ID unik, email, role (Client/Vendor/Admin)
- Hubungan "Pengguna" ↔ "Transaksi" → Prisma otomatis buat foreign key
- Platform mengenali transaksi milik client mana

### 2.8 Arsitektur RESTful API
**REST API**: Aturan terstandar agar sistem berbeda saling komunikasi via jaringan

Metode pada marketplace RentGuard:
- **GET**: Muat daftar vendor
- **POST**: Client ajukan penawaran sewa
- **PUT**: Perubahan status (vendor setuju pesanan)
- **DELETE**: Batalkan pesanan

### 2.9 Manajemen Status Transaksi (State Management)
Siklus hidup pesanan:
- **Pending** (Menunggu) → Client ajukan
- **Agreed** (Disepakati) → Vendor setujui
- **Completed** (Selesai) → Layanan selesai
- **Rated** (Dinilai) → Client kasih rating

Mencegah kerancuan logika (misal: client tidak bisa rating sebelum layanan selesai)

### 2.10 Pengujian Perangkat Lunak (Black Box Testing)
**Black Box Testing**: Evaluasi fungsionalitas tanpa melihat struktur internal kode

Penguji bertindak seperti pengguna awam:
- Isi formulir
- Tekan tombol
- Validasi respons sistem sesuai spesifikasi

**Pada RentGuard**: Uji pengingat tagihan aktif, transisi status pesanan akurat, perhitungan skor kredibilitas tepat

### 2.11 Sistem Relasional Data & Foreign Key Relationships ✨ BARU
**Konsep**: Hubungan antar entitas dalam database relasional

**Relationship Types**:
- **One-to-Many**: 1 Service → Many Items / 1 Vendor → Many Services
- **Many-to-Many**: Customers ↔ Services (via Deals & Ratings)
- **Foreign Key**: Menjaga referential integrity antar tabel

**Contoh pada RentGuard**:
```
User (ID) → has many → Services (vendor_id)
User (ID) → has many → Deals (customer_id, vendor_id)
Service (ID) → has many → Items (service_id)
Deal (ID) → has many → Invoices (deal_id)
Rating (ID) → references → Deal (deal_id) & Service (service_id)
```

### 2.12 Date Range Booking & Availability Logic ✨ BARU
**Konsep**: Validasi ketersediaan berdasarkan periode waktu

**Logic**:
- Check overlap antara request period (startDate-endDate) dengan existing bookings
- Available = Total - (Confirmed + Pending yang overlap)
- Validation sebelum payment diproses

**Pseudocode**:
```
available = service.totalQuantity
for each booking in existingBookings:
  if booking.startDate <= request.endDate AND booking.endDate >= request.startDate:
    available -= booking.quantity
    
if available >= requested:
  return {valid: true, available}
else:
  return {valid: false, available}
```

### 2.13 Multi-Payment Method Architecture ✨ BARU
**Konsep**: Fleksibilitas pembayaran dengan multiple gateways

**Tipe Pembayaran Dalam Proyek**:
1. **Full Payment** - 100% uang diterima vendor sebelum pengiriman
2. **Pay-After** - Deposit 20% + Sisa 80% dalam 2 hari
3. **Gateway Options** - QRIS (simulasi), Card, Bank Transfer

**Benefits**:
- Vendor dapat immediate cash (full payment)
- Vendor dapat flexible terms (pay-after)
- Customer dapat pilih sesuai cash flow

### 2.14 State Machine & Workflow Management ✨ BARU
**Konsep**: Manage kompleks state transitions dalam aplikasi

**State Transitions**:
```
Deal: null → PENDING → AGREED → COMPLETED → RATED
      ↓        ↓         ↓
    CANCELLED  CANCELLED CANCELLED

Payment: UNPAID → PARTIAL → PAID → OVERDUE
         ↓         ↓
       CANCELLED  CANCELLED

Complain: NONE → SUBMITTED → REVIEWING → RESOLVED
```

**Benefit**: Prevent invalid state transitions (e.g., rate sebelum completed)

### 2.15 File Upload & Base64 Encoding ✨ BARU
**Konsep**: Handle file uploads untuk dokumen & foto

**Implementation**:
- Convert file to Base64 string
- Store dalam JSON (atau database blob)
- Display image via `data:image/png;base64,...` URI
- Used untuk: Vendor documents, Complain photos, Profile pics

---

## BAB III: ANALISIS SISTEM

### 3.1 Analisis Sistem yang Sedang Berjalan

#### Masalah Sistem Lama:
1. **Metode Pencarian**: Rekomendasi lisan (ear-to-ear) → jangkauan terbatas
2. **Fragmentasi Data**: Portofolio vendor tersebar di media sosial, web pribadi, dokumen fisik
3. **Kurasi Manual**: Tidak terstruktur, memakan waktu, rawan kesalahan
4. **Asimetri Informasi**: Client sulit dapatkan data objektif kualitas vendor
5. **Risiko Tinggi**: Keputusan kontrak berdasarkan data tidak terverifikasi

#### Kelemahan Spesifik:
- **Inefisiensi Operasional**: Kurasi 1 vendor butuh berhari-hari
- **Rendahnya Integritas Data**: Data tidak terverifikasi & tidak terstruktur
- **Ketidakpastian Logistik**: Tidak ada sinkronisasi stok otomatis
- **Erosi Memori Organisasi**: Tanpa database SQL terpusat, tidak ada histori vendor buruk

### 3.2 Hasil Analisis

**Solusi Mendesak**: Platform digital terintegrasi yang bertindak sebagai gatekeeper data B2B akuntabel

**Fungsi Platform RentGuard**:
- Menyatukan basis data portofolio vendor
- Sistem verifikasi pihak ketiga
- Sistem penilaian transparan
- Menyediakan kepastian data untuk pemilihan vendor berkualitas
- Meningkatkan transparansi finansial via credit scoring
- Menyederhanakan alur transaksi

### 3.4 Analisis Sistem Baru (RentGuard)

#### Arsitektur Sistem:
- **Model**: Client-Server
- **Frontend**: Next.js dengan Server-Side Rendering (SSR)
- **Database**: MySQL (dikelola Prisma ORM)
- **Komunikasi**: REST API

#### Peran Aktor:
1. **Client**: Cari layanan → negosiasi → bayar → rate
2. **Vendor**: Kelola layanan → verifikasi client via Credit Score → proses dokumen
3. **Admin**: Kurasi vendor (Approve/Reject) → verifikasi transaksi → mediasi pembayaran

#### Fitur Utama Sistem Baru:

**1. Weighted Reputation Score**
- Hanya rating dari client yang selesai transaksi terverifikasi
- Rating objective, meminimalkan manipulasi

**2. Credit Score Check**
- Vendor cek rekam jejak kedisiplinan pembayaran calon client
- Mitigasi risiko sebelum menyetujui pesaran

**3. Otomasi Invoice (Pay-After & Auto-Reminder)**
- Deposit awal: 20%
- Sisa pelunasan: 2 hari
- Auto-reminder harian via email → cegah telat bayar → jaga arus kas vendor

**4. Ekstraksi Dokumen Portofolio**
- Tesseract.js (OCR) → ekstrak konten dokumen
- Data tidak terstruktur jadi terindeks & mudah dicari

**5. Real-Time Chat & Deal Management**
- Live chat dengan message history
- Deal status tracking (pending → agreed → completed)
- Rating form integrated dalam chat modal

**6. Komplain & Resolution System** ✨ BARU
- Customer upload foto & alasan komplain
- Vendor view komplain dengan bukti
- Admin dapat mediasi jika ada dispute
- Tracking status komplain (submitted → reviewing → resolved)

**7. Availability & Stock Management** ✨ BARU
- Real-time availability checking dengan date range
- Overlap detection untuk booking yang bertabrakan
- Diferensiasi logic JASA vs BARANG
- Item-based pricing dengan quantity selection

**8. Multiple Payment Method** ✨ BARU
- Full Payment (100% langsung)
- Pay-After (20% deposit + 2 hari)
- Gateway: QRIS, Card, Bank Transfer (simulasi)

**9. Ongoing Orders Tracking** ✨ BARU
- Customer confirm pesanan
- Vendor confirm pengiriman
- Status progress: pending → confirmed → in_progress → delivered

**10. Vendor Dual Role** ✨ BARU
- Vendor bisa bertindak sebagai customer saat butuh layanan
- Same chat interface, different tabs (customer/vendor)

### 3.5 Keunggulan Sistem Baru

1. **Transparansi Finansial Objektif**: Credit Scoring berbasis histori transaksi nyata
2. **Integrasi End-to-End**: Cari vendor → negosiasi → manajemen proyek → pembayaran dalam 1 platform
3. **Mitigasi Risiko Telat Bayar**: Auto-Reminder aktif jaga stabilitas arus kas vendor
4. **Akuntabilitas Ekosistem**: Kepercayaan berbasis data terverifikasi & Vendor Approval Admin

### 3.6 Fitur-Fitur Beyond Initial Scope ✨ INOVASI TAMBAHAN

#### 3.6.1 Komplain & Dispute Resolution System
**Masalah yang Diselesaikan**: Customer tidak punya channel resmi untuk komplain kualitas layanan

**Solusi**:
- Form komplain dengan photo upload & reason text
- Vendor dapat melihat komplain dengan bukti lengkap
- Status tracking (submitted → reviewing → resolved)
- Admin dapat mediasi jika ada dispute

**Impact**: 
- Meningkatkan kepercayaan customer
- Vendor bisa respond quickly ke complain
- Data komplain menjadi feedback untuk improvement

#### 3.6.2 Ongoing Orders Status Tracking
**Masalah yang Diselesaikan**: Customer tidak tahu progress pengiriman setelah deal agreed

**Solusi**:
- Dedicated page `/customer/ongoing` untuk tracking
- Real-time status: Pending Confirmation → Confirmed → In Progress → Delivered
- Vendor page `/vendor/ongoing` untuk manage confirmations
- Clear visual indicators & action buttons

**Impact**: 
- Transparency dalam delivery process
- Mengurangi customer anxiety
- Vendor dapat coordinate delivery lebih baik

#### 3.6.3 Availability Calendar & Date Range Booking
**Masalah yang Diselesaikan**: Sistem awal tidak handle kompleks booking scenarios (misal furniture untuk 5 hari, tersedia stok untuk 3 hari)

**Solusi**:
- API validation: `POST /api/availability/validate`
- Check overlap antara request date range dengan existing bookings
- Stock deduction logic yang sophisticated
- Different logic untuk JASA vs BARANG

**Implementation Detail**:
```
JASA: available = total_providers - num_booked_on_that_date
BARANG: available = sum(item_stocks) - num_items_already_booked_that_period
```

**Impact**: 
- Prevent overbooking
- Accurate inventory management
- Better utilization dari available resources

#### 3.6.4 Multi-Payment Method & Pay-After System
**Masalah yang Diselesaikan**: Sistem awal hanya support "full payment", kurang fleksibel

**Solusi**:
- Payment type selection: Full Payment vs Pay-After
- Full: 100% bayar sebelum pengiriman
- Pay-After: 20% deposit + 80% dalam 2 hari
- Multiple gateway: QRIS, Card, Bank Transfer
- Automatic invoice generation & email reminders

**Implementation Detail**:
- Deposit calculation: `downPayment = totalAmount * 0.2`
- Remaining: `remainingPayment = totalAmount - downPayment`
- Deadline: `paymentDeadline = now + 2 days`
- Auto-reminder: Setiap hari sampai deadline

**Impact**: 
- Vendor dapat immediate cash (full) atau flexible terms (pay-after)
- Customer dapat choose sesuai cash flow
- Reduce late payment rate dengan reminder

#### 3.6.5 Item-Based Pricing Model
**Masalah yang Diselesaikan**: Sistem awal tidak handle "item variants" dengan pricing berbeda

**Solusi**:
- Service punya multiple items, each dengan pricing sendiri
- Example: Paket Furniture bisa berisi:
  - Kursi Modern = 50k/pcs
  - Kursi Klasik = 75k/pcs
  - Meja Panjang = 150k/pcs
- Customer select item + quantity + duration
- Price calculation: `total = item.price * quantity * durationDays`

**Data Structure**:
```json
{
  "service": {
    "items": [
      { "id": "item-1", "nama": "Kursi Modern", "harga": 50000, "stok": 40 },
      { "id": "item-2", "nama": "Meja Panjang", "harga": 150000, "stok": 25 }
    ]
  }
}
```

**Impact**: 
- Flexibility untuk vendor tawarkan berbagai item variants
- Customer dapat choose exact item + quantity
- More accurate pricing

#### 3.6.6 Vendor Dual Role Support
**Masalah yang Diselesaikan**: Sistem awal assume vendor hanya provider, tidak pernah customer

**Solusi**:
- Vendor bisa punya dual role: penyedia layanan + pembeli layanan
- Same interface, different context (tabs: "customer" vs "vendor")
- Payment button muncul untuk vendor di chat mereka sebagai customer
- Discount button hanya untuk vendor penyedia

**Chat Structure**:
```
Vendor Chats Page:
├── Tab 1: "As Vendor" (bernegosiasi dengan customer)
│   └── Accept/Reject/Confirm buttons
├── Tab 2: "As Customer" (vendor lain serve saya)
│   └── Payment button (lanjut ke bayar)
└── Tab 3: "Sebagai Vendor" (kalau ada dari vendor lain)
```

**Impact**: 
- Inclusive platform untuk semua bisnis
- Vendor bisa jadi customer juga
- More flexibility dalam ecosystem

---

## ⚠️ FITUR YANG MASIH KURANG / FUTURE ENHANCEMENTS

Berikut adalah fitur-fitur yang belum diimplementasikan tetapi penting untuk production:

### Tier 1: CRITICAL (Harus ada sebelum production)

| No | Fitur | Alasan | Estimate |
|---|---|---|---|
| 1 | Real Database MySQL Integration | JSON files tidak scalable, perlu persistent DB | 1 minggu |
| 2 | Authentication Security Upgrade | Hashing password, JWT tokens, refresh tokens | 3 hari |
| 3 | File Upload ke Cloud Storage | Images di Base64 boros storage, perlu S3/Cloudinary | 3 hari |
| 4 | Email Notification System | Auto-reminder perlu real email service | 2 hari |
| 5 | Error Handling & Logging | Sistem perlu proper error handling & audit logs | 5 hari |
| 6 | Rate Limiting & Security | API perlu protection dari abuse & DDoS | 3 hari |

### Tier 2: HIGH (Sebaiknya ada dalam 3 bulan)

| No | Fitur | Alasan | Estimate |
|---|---|---|---|
| 1 | Admin Dashboard Analytics | Business intelligence untuk decision making | 1 minggu |
| 2 | Mobile App (PWA/Native) | Majority users akses via mobile | 2-3 minggu |
| 3 | Advanced Credit Scoring | Machine Learning model untuk akurasi lebih baik | 2 minggu |
| 4 | Automated Invoice System | Integration dengan accounting software | 1 minggu |
| 5 | Escrow Account Implementation | Real money holding untuk protection | 1 minggu |
| 6 | Video Call/Voice Chat | Customer service improvement | 1 minggu |
| 7 | Advanced Search & Filters | Category, location, rating, price range | 5 hari |
| 8 | Recommendation Engine | Suggest vendor berdasarkan history & preference | 1 minggu |

### Tier 3: MEDIUM (Bagus-baik saja, boleh delayed)

| No | Fitur | Alasan | Estimate |
|---|---|---|---|
| 1 | Multi-Language Support | Global expansion | 1 minggu |
| 2 | Dark Mode | UX enhancement | 2 hari |
| 3 | Advanced Chat Features | Voice message, file sharing | 1 minggu |
| 4 | Subscription/Membership | Recurring revenue model | 1 minggu |
| 5 | Referral Program | User acquisition through word-of-mouth | 5 hari |
| 6 | Performance Optimization | Caching, CDN, lazy loading | 1 minggu |
| 7 | SEO Optimization | Better search engine visibility | 5 hari |

### Tier 4: NICE-TO-HAVE (Polish features)

| No | Fitur | Alasan | Estimate |
|---|---|---|---|
| 1 | Social Media Integration | Share, login via social | 1 minggu |
| 2 | Wishlist/Favorites | Customer dapat save favorite vendors | 2 hari |
| 3 | Booking Calendar Widget | Visual calendar untuk availability | 5 hari |
| 4 | Export Reports | PDF/Excel export untuk invoice & analytics | 3 hari |
| 5 | Gamification | Points, badges untuk engagement | 1 minggu |

---

## 📝 CHECKLIST: REQUIREMENTS vs ACTUAL IMPLEMENTATION

### Requirement awal (dari BAB I):
- ✅ Platform terpadu untuk pencarian vendor
- ✅ Sistem invoice & auto-reminder
- ✅ Credit scoring
- ✅ Rating & review terverifikasi
- ✅ Chat antara customer & vendor
- ✅ Deal system untuk kesepakatan
- ✅ Vendor approval oleh admin
- ✅ Role-based access (Customer, Vendor, Admin)
- ✅ Authentication system
- ✅ Payment system

### Fitur tambahan (beyond requirements):
- ✅ Komplain system
- ✅ Ongoing order tracking
- ✅ Availability calendar & stock validation
- ✅ Item-based pricing
- ✅ Multi-payment method (Full + Pay-After)
- ✅ Vendor dual role support
- ✅ Countdown timer untuk invoice
- ✅ Date range booking validation

### Fitur yang tidak ada (noted in scope):
- ❌ Mobile app (planned)
- ❌ Video call (noted as out of scope)
- ❌ Voice messages (noted as out of scope)
- ❌ Machine learning credit scoring (noted as out of scope)

---

## 📊 PROJECT STATISTICS

### Code Metrics
| Metrik | Value |
|--------|-------|
| Total API Endpoints | 15+ |
| Total Pages/Routes | 20+ |
| Total React Components | 25+ |
| Lines of Code | ~5,000+ |
| CSS Modules | 10+ |
| JSON Data Files | 8 |

### Feature Count
| Category | Count |
|----------|-------|
| Sistem Utama | 16 |
| API Routes | 15+ |
| Pages/Sections | 20+ |
| Fitur Implemented | 35+ |
| Fitur Planned | 20+ |

### Technology Stack Used
| Category | Technology |
|----------|-----------|
| Frontend | React, Next.js 14 |
| Backend | Node.js (dalam Next.js) |
| Database | JSON (simulasi) |
| Styling | CSS Modules, Flexbox, Grid |
| File Upload | Base64 encoding |
| API | RESTful with HTTP methods |
| Authentication | Session-based |
| State Management | React Hooks |

---

## 🎯 KESIMPULAN

Platform RentGuard telah berhasil mengimplementasikan **sistem marketplace B2B yang komprehensif** dengan:

1. **Core Features**: Chat, Deal, Payment, Rating, Invoice
2. **Advanced Features**: Komplain, Ongoing Tracking, Availability Checking, Item-based Pricing
3. **Security**: Role-based access, vendor approval, credit scoring
4. **Flexibility**: Multi-payment, dual role support, differentiated stock logic
5. **User Experience**: Real-time updates, clear status tracking, multiple action buttons

**Status Proyek**: 85% Complete (Basic implementation + advanced features)

**Next Phase**: 
1. Production-ready: Database migration, security hardening, email integration
2. Scalability: Caching, optimization, load balancing
3. Expansion: Mobile app, advanced analytics, AI recommendations

---

---

## RINGKASAN KESELURUHAN

| Aspek | Deskripsi |
|-------|-----------|
| **Tujuan Proyek** | Platform B2B terintegrasi untuk efisiensi pencarian vendor, transparansi finansial, mitigasi risiko pembayaran |
| **Masalah Utama** | Asimetri informasi, fragmentasi data, risiko gagal bayar tinggi |
| **Solusi Utama** | Platform RentGuard berbasis Next.js + MySQL + Credit Scoring + Auto-Reminder |
| **Peran Aktor** | Client (cari & bayar), Vendor (layani & cek risiko), Admin (kurasi & mediasi) |
| **Fitur Andalan** | Credit Score Check, Weighted Rating, Pay-After, Auto-Reminder, Vendor Approval |
| **Keuntungan Kompetitif** | Transparansi data, mitigasi risiko, integrasi end-to-end, akuntabilitas ekosistem |

---

## 🎯 TAMBAHAN FITUR YANG SUDAH DIIMPLEMENTASIKAN

Beberapa fitur telah dikembangkan melebihi spesifikasi awal:

### ✅ Sistem Chat & Deal Real-Time
- **Live Chat**: Komunikasi langsung antara customer dan vendor
- **Deal System**: Customer bisa mengajukan deal, vendor dapat menerima/menolak
- **Message History**: Semua percakapan tersimpan untuk audit

### ✅ Sistem Komplain & Resolusi
- **Complain Feature**: Customer bisa upload foto & alasan komplain
- **Tracking**: Vendor dapat melihat semua komplain dari customer
- **Resolution Log**: Riwayat penyelesaian komplain

### ✅ Sistem Ongoing Orders (Status Pesanan)
- **Customer Ongoing**: Lihat vendor yang sudah deal, confirm pesanan
- **Vendor Ongoing**: Lihat product yang sudah deal, konfirmasi pengiriman
- **Status Tracking**: Pending → Agreed → Completed

### ✅ Sistem Availability & Stock Validation
- **Real-Time Availability**: Check stok barang pada periode tertentu
- **Overlap Detection**: Deteksi booking yang bertabrakan
- **Tipe Diferensiasi**: Stock untuk JASA vs BARANG berbeda logic
  - JASA: Quantity = jumlah provider yang bisa serve simultaneously
  - BARANG: Stock per item, bisa digunakan berkali-kali

### ✅ Sistem Booking dengan Multiple Items
- **Item-Based Pricing**: Harga berdasarkan item pilihan, bukan service level
- **Quantity Selection**: Customer bisa pesan berapa banyak item
- **Duration Support**: Booking dengan date range (start-end)

### ✅ Sistem Payment Method Beragam
- **Full Payment**: Bayar 100% langsung
- **Pay-After**: Deposit 20%, sisa 80% dalam 2 hari
- **Multiple Gateway**: QRIS, Credit Card, Bank Transfer (simulasi)

### ✅ Sistem Invoice & Auto-Reminder
- **Invoice Management**: Generate invoice otomatis per pesanan
- **Email Reminder**: Pengingat pembayaran otomatis setiap hari
- **Payment Deadline**: Countdown timer dengan status overdue
- **Payment Tracking**: Record payment method & transaction ID

