-- Full MySQL setup for proyek-bisnis
-- Run this from the repository root with mysql:
-- mysql -u <user> -p < sql/proyek_bisnis.sql
--
-- This file targets MySQL and creates the rent_guard database.

DROP DATABASE IF EXISTS rent_guard;
CREATE DATABASE rent_guard;
USE rent_guard;

-- Role lookup table
DROP TABLE IF EXISTS roles;
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY,
  role VARCHAR(255) NOT NULL UNIQUE
);

INSERT IGNORE INTO roles (id, role) VALUES
  (1, 'customer'),
  (2, 'vendor'),
  (3, 'admin');

-- Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255),
  password VARCHAR(255),
  name VARCHAR(255),
  role_id INT,
  role VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

-- Role ID mapping:
-- 1 = customer, 2 = vendor, 3 = admin


-- Vendor Registrations (for admin approval workflow)
CREATE TABLE IF NOT EXISTS vendor_registrations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  vendor_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255),
  identity_file LONGTEXT,
  identity_file_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  submitted_at DATETIME(3),
  approved_at DATETIME(3),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Services (store complex nested fields as JSON)
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(255) PRIMARY KEY,
  vendor_id VARCHAR(255),
  vendor_name VARCHAR(255),
  main_category VARCHAR(255),
  sub_category VARCHAR(255),
  super_sub_category VARCHAR(255),
  category VARCHAR(255),
  type VARCHAR(255),
  title VARCHAR(255),
  short_description TEXT,
  description TEXT,
  detail_description TEXT,
  price DECIMAL(18,2),
  minimum_days INTEGER,
  quantity INTEGER,
  rental_policy TEXT,
  location VARCHAR(255),
  rating DECIMAL(18,2),
  rent_count INTEGER,
  images JSON,
  specifications JSON,
  specification_options JSON,
  description_table JSON,
  checklist JSON,
  items JSON,
  variations JSON,
  available_quantity INTEGER,
  availability INTEGER,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

-- Chats (messages stored as JSON)
CREATE TABLE IF NOT EXISTS chats (
  id VARCHAR(255) PRIMARY KEY,
  service_id VARCHAR(255),
  service_title VARCHAR(255),
  vendor_id VARCHAR(255),
  vendor_name VARCHAR(255),
  customer_id VARCHAR(255),
  customer_name VARCHAR(255),
  item_id VARCHAR(255),
  item_name VARCHAR(255),
  messages JSON,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3),
  deal_status VARCHAR(255)
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id VARCHAR(255) PRIMARY KEY,
  chat_id VARCHAR(255),
  customer_id VARCHAR(255),
  vendor_id VARCHAR(255),
  service_id VARCHAR(255),
  customer_accepted BOOLEAN,
  vendor_accepted BOOLEAN,
  status VARCHAR(255),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  agreed_at DATETIME(3),
  discount JSON,
  original_price DECIMAL(18,2),
  final_price DECIMAL(18,2),
  discount_updated_at DATETIME(3),
  invoice_status VARCHAR(255),
  payment_confirmed_at DATETIME(3),
  completed_at DATETIME(3)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255),
  deal_id VARCHAR(255),
  service_id VARCHAR(255),
  user_id VARCHAR(255),
  promo_id VARCHAR(255),
  payment_method VARCHAR(255),
  base_price DECIMAL(18,2),
  quantity INTEGER,
  quantity_type VARCHAR(255),
  duration_days INTEGER,
  notes TEXT,
  start_date DATE,
  amount DECIMAL(18,2),
  service_fee DECIMAL(18,2),
  total_amount DECIMAL(18,2),
  status VARCHAR(255),
  timestamp DATETIME(3),
  card_details JSON,
  qr_code VARCHAR(255),
  identity_verification JSON,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(255) PRIMARY KEY,
  deal_id VARCHAR(255),
  customer_id VARCHAR(255),
  vendor_id VARCHAR(255),
  service_id VARCHAR(255),
  transaction_id VARCHAR(255),
  remaining_payment DECIMAL(18,2),
  payment_deadline DATETIME(3),
  payment_method VARCHAR(255),
  payment_type VARCHAR(255),
  status VARCHAR(255),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  paid_at DATETIME(3),
  payment_transaction_id VARCHAR(255),
  notes TEXT
);

-- Return requests / complaints linked to invoices
CREATE TABLE IF NOT EXISTS return_requests (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL,
  deal_id VARCHAR(255),
  customer_id VARCHAR(255),
  vendor_id VARCHAR(255),
  service_id VARCHAR(255),
  request_type VARCHAR(50),
  item_condition VARCHAR(255),
  complaint_category VARCHAR(255),
  description TEXT,
  photos JSON,
  status VARCHAR(255),
  damage_status VARCHAR(50),
  damage_charge DECIMAL(18,2) DEFAULT 0,
  damage_invoice_id VARCHAR(255),
  late_charge DECIMAL(18,2) DEFAULT 0,
  total_refund DECIMAL(18,2) DEFAULT 0,
  complaint_resolution VARCHAR(100),
  complaint_penalty DECIMAL(18,2) DEFAULT 0,
  vendor_notes TEXT,
  customer_confirmed BOOLEAN DEFAULT false,
  vendor_confirmed BOOLEAN DEFAULT false,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3),
  resolved_at DATETIME(3)
);

-- Vendor-custom category hierarchy (parent > sub > super-sub)
CREATE TABLE IF NOT EXISTS category_parents (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS category_sub_categories (
  id VARCHAR(255) PRIMARY KEY,
  parent_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_sub_per_parent (parent_id, name)
);

CREATE TABLE IF NOT EXISTS category_super_sub_categories (
  id VARCHAR(255) PRIMARY KEY,
  sub_category_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_super_sub_per_sub (sub_category_id, name)
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  service_id VARCHAR(255),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  type VARCHAR(255),
  message TEXT,
  related_id VARCHAR(255),
  related_data JSON,
  is_read BOOLEAN DEFAULT false,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id VARCHAR(255) PRIMARY KEY,
  service_id VARCHAR(255),
  customer_id VARCHAR(255),
  vendor_id VARCHAR(255),
  rating INTEGER,
  review TEXT,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

-- Promos
CREATE TABLE IF NOT EXISTS promos (
  id VARCHAR(255) PRIMARY KEY,
  vendor_id VARCHAR(255),
  vendor_name VARCHAR(255),
  title VARCHAR(255),
  image TEXT,
  promo_price DECIMAL(18,2),
  description TEXT,
  active BOOLEAN,
  start_at DATETIME(3),
  end_at DATETIME(3),
  max_applicants INTEGER,
  claim_limit_per_user INTEGER,
  claimed_count INTEGER DEFAULT 0,
  claimed_user_ids JSON,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)
);

-- Generic JSON-backed store for datasets that are still represented as JSON arrays
CREATE TABLE IF NOT EXISTS app_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  data JSON NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE(dataset, record_id)
);

CREATE INDEX idx_app_data_dataset ON app_data(dataset);

-- Add foreign key constraints and indexes after table creation to ensure correct ordering
ALTER TABLE deals
  ADD CONSTRAINT fk_deals_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_deals_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_deals_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_deals_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

ALTER TABLE chats
  ADD CONSTRAINT fk_chats_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_chats_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_chats_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_transactions_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_transactions_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_transactions_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_invoices_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_invoices_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE return_requests
  ADD CONSTRAINT fk_return_requests_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_return_requests_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_return_requests_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_return_requests_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_return_requests_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_return_requests_damage_invoice FOREIGN KEY (damage_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE category_sub_categories
  ADD CONSTRAINT fk_category_sub_parent FOREIGN KEY (parent_id) REFERENCES category_parents(id) ON DELETE CASCADE;

ALTER TABLE category_super_sub_categories
  ADD CONSTRAINT fk_category_super_sub_sub FOREIGN KEY (sub_category_id) REFERENCES category_sub_categories(id) ON DELETE CASCADE;

ALTER TABLE favorites
  ADD CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_favorites_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ratings
  ADD CONSTRAINT fk_ratings_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ratings_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ratings_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE promos
  ADD CONSTRAINT fk_promos_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE services
  ADD CONSTRAINT fk_services_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_deals_customer ON deals(customer_id);
CREATE INDEX idx_deals_vendor ON deals(vendor_id);
CREATE INDEX idx_chats_service ON chats(service_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_invoices_deal ON invoices(deal_id);
CREATE INDEX idx_services_vendor ON services(vendor_id);
CREATE INDEX idx_return_requests_invoice ON return_requests(invoice_id);
CREATE INDEX idx_return_requests_customer ON return_requests(customer_id);
CREATE INDEX idx_return_requests_vendor ON return_requests(vendor_id);
CREATE INDEX idx_return_requests_deal ON return_requests(deal_id);

-- Combined INSERTs for JSON-derived data
-- Run this after schema creation in proyek_bisnis_db

-- USERS
INSERT IGNORE INTO users (id, username, password, name, role_id, role, email, phone, created_at) VALUES
('1','apple','123','Apple Vendor',2,'vendor','apple@rentguard.com','081234567890','2026-04-01 00:00:00'),
('2','banana','123','Banana Vendor',2,'vendor','banana@rentguard.com','081234567891','2026-04-01 00:00:00'),
('3','orange','123','Orange Vendor',2,'vendor','orange@rentguard.com','081234567892','2026-04-01 00:00:00'),
('4','strawberry','123','Strawberry Customer',1,'customer','strawberry@rentguard.com','089876543210','2026-04-02 00:00:00'),
('5','grape','123','Grape Customer',1,'customer','grape@rentguard.com','089876543211','2026-04-02 00:00:00'),
('6','admin','123','Admin Rentguard',3,'admin','admin@rentguard.com','089872391012','2026-04-03 00:00:00')

;

-- TRANSACTIONS
INSERT IGNORE INTO transactions (id, invoice_id, deal_id, user_id, payment_method, base_price, quantity, quantity_type, duration_days, notes, start_date, amount, service_fee, total_amount, status, timestamp, card_details, qr_code, identity_verification, created_at)
VALUES
('TRX-1775936698530', NULL, '1775934693221', '4', 'cod', 150000, 1, 'Unit', 1, '', '2026-04-11', 150000, 25000, 175000, 'success', '2026-04-11 19:44:58.530', NULL, NULL, NULL, '2026-04-11 19:44:58.649'),
('TRX-1777494346157', 'INV-1777493820663', '1777493759494', '4', 'qris', NULL, NULL, NULL, NULL, NULL, NULL, 40000, NULL, NULL, 'success', '2026-04-29 20:25:46.157', NULL, 'QR-1777494346157', NULL, '2026-04-29 20:25:46.249')
;

-- DEALS
INSERT IGNORE INTO deals (id, chat_id, customer_id, vendor_id, service_id, customer_accepted, vendor_accepted, status, created_at, agreed_at, discount, original_price, final_price, discount_updated_at, invoice_status, payment_confirmed_at, completed_at, actual_return_date, return_status, vendor_confirmed, customer_confirmed, settlement_date, refund_status)
VALUES
('1775934693221','1775934661453','4','1','s1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('1776954691440','1775939466935','1775589203562','2','s2', true, true, 'completed', '2026-04-23 14:31:31.440', '2026-04-23 14:31:39.581', NULL, NULL, NULL, NULL, 'paid', '2026-05-25 18:22:27.113', NULL, '2026-05-25', 'completed', true, true, '2026-05-25', 'processed'),
('1777493759494','1777493750510','4','3','1704067202000', true, true, 'completed', '2026-04-29 20:15:59.494', '2026-04-29 20:16:45.405', '{"type":"percent","value":20,"amount":10000}', 50000, 40000, '2026-04-29 20:17:00.762', 'paid', NULL, '2026-04-29 20:25:46.277', NULL, NULL, NULL, NULL, NULL, NULL)
;

-- CHATS
INSERT IGNORE INTO chats (id, service_id, service_title, vendor_id, vendor_name, customer_id, customer_name, messages, created_at, deal_status)
VALUES
('1776963273496','s1','Laptop Rental','1','Apple Vendor','4','Strawberry Customer', '[
  {"id":"1776963273496","senderId":"4","senderName":"Strawberry Customer","message":"halo","timestamp":"2026-04-23T16:54:33.496Z"},
  {"id":"1776963473195","senderId":"4","senderName":"Strawberry Customer","message":"tes","timestamp":"2026-04-23T16:57:53.195Z"},
  {"id":"1776963487422","senderId":"4","senderName":"Strawberry Customer","message":"coki","timestamp":"2026-04-23T16:58:07.422Z"},
  {"id":"1776963660320","senderId":"1","senderName":"Apple Vendor","message":"tes","timestamp":"2026-04-23T17:01:00.320Z"},
  {"id":"1776963678492","senderId":"4","senderName":"Strawberry Customer","message":"tes 3","timestamp":"2026-04-23T17:01:18.492Z"}
]', '2026-04-23 16:54:33.496', NULL),
('1777493750510','1704067202000','Paket Kursi & Meja Serbaguna','3','Orange Vendor','4','Strawberry Customer', '[
  {"id":"1777493750510","senderId":"4","senderName":"Strawberry Customer","message":"beli","timestamp":"2026-04-29T20:15:50.510Z"},
  {"id":"1777493756588","senderId":"4","senderName":"Strawberry Customer","message":"sewa deh","timestamp":"2026-04-29T20:15:56.588Z"},
  {"id":"1777493796515","senderId":"3","senderName":"Orange Vendor","message":"iya silahkah","timestamp":"2026-04-29T20:16:36.515Z"},
  {"id":"9f4374a2-b8cb-4927-bf91-ae98b2d8661b","senderId":"3","senderName":"Orange Vendor","message":"eh","timestamp":"2026-05-19T01:59:57.243Z"},
  {"id":"c4200493-ff4c-4096-aebb-a6ebdd379636","senderId":"3","senderName":"Orange Vendor","message":"halo","timestamp":"2026-05-19T01:59:58.570Z"},
  {"id":"ff0fb5b8-24b9-461b-b3fd-e2621684a7da","senderId":"4","senderName":"Strawberry Customer","message":"haloo bang","timestamp":"2026-05-19T02:00:11.410Z"}
]', '2026-04-29 20:15:50.510', 'agreed')
;

-- NOTIFICATIONS
INSERT IGNORE INTO notifications (id, user_id, type, message, related_id, related_data, is_read, created_at) VALUES
('notif_1712594400000','1775590828434','deal_accepted','Vendor menerima penawaran Anda!','chat_1', '{"vendorId":"vendor_1","serviceId":"service_1"}', false, '2026-04-08 10:00:00.000'),
('notif_1712594500000','1775590828434','deal_pending','Ada penawaran baru dari customer','chat_2', '{"customerId":"customer_1","serviceId":"service_2"}', false, '2026-04-08 10:05:00.000'),
('notif_1775628912047','1775589203562','deal_pending','Ada penawaran baru dari customer','1775628806493', '{"customerId":"1775590828434","serviceId":"1775628740028"}', false, '2026-04-08 06:15:12.047'),
('notif_1775628935465','1775590828434','deal_accepted','Vendor menerima penawaran Anda!','1775628806493', '{"vendorId":"1775589203562","serviceId":"1775628740028"}', false, '2026-04-08 06:15:35.465'),
('notif_1775917475084','1775589203562','deal_pending','Ada penawaran baru dari customer','1775917472761', '{"customerId":"1775917450950","serviceId":"1775628740028"}', false, '2026-04-11 14:24:35.084'),
('notif_1775917490008','1775917450950','deal_accepted','Vendor menerima penawaran Anda!','1775917472761', '{"vendorId":"1775589203562","serviceId":"1775628740028"}', false, '2026-04-11 14:24:50.008'),
('notif_1775934693229','1','deal_pending','Ada penawaran baru dari customer','1775934661453', '{"customerId":"4","serviceId":"s1"}', false, '2026-04-11 19:11:33.229'),
('notif_1776954699589','1775589203562','deal_accepted','Vendor menerima penawaran Anda!','1775939466935', '{"vendorId":"2","serviceId":"s2"}', false, '2026-04-23 14:31:39.589'),
('notif_1777493759509','3','deal_pending','Ada penawaran baru dari customer','1777493750510', '{"customerId":"4","serviceId":"1704067202000"}', false, '2026-04-29 20:15:59.509'),
('notif_1777493805417','4','deal_accepted','Vendor menerima penawaran Anda!','1777493750510', '{"vendorId":"3","serviceId":"1704067202000"}', false, '2026-04-29 20:16:45.417'),
('notif_1777493820734','2','deal_discount_applied','Vendor memberikan diskon. Harga akhir: Rp 40.000','1777493750510', '{"vendorId":"3","serviceId":"1704067202000","finalPrice":40000,"amount":10000}', false, '2026-04-29 20:17:00.734'),
('notif_1777493820785','2','deal_discount_applied','Vendor memberikan diskon. Harga akhir: Rp 40.000','1777493750510', '{"vendorId":"3","serviceId":"1704067202000","finalPrice":40000,"amount":10000}', false, '2026-04-29 20:17:00.785')
;

-- RATINGS
INSERT IGNORE INTO ratings (id, service_id, customer_id, vendor_id, rating, review, created_at) VALUES
('1775629001516','1775628740028','1775590828434','1775589203562',5,'','2026-04-08 06:16:41.516'),
('1775842253546','1775628740028','1775673041099','1775589203562',5,'meja taek tp bintang 5','2026-04-10 17:30:53.546')
;

-- INVOICES
INSERT IGNORE INTO invoices (id, deal_id, customer_id, vendor_id, service_id, transaction_id, remaining_payment, payment_deadline, payment_method, payment_type, status, created_at, paid_at, payment_transaction_id, notes) VALUES
('INV-1777477482432-125','1775934693221','4','1','s1','TRX-1775936698530',175000,'2026-04-11 19:44:58.530','cod','full','paid','2026-04-11 19:44:58.649','2026-04-11 19:44:58.530','TRX-1775936698530',''),
('INV-1777493820663','1777493759494','4','3','1704067202000',NULL,40000,'2026-05-01 20:17:00.663','qris','deal_pending','paid','2026-04-29 20:17:00.663','2026-04-29 20:25:46.275','TRX-1777494346157','Menunggu pembayaran setelah deal disepakati dan diskon diterapkan.'),
('INV-1778046562801','1778044223791','4','3','1704067202000','TRX-1778046562756',4625000,'2026-05-06 05:49:22.756','qris','full','paid','2026-05-06 05:49:22.801','2026-05-06 05:49:22.756','TRX-1778046562756',''),
('INV-1779035853307-722','1776954691440','1775589203562','2','s2',NULL,0,'2026-04-25 14:31:39.581',NULL,'deal_pending','pending','2026-04-23 14:31:39.581',NULL,NULL,'Menunggu pembayaran setelah deal disepakati.')
;

-- PROMOS
INSERT IGNORE INTO promos (id, vendor_id, vendor_name, title, image, promo_price, description, active, created_at, updated_at) VALUES
('1779035490944','2','Banana Vendor','Promo', NULL, 500000, 'beli 3 dapat 1', true, '2026-05-17 16:31:30.945','2026-05-17 16:31:30.945'),
('1779036343766','2','Banana Vendor','PROMO SEDEKAH', NULL, 400000, 'JEJE GANTENG', true, '2026-05-17 16:45:43.766','2026-05-17 16:45:43.766'),
('1779036635843','2','Banana Vendor','THIS IS THE END', NULL, 299998, 'GET NO', true, '2026-05-17 16:50:35.843','2026-05-17 16:50:35.843')
;

-- SERVICES
INSERT IGNORE INTO services (id, vendor_id, vendor_name, main_category, sub_category, super_sub_category, category, type, title, short_description, description, detail_description, price, minimum_days, quantity, rental_policy, location, rating, rent_count, images, specifications, specification_options, description_table, checklist, items, variations, available_quantity, availability)
VALUES
('1704067200000','1','Apple Vendor','Jasa Kreatif & Media','Videografi','Video Documentation','Jasa Kreatif & Media','jasa','Paket Fotografi Profesional','Dokumentasi foto berkualitas tinggi untuk acara spesial Anda','Kami menyediakan layanan fotografer profesional dengan peralatan terkini untuk mengabadikan momen berharga Anda. Tim kami berpengalaman dalam berbagai jenis fotografi.','Paket fotografi lengkap dengan editing dan soft copy hasil foto dalam resolusi tinggi. Kami siap melayani acara, pre-wedding, ulang tahun, dan kegiatan spesial lainnya.',1500000,4,3,'Pembayaran 50% di awal, 50% di hari acara. Biaya tambahan untuk venue di luar Jakarta Rp 500.000 per jam perjalanan.','Surabaya, Indonesia',4.8,24, '[
  {"id":"item-foto-halfday","namaJasa":"Half Day (6 jam)","hargaSesi":1200000,"images":["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80"],"variationValues":{},"specOptionValues":{}},
  {"id":"item-foto-fullday","namaJasa":"Full Day (12 jam)","hargaSesi":2000000,"images":["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&q=80"],"variationValues":{},"specOptionValues":{}},
  {"id":"item-foto-pre-wed","namaJasa":"Paket Pre-Wedding (2 lokasi, 8 jam)","hargaSesi":1500000,"images":["https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=300&q=80"],"variationValues":{},"specOptionValues":{}}
 ]', '{}', '{}', '{}', '{}', '[]', '{}', 3, 3)
;
