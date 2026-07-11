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
    address TEXT,
    city VARCHAR(255),
    postalCode VARCHAR(20),
    bankName VARCHAR(255),
    accountNumber VARCHAR(255),
    accountHolder VARCHAR(255),
    ktp_status ENUM('not_submitted', 'pending', 'approved', 'rejected', 'not_applicable') DEFAULT 'not_submitted',
    ktp_data JSON,
    ktp_submitted_at DATETIME(3),
    ktp_verified_by VARCHAR(255),
    ktp_verified_at DATETIME(3),
    ktp_rejection_reason VARCHAR(500),
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
    identity_type VARCHAR(255),
    identity_number VARCHAR(255),
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

  -- Vendor Profiles (store vendor storefront data and metadata)
  CREATE TABLE IF NOT EXISTS vendor_profiles (
    vendor_id VARCHAR(255) PRIMARY KEY,
    vendor_name VARCHAR(255),
    vendor_logo TEXT,
    vendor_address TEXT,
    vendor_bio TEXT,
    is_online BOOLEAN DEFAULT false,
    last_active_at DATETIME(3),
    joined_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
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
    -- Store per-row item metadata, including per-item deskripsi values inside each item object
    items JSON,
    variations JSON,
    available_quantity INTEGER,
    availability INTEGER,
    pengiriman_rentguard BOOLEAN DEFAULT false,
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
    completed_at DATETIME(3),
    actual_return_date DATE,
    return_status VARCHAR(255),
    vendor_confirmed BOOLEAN DEFAULT false,
    customer_confirmed BOOLEAN DEFAULT false,
    settlement_date DATE,
    refund_status VARCHAR(255)
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
    shipping_address TEXT,
    payment_type VARCHAR(50),
    installment_1_amount DECIMAL(18,2),
    installment_1_due_date DATE,
    installment_1_status VARCHAR(50) DEFAULT 'pending',
    installment_1_paid_at DATETIME(3),
    installment_2_amount DECIMAL(18,2),
    installment_2_due_date DATE,
    installment_2_status VARCHAR(50) DEFAULT 'pending',
    installment_2_paid_at DATETIME(3),
    installment_3_amount DECIMAL(18,2),
    installment_3_due_date DATE,
    installment_3_status VARCHAR(50) DEFAULT 'pending',
    installment_3_paid_at DATETIME(3),
    vendor_discount DECIMAL(18,2) DEFAULT 0,
    vendor_discount_reason VARCHAR(255),
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

  -- Complaints handled through admin mediation before vendor refund confirmation
  -- vendor_id stores the vendor user ID and can be joined with vendor_profiles via vendor_id when storefront metadata is needed.
  CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    vendor_id VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    type ENUM('kerusakan', 'pembatalan') NOT NULL,
    description TEXT,
    evidence_url TEXT,
    customer_account_name VARCHAR(255),
    customer_account_number VARCHAR(255),
    customer_bank_name VARCHAR(255),
    status ENUM('PENDING_ADMIN', 'FORWARDED_TO_VENDOR', 'REFUND_PROCESSED', 'RESOLVED') NOT NULL DEFAULT 'PENDING_ADMIN',
    admin_note TEXT,
    vendor_note TEXT,
    refund_amount DECIMAL(18,2) DEFAULT 0,
    refund_method VARCHAR(100),
    refund_reference VARCHAR(255),
    refund_metadata TEXT,
    refund_proof_url TEXT,
    refund_paid_at DATETIME(3),
    admin_verified_at DATETIME(3),
    forwarded_at DATETIME(3),
    vendor_processed_at DATETIME(3),
    resolved_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    INDEX idx_complaints_user_id (user_id),
    INDEX idx_complaints_vendor_id (vendor_id),
    INDEX idx_complaints_transaction_id (transaction_id),
    INDEX idx_complaints_status (status),
    INDEX idx_complaints_type (type),
    INDEX idx_complaints_created_at (created_at)
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
    deal_id VARCHAR(255),
    rating INTEGER,
    review TEXT,
    vendor_reply TEXT,
    vendor_reply_at DATETIME(3),
    vendor_reply_by VARCHAR(255),
    weight_multiplier DECIMAL(5,2) DEFAULT 1.00,
    weighted_score DECIMAL(5,2) DEFAULT 0.00,
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

  DROP PROCEDURE IF EXISTS recalculate_ratings;
  CREATE PROCEDURE recalculate_ratings()
  UPDATE ratings r
  LEFT JOIN deals d ON d.id = r.deal_id
  SET
    r.weight_multiplier = ROUND(
      (
        1.0
        - LEAST(
            0.5,
            GREATEST(
              0,
              TIMESTAMPDIFF(DAY, COALESCE(d.created_at, r.created_at), NOW())
            ) * 0.01
          )
        + CASE
            WHEN COALESCE(d.final_price, 0) > 500000 THEN 0.5
            WHEN COALESCE(d.final_price, 0) > 100000 THEN 0.25
            ELSE 0
          END
      ),
      2
    ),
    r.weighted_score = ROUND(
      COALESCE(r.rating, 0) *
      (
        1.0
        - LEAST(
            0.5,
            GREATEST(
              0,
              TIMESTAMPDIFF(DAY, COALESCE(d.created_at, r.created_at), NOW())
            ) * 0.01
          )
        + CASE
            WHEN COALESCE(d.final_price, 0) > 500000 THEN 0.5
            WHEN COALESCE(d.final_price, 0) > 100000 THEN 0.25
            ELSE 0
          END
      ),
      2
    );

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
  ('1775934693221','1775934661453','4','1','svc-b17d93e4', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('1776954691440','1775939466935','1775589203562','2','svc-c2a86f5d', true, true, 'completed', '2026-04-23 14:31:31.440', '2026-04-23 14:31:39.581', NULL, NULL, NULL, NULL, 'paid', '2026-05-25 18:22:27.113', NULL, '2026-05-25', 'completed', true, true, '2026-05-25', 'processed'),
  ('1777493759494','1777493750510','4','3','svc-d93b7e16', true, true, 'completed', '2026-04-29 20:15:59.494', '2026-04-29 20:16:45.405', '{"type":"percent","value":20,"amount":10000}', 50000, 40000, '2026-04-29 20:17:00.762', 'paid', NULL, '2026-04-29 20:25:46.277', NULL, NULL, NULL, NULL, NULL, NULL)
  ;

  -- CHATS
  INSERT IGNORE INTO chats (id, service_id, service_title, vendor_id, vendor_name, customer_id, customer_name, messages, created_at, deal_status)
  VALUES
  ('1776963273496','svc-b17d93e4','Laptop Rental','1','Apple Vendor','4','Strawberry Customer', '[
    {"id":"1776963273496","senderId":"4","senderName":"Strawberry Customer","message":"halo","timestamp":"2026-04-23T16:54:33.496Z"},
    {"id":"1776963473195","senderId":"4","senderName":"Strawberry Customer","message":"tes","timestamp":"2026-04-23T16:57:53.195Z"},
    {"id":"1776963487422","senderId":"4","senderName":"Strawberry Customer","message":"coki","timestamp":"2026-04-23T16:58:07.422Z"},
    {"id":"1776963660320","senderId":"1","senderName":"Apple Vendor","message":"tes","timestamp":"2026-04-23T17:01:00.320Z"},
    {"id":"1776963678492","senderId":"4","senderName":"Strawberry Customer","message":"tes 3","timestamp":"2026-04-23T17:01:18.492Z"}
  ]', '2026-04-23 16:54:33.496', NULL),
  ('1777493750510','svc-d93b7e16','Paket Kursi & Meja Serbaguna','3','Orange Vendor','4','Strawberry Customer', '[
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
  ('notif_1775934693229','1','deal_pending','Ada penawaran baru dari customer','1775934661453', '{"customerId":"4","serviceId":"svc-b17d93e4"}', false, '2026-04-11 19:11:33.229'),
  ('notif_1776954699589','1775589203562','deal_accepted','Vendor menerima penawaran Anda!','1775939466935', '{"vendorId":"2","serviceId":"svc-c2a86f5d"}', false, '2026-04-23 14:31:39.589'),
  ('notif_1777493759509','3','deal_pending','Ada penawaran baru dari customer','1777493750510', '{"customerId":"4","serviceId":"svc-d93b7e16"}', false, '2026-04-29 20:15:59.509'),
  ('notif_1777493805417','4','deal_accepted','Vendor menerima penawaran Anda!','1777493750510', '{"vendorId":"3","serviceId":"svc-d93b7e16"}', false, '2026-04-29 20:16:45.417'),
  ('notif_1777493820734','2','deal_discount_applied','Vendor memberikan diskon. Harga akhir: Rp 40.000','1777493750510', '{"vendorId":"3","serviceId":"svc-d93b7e16","finalPrice":40000,"amount":10000}', false, '2026-04-29 20:17:00.734'),
  ('notif_1777493820785','2','deal_discount_applied','Vendor memberikan diskon. Harga akhir: Rp 40.000','1777493750510', '{"vendorId":"3","serviceId":"svc-d93b7e16","finalPrice":40000,"amount":10000}', false, '2026-04-29 20:17:00.785');

  -- ===============================================
  -- MIGRATION SCRIPT: Database Schema Upgrade v2
  -- Purpose: Add installment payment tracking columns
  -- Run this if upgrading an existing rent_guard database
  -- ===============================================
  
  -- Migration: Check if columns already exist and add them if needed
  SET @db_name = DATABASE();
  
  -- Add payment_type column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'payment_type'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN payment_type VARCHAR(50) AFTER shipping_address',
    'SELECT "Column payment_type already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_1_amount column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_1_amount'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_1_amount DECIMAL(18,2) AFTER payment_type',
    'SELECT "Column installment_1_amount already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_1_due_date column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_1_due_date'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_1_due_date DATE AFTER installment_1_amount',
    'SELECT "Column installment_1_due_date already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_1_status column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_1_status'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_1_status VARCHAR(50) DEFAULT "pending" AFTER installment_1_due_date',
    'SELECT "Column installment_1_status already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_1_paid_at column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_1_paid_at'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_1_paid_at DATETIME(3) AFTER installment_1_status',
    'SELECT "Column installment_1_paid_at already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_2_amount column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_2_amount'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_2_amount DECIMAL(18,2) AFTER installment_1_paid_at',
    'SELECT "Column installment_2_amount already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_2_due_date column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_2_due_date'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_2_due_date DATE AFTER installment_2_amount',
    'SELECT "Column installment_2_due_date already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_2_status column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_2_status'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_2_status VARCHAR(50) DEFAULT "pending" AFTER installment_2_due_date',
    'SELECT "Column installment_2_status already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_2_paid_at column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_2_paid_at'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_2_paid_at DATETIME(3) AFTER installment_2_status',
    'SELECT "Column installment_2_paid_at already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_3_amount column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_3_amount'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_3_amount DECIMAL(18,2) AFTER installment_2_paid_at',
    'SELECT "Column installment_3_amount already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_3_due_date column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_3_due_date'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_3_due_date DATE AFTER installment_3_amount',
    'SELECT "Column installment_3_due_date already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_3_status column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_3_status'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_3_status VARCHAR(50) DEFAULT "pending" AFTER installment_3_due_date',
    'SELECT "Column installment_3_status already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add installment_3_paid_at column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'installment_3_paid_at'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN installment_3_paid_at DATETIME(3) AFTER installment_3_status',
    'SELECT "Column installment_3_paid_at already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add vendor_discount column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'vendor_discount'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN vendor_discount DECIMAL(18,2) DEFAULT 0 AFTER installment_3_paid_at',
    'SELECT "Column vendor_discount already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  
  -- Add vendor_discount_reason column
  SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'vendor_discount_reason'
  );
  
  SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE transactions ADD COLUMN vendor_discount_reason VARCHAR(255) AFTER vendor_discount',
    'SELECT "Column vendor_discount_reason already exists"'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  -- RATINGS
  INSERT IGNORE INTO ratings (id, service_id, customer_id, vendor_id, rating, review, created_at) VALUES
  ('1775629001516','1775628740028','1775590828434','1775589203562',5,'','2026-04-08 06:16:41.516'),
  ('1775842253546','1775628740028','1775673041099','1775589203562',5,'meja taek tp bintang 5','2026-04-10 17:30:53.546')
  ;

  -- INVOICES
  INSERT IGNORE INTO invoices (id, deal_id, customer_id, vendor_id, service_id, transaction_id, remaining_payment, payment_deadline, payment_method, payment_type, status, created_at, paid_at, payment_transaction_id, notes) VALUES
  ('INV-1777477482432-125','1775934693221','4','1','svc-b17d93e4','TRX-1775936698530',175000,'2026-04-11 19:44:58.530','cod','full','paid','2026-04-11 19:44:58.649','2026-04-11 19:44:58.530','TRX-1775936698530',''),
  ('INV-1777493820663','1777493759494','4','3','svc-d93b7e16',NULL,40000,'2026-05-01 20:17:00.663','qris','deal_pending','paid','2026-04-29 20:17:00.663','2026-04-29 20:25:46.275','TRX-1777494346157','Menunggu pembayaran setelah deal disepakati dan diskon diterapkan.'),
  ('INV-1778046562801','1778044223791','4','3','svc-d93b7e16','TRX-1778046562756',4625000,'2026-05-06 05:49:22.756','qris','full','paid','2026-05-06 05:49:22.801','2026-05-06 05:49:22.756','TRX-1778046562756',''),
  ('INV-1779035853307-722','1776954691440','1775589203562','2','svc-c2a86f5d',NULL,0,'2026-04-25 14:31:39.581',NULL,'deal_pending','pending','2026-04-23 14:31:39.581',NULL,NULL,'Menunggu pembayaran setelah deal disepakati.')
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
  ('svc-4f8c2a91','1','Apple Vendor','Jasa Kreatif & Media','Videografi','Video Documentation','Jasa Kreatif & Media','jasa','Paket Fotografi Profesional','Dokumentasi foto berkualitas tinggi untuk acara spesial Anda','Kami menyediakan layanan fotografer profesional dengan peralatan terkini untuk mengabadikan momen berharga Anda. Tim kami berpengalaman dalam berbagai jenis fotografi.','Paket fotografi lengkap dengan editing dan soft copy hasil foto dalam resolusi tinggi. Kami siap melayani acara, pre-wedding, ulang tahun, dan kegiatan spesial lainnya.',1500000,4,3,'Pembayaran 50% di awal, 50% di hari acara. Biaya tambahan untuk venue di luar Surabaya Rp 500.000 per jam perjalanan.','Surabaya, Jawa Timur',4.8,24,'[]','{"brand":"Canon","camera":"EOS R6","lens":"24-70mm","duration":"6 jam"}','{"paket":["Half Day","Full Day","Pre-Wedding"]}','[{"label":"Brand","value":"Canon"},{"label":"Kamera","value":"EOS R6"},{"label":"Durasi","value":"6 jam"}]','["Foto hasil edit","Softcopy full resolution","Tim profesional"]','[{"id":"item-svc-001","namaJasa":"Paket Half Day","hargaSesi":1200000,"images":["https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=300&q=80"],"variationValues":{"paket":"Half Day"}},{"id":"item-svc-002","namaJasa":"Paket Full Day","hargaSesi":1800000,"images":["https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=300&q=80"],"variationValues":{"paket":"Full Day"}}]','{"paket":["Half Day","Full Day","Pre-Wedding"]}',3,3),
  ('svc-b17d93e4','1','Apple Vendor','Elektronik','Laptop','Gaming','Elektronik','barang','Laptop Gaming ASUS ROG Strix','Laptop gaming performa tinggi untuk kebutuhan editing dan bermain game','Laptop ini cocok untuk kebutuhan gaming, rendering, dan multitasking dengan performa yang stabil.','Spesifikasi lengkap tersedia, siap digunakan untuk kebutuhan harian dan profesional.',8500000,1,5,'Pengiriman langsung dan bisa nego untuk pembelian banyak unit.','Sidoarjo, Jawa Timur',4.7,18,'[]','{"brand":"ASUS","processor":"Intel Core i7","ram":"16GB","storage":"512GB","display":"15.6 inch"}','{"warna":["Hitam","Putih"],"kapasitas":["512GB","1TB"]}','[{"label":"Brand","value":"ASUS"},{"label":"Processor","value":"Intel Core i7"},{"label":"RAM","value":"16GB"}]','["Unit lengkap","Baterai terisi","Garansi resmi"]','[{"id":"item-lap-001","namaBarang":"Laptop Gaming ASUS ROG Strix","hargaPcs":450000,"stok":3,"images":["https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=300&q=80"],"variationValues":{"warna":"Hitam","kapasitas":"512GB"}},{"id":"item-lap-002","namaBarang":"Laptop Gaming ASUS ROG Strix","hargaPcs":550000,"stok":2,"images":["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&q=80"],"variationValues":{"warna":"Putih","kapasitas":"1TB"}}]','{"warna":["Hitam","Putih"],"kapasitas":["512GB","1TB"]}',5,1),
  ('svc-c2a86f5d','2','Banana Vendor','Elektronik','Kamera','Mirrorless','Elektronik','barang','Kamera Mirrorless Sony A6400','Kamera mirrorless ringan untuk konten dan fotografi sehari hari','Kamera ini ideal untuk vlog, traveling, dan dokumentasi dengan kualitas gambar tajam.','Tersedia body unit, baterai, dan charger. Cocok untuk pemula maupun creator.',12000000,1,3,'Bisa dikirim ke seluruh Indonesia dengan packing aman.','Gresik, Jawa Timur',4.8,12,'[]','{"brand":"Sony","type":"Mirrorless","sensor":"APS-C","battery":"NP-FW50"}','{"warna":["Hitam","Silver"],"kit":["Body Only","Kit Lens"]}','[{"label":"Brand","value":"Sony"},{"label":"Tipe","value":"Mirrorless"},{"label":"Sensor","value":"APS-C"}]','["Body unit","Baterai","Charger","Garansi resmi"]','[{"id":"item-cam-001","namaBarang":"Sony A6400 Body Only","hargaPcs":380000,"stok":2,"images":["https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=300&q=80"],"variationValues":{"warna":"Hitam","kit":"Body Only"}},{"id":"item-cam-002","namaBarang":"Sony A6400 Kit Lens","hargaPcs":450000,"stok":1,"images":["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80"],"variationValues":{"warna":"Silver","kit":"Kit Lens"}}]','{"warna":["Hitam","Silver"],"kit":["Body Only","Kit Lens"]}',3,1),
  ('svc-d93b7e16','3','Orange Vendor','Elektronik','Audio','Speaker','Elektronik','barang','Speaker JBL PartyBox Encore','Speaker portabel dengan suara bass kuat untuk acara indoor dan outdoor','Speaker ini cocok untuk pesta kecil, hangout, dan kebutuhan audio portabel.','Tersedia dalam warna hitam dan biru, bisa dipakai via Bluetooth.',3200000,1,4,'Pemesanan bisa dilakukan dengan sistem pre-order untuk stok tertentu.','Surabaya Barat, Jawa Timur',4.6,9,'[]','{"brand":"JBL","connectivity":"Bluetooth","power":"100W","battery":"18 jam"}','{"warna":["Hitam","Biru"],"mode":["Portabel","Party"]}','[{"label":"Brand","value":"JBL"},{"label":"Koneksi","value":"Bluetooth"},{"label":"Daya","value":"100W"}]','["Speaker unit","Kabel charger","Manual book"]','[{"id":"item-spk-001","namaBarang":"JBL PartyBox Encore","hargaPcs":180000,"stok":2,"images":["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&q=80"],"variationValues":{"warna":"Hitam","mode":"Portabel"}},{"id":"item-spk-002","namaBarang":"JBL PartyBox Encore","hargaPcs":220000,"stok":2,"images":["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80"],"variationValues":{"warna":"Biru","mode":"Party"}}]','{"warna":["Hitam","Biru"],"mode":["Portabel","Party"]}',4,1),
  ('svc-e64a1c73','1','Apple Vendor','Elektronik','Drone','Cinematic','Elektronik','barang','Drone DJI Mini 4 Pro','Drone ringkas untuk cinematic shot dan dokumentasi udara','Drone ini cocok untuk konten sosial media, pemetaan ringan, dan dokumentasi udara.','Termasuk remote controller dan baterai pengganti.',18000000,1,2,'Pengiriman memakai box pelindung dan ada layanan instalasi ringan.','Surabaya Timur, Jawa Timur',4.9,7,'[]','{"brand":"DJI","weight":"249g","battery":"45 menit","camera":"4K"}','{"warna":["Hitam","Putih"],"bundle":["Standard","Fly More Combo"]}','[{"label":"Brand","value":"DJI"},{"label":"Berat","value":"249g"},{"label":"Kamera","value":"4K"}]','["Remote controller","Baterai","Protector case"]','[{"id":"item-dro-001","namaBarang":"DJI Mini 4 Pro Standard","hargaPcs":550000,"stok":1,"images":["https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=300&q=80"],"variationValues":{"warna":"Hitam","bundle":"Standard"}},{"id":"item-dro-002","namaBarang":"DJI Mini 4 Pro Fly More","hargaPcs":700000,"stok":1,"images":["https://images.unsplash.com/photo-1508614999368-9260051292e5?w=300&q=80"],"variationValues":{"warna":"Putih","bundle":"Fly More Combo"}}]','{"warna":["Hitam","Putih"],"bundle":["Standard","Fly More Combo"]}',2,1),
  ('svc-f7d24b85','2','Banana Vendor','Elektronik','Televisi','Smart TV','Elektronik','barang','Smart TV Samsung 55 Inch','Smart TV berukuran 55 inci dengan kualitas visual jernih dan fitur smart platform','TV ini cocok untuk ruang keluarga, hiburan, dan kebutuhan multimedia rumah.','Tersedia garansi resmi dan layanan pengiriman ke rumah.',7500000,1,6,'Bisa dibantu pemasangan dasar di area tertentu dengan biaya tambahan.','Surabaya Selatan, Jawa Timur',4.5,11,'[]','{"brand":"Samsung","size":"55 inch","resolution":"4K","os":"Tizen"}','{"warna":["Hitam","Abu"],"stiker":["Standar","Wall Mount"]}','[{"label":"Brand","value":"Samsung"},{"label":"Ukuran","value":"55 inch"},{"label":"Resolusi","value":"4K"}]','["TV unit","Remote","Manual book","Garansi"]','[{"id":"item-tv-001","namaBarang":"Samsung Smart TV 55 Inch","hargaPcs":300000,"stok":3,"images":["https://images.unsplash.com/photo-1593784991095-a205069470b6?w=300&q=80"],"variationValues":{"warna":"Hitam","stiker":"Standar"}},{"id":"item-tv-002","namaBarang":"Samsung Smart TV 55 Inch","hargaPcs":350000,"stok":3,"images":["https://images.unsplash.com/photo-1461151304267-38535e780c79?w=300&q=80"],"variationValues":{"warna":"Abu","stiker":"Wall Mount"}}]','{"warna":["Hitam","Abu"],"stiker":["Standar","Wall Mount"]}',6,1),
  ('svc-0a9e5d32','1','Apple Vendor','Elektronik','Tablet','Produktivitas','Elektronik','barang','iPad Air 11 Inch','Tablet ringan dan cepat untuk belajar, bekerja, dan hiburan','Tablet ini sangat cocok untuk desain sederhana, dokumentasi, dan aktivitas harian yang membutuhkan layar besar.','Tersedia warna silver dan space gray dengan garansi resmi.',6500000,1,4,'Pengiriman cepat dan paket aman untuk perlindungan layar.','Mojokerto, Jawa Timur',4.6,10,'[]','{"brand":"Apple","model":"iPad Air","screen":"11 inch","storage":"128GB"}','{"warna":["Silver","Space Gray"],"storage":["128GB","256GB"]}','[{"label":"Brand","value":"Apple"},{"label":"Model","value":"iPad Air"},{"label":"Layar","value":"11 inch"}]','["Tablet unit","Charger","Garansi resmi"]','[{"id":"item-tab-001","namaBarang":"iPad Air 11 Inch","hargaPcs":220000,"stok":2,"images":["https://images.unsplash.com/photo-1561154464-82e9adf32764?w=300&q=80"],"variationValues":{"warna":"Silver","storage":"128GB"}},{"id":"item-tab-002","namaBarang":"iPad Air 11 Inch","hargaPcs":260000,"stok":2,"images":["https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=300&q=80"],"variationValues":{"warna":"Space Gray","storage":"256GB"}}]','{"warna":["Silver","Space Gray"],"storage":["128GB","256GB"]}',4,1),
  ('svc-1bc74f96','3','Orange Vendor','Elektronik','Console','Gaming','Elektronik','barang','PlayStation 5 Digital Edition','Konsol game modern dengan kualitas grafis tinggi dan performa stabil','Cocok untuk gaming solo, multiplayer, dan menikmati berbagai judul populer.','Termasuk controller dan bisa ditambah storage eksternal.',9000000,1,3,'Pemesanan bisa dikirim ke seluruh wilayah dengan packing aman.','Lamongan, Jawa Timur',4.8,8,'[]','{"brand":"Sony","model":"PS5 Digital","storage":"825GB","output":"4K"}','{"warna":["Hitam","Putih"],"storage":["825GB","1TB"]}','[{"label":"Brand","value":"Sony"},{"label":"Model","value":"PS5 Digital"},{"label":"Storage","value":"825GB"}]','["Konsol","Controller","Baterai"]','[{"id":"item-ps-001","namaBarang":"PS5 Digital Edition","hargaPcs":400000,"stok":2,"images":["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300&q=80"],"variationValues":{"warna":"Hitam","storage":"825GB"}},{"id":"item-ps-002","namaBarang":"PS5 Digital Edition","hargaPcs":470000,"stok":1,"images":["https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=300&q=80"],"variationValues":{"warna":"Putih","storage":"1TB"}}]','{"warna":["Hitam","Putih"],"storage":["825GB","1TB"]}',3,1),
  ('svc-2d8a6c41','2','Banana Vendor','Elektronik','Printer','Office','Elektronik','barang','Printer Laser Brother DCP-L2550D','Printer hemat dan cepat untuk kebutuhan kantor rumah maupun usaha kecil','Printer ini cocok untuk mencetak dokumen, laporan, dan arsip dengan hasil tajam.','Tersedia layanan instalasi sederhana dan tinta original.',2800000,1,5,'Pengiriman bisa dibantu dengan pemasangan awal di tempat.','Surabaya Utara, Jawa Timur',4.4,6,'[]','{"brand":"Brother","type":"Laser","network":"USB","paper":"A4"}','{"warna":["Hitam","Abu"],"fitur":["Cetak","Scan","Copy"]}','[{"label":"Brand","value":"Brother"},{"label":"Tipe","value":"Laser"},{"label":"Kertas","value":"A4"}]','["Printer unit","Kabel power","Manual book"]','[{"id":"item-prn-001","namaBarang":"Printer Laser Brother DCP-L2550D","hargaPcs":60000,"stok":3,"images":["https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&q=80"],"variationValues":{"warna":"Hitam","fitur":"Cetak"}},{"id":"item-prn-002","namaBarang":"Printer Laser Brother DCP-L2550D","hargaPcs":90000,"stok":2,"images":["https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&q=80"],"variationValues":{"warna":"Abu","fitur":"Scan"}}]','{"warna":["Hitam","Abu"],"fitur":["Cetak","Scan","Copy"]}',5,1),
  ('svc-3e95b2d8','1','Apple Vendor','Elektronik','Router','Network','Elektronik','barang','Router WiFi ASUS AX1800','Router cepat untuk kebutuhan internet rumah dan kantor kecil','Router ini cocok untuk streaming, video call, dan penggunaan multiple device secara bersamaan.','Dapat dipasang dengan pengaturan dasar gratis.',1800000,1,7,'Pengiriman aman dan dukungan setup ringan tersedia.','Sidoarjo, Jawa Timur',4.5,7,'[]','{"brand":"ASUS","standard":"WiFi 6","speed":"1800 Mbps","ports":"4"}','{"warna":["Hitam","Putih"],"model":["AX1800","AX3000"]}','[{"label":"Brand","value":"ASUS"},{"label":"Standar","value":"WiFi 6"},{"label":"Kecepatan","value":"1800 Mbps"}]','["Router unit","Kabel LAN","Manual setup"]','[{"id":"item-rtr-001","namaBarang":"Router WiFi ASUS AX1800","hargaPcs":80000,"stok":4,"images":["https://images.unsplash.com/photo-1591488320449-011701bb6704?w=300&q=80"],"variationValues":{"warna":"Hitam","model":"AX1800"}},{"id":"item-rtr-002","namaBarang":"Router WiFi ASUS AX3000","hargaPcs":110000,"stok":3,"images":["https://images.unsplash.com/photo-1551808525-51a94da548ce?w=300&q=80"],"variationValues":{"warna":"Putih","model":"AX3000"}}]','{"warna":["Hitam","Putih"],"model":["AX1800","AX3000"]}',7,1),
  ('svc-4ac6f0b7','3','Orange Vendor','Peralatan Rumah','Mesin Cuci','Laundry','Peralatan Rumah','barang','Mesin Cuci 8 Kg Polytron','Mesin cuci berkapasitas besar untuk kebutuhan keluarga','Mesin ini cocok untuk mencuci pakaian harian dan kebutuhan rumah tangga yang lebih banyak.','Tersedia fitur wash dan spin yang efisien.',3200000,1,2,'Pengiriman bisa disertai pemasangan di area tertentu dengan biaya tambahan.','Gresik, Jawa Timur',4.7,5,'[]','{"brand":"Polytron","capacity":"8 Kg","type":"Front Load","feature":"Spin"}','{"warna":["Putih","Abu"],"kapasitas":["8 Kg","10 Kg"]}','[{"label":"Brand","value":"Polytron"},{"label":"Kapasitas","value":"8 Kg"},{"label":"Tipe","value":"Front Load"}]','["Mesin cuci","Selang air","Manual book"]','[{"id":"item-wsh-001","namaBarang":"Mesin Cuci Polytron 8 Kg","hargaPcs":150000,"stok":1,"images":["https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=300&q=80"],"variationValues":{"warna":"Putih","kapasitas":"8 Kg"}},{"id":"item-wsh-002","namaBarang":"Mesin Cuci Polytron 10 Kg","hargaPcs":190000,"stok":1,"images":["https://images.unsplash.com/photo-1579267212100-2d4f7d36c791?w=300&q=80"],"variationValues":{"warna":"Abu","kapasitas":"10 Kg"}}]','{"warna":["Putih","Abu"],"kapasitas":["8 Kg","10 Kg"]}',2,1),
  ('svc-5bd1a8e9','2','Banana Vendor','Peralatan Rumah','Kipas Angin','Pendingin','Peralatan Rumah','barang','Kipas Angin Standing Miyako','Kipas angin berdiri dengan desain modern dan sirkulasi udara kuat','Kipas ini cocok untuk kamar, ruang tamu, dan area kerja yang membutuhkan udara segar.','Dapat dipakai dengan beberapa mode kecepatan dan timer.',950000,1,8,'Pengiriman cepat dan aman untuk area perkotaan.','Mojokerto, Jawa Timur',4.3,4,'[]','{"brand":"Miyako","type":"Standing Fan","speed":"3 mode","timer":"Yes"}','{"warna":["Hitam","Putih"],"mode":["Low","Medium","High"]}','[{"label":"Brand","value":"Miyako"},{"label":"Tipe","value":"Standing Fan"},{"label":"Mode","value":"3 mode"}]','["Kipas unit","Remote","Manual book"]','[{"id":"item-fan-001","namaBarang":"Kipas Angin Miyako Standing","hargaPcs":35000,"stok":4,"images":["https://images.unsplash.com/photo-1577480245455-f6b9f5b0dbf8?w=300&q=80"],"variationValues":{"warna":"Hitam","mode":"Low"}},{"id":"item-fan-002","namaBarang":"Kipas Angin Miyako Standing","hargaPcs":40000,"stok":4,"images":["https://images.unsplash.com/photo-1575587310241-b2f0c0143f74?w=300&q=80"],"variationValues":{"warna":"Putih","mode":"High"}}]','{"warna":["Hitam","Putih"],"mode":["Low","Medium","High"]}',8,1),
  ('svc-6ce2b4f0','1','Apple Vendor','Olahraga','Sepeda','Mountain Bike','Olahraga','barang','Sepeda Gunung Polygon Xtrada','Sepeda gunung cocok untuk perjalanan luar kota dan latihan fisik','Sepeda ini ideal untuk off-road ringan, trekking, dan aktivitas olahraga harian.','Termasuk set roda dan beberapa perlengkapan dasar.',4200000,1,3,'Bisa dikirim dengan box pelindung dan cek kondisi sebelum kirim.','Lamongan, Jawa Timur',4.8,6,'[]','{"brand":"Polygon","type":"Mountain Bike","frame":"Aluminium","gear":"21 speed"}','{"warna":["Hitam","Merah"],"ukuran":["S","M","L"]}','[{"label":"Brand","value":"Polygon"},{"label":"Tipe","value":"Mountain Bike"},{"label":"Gear","value":"21 speed"}]','["Sepeda unit","Kunci roda","Tool kit"]','[{"id":"item-bik-001","namaBarang":"Polygon Xtrada MTB","hargaPcs":130000,"stok":2,"images":["https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=300&q=80"],"variationValues":{"warna":"Hitam","ukuran":"M"}},{"id":"item-bik-002","namaBarang":"Polygon Xtrada MTB","hargaPcs":145000,"stok":1,"images":["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=300&q=80"],"variationValues":{"warna":"Merah","ukuran":"L"}}]','{"warna":["Hitam","Merah"],"ukuran":["S","M","L"]}',3,1),
  ('svc-7df3c9a2','3','Orange Vendor','Fashion','Jam Tangan','Smartwatch','Fashion','barang','Smartwatch Xiaomi Watch S1','Jam tangan pintar dengan fitur kesehatan dan notifikasi pintar','Cocok untuk memantau detak jantung, langkah, dan aktivitas harian.','Tersedia strap interchangeable dan layar AMOLED.',2200000,1,6,'Pengiriman aman dan bisa ditambahkan gift box.','Surabaya Pusat, Jawa Timur',4.6,9,'[]','{"brand":"Xiaomi","model":"Watch S1","battery":"14 hari","display":"AMOLED"}','{"warna":["Hitam","Abu"],"strap":["Silicone","Leather"]}','[{"label":"Brand","value":"Xiaomi"},{"label":"Model","value":"Watch S1"},{"label":"Battery","value":"14 hari"}]','["Smartwatch unit","Charger","Guide book"]','[{"id":"item-swt-001","namaBarang":"Xiaomi Watch S1","hargaPcs":75000,"stok":3,"images":["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&q=80"],"variationValues":{"warna":"Hitam","strap":"Silicone"}},{"id":"item-swt-002","namaBarang":"Xiaomi Watch S1","hargaPcs":90000,"stok":3,"images":["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80"],"variationValues":{"warna":"Abu","strap":"Leather"}}]','{"warna":["Hitam","Abu"],"strap":["Silicone","Leather"]}',6,1),
  ('svc-8ea4d7b5','2','Banana Vendor','Fashion','Kamera','Action Camera','Fashion','barang','Action Camera GoPro Hero 12','Kamera aksi tahan air untuk dokumentasi travel dan olahraga ekstrem','Cocok untuk vlog, surfing, hiking, dan momen outdoor yang dinamis.','Tersedia mounting accessories dan baterai cadangan.',5600000,1,4,'Packing aman dan pengiriman cepat ke seluruh Indonesia.','Surabaya Barat, Jawa Timur',4.7,8,'[]','{"brand":"GoPro","model":"Hero 12","waterproof":"10m","battery":"1.5 jam"}','{"warna":["Hitam","Silver"],"accessories":["Mount","Battery"]}','[{"label":"Brand","value":"GoPro"},{"label":"Model","value":"Hero 12"},{"label":"Waterproof","value":"10m"}]','["Action camera","Baterai","Mounting kit"]','[{"id":"item-gpr-001","namaBarang":"GoPro Hero 12","hargaPcs":240000,"stok":2,"images":["https://images.unsplash.com/photo-1526178613552-2b45c6c302f0?w=300&q=80"],"variationValues":{"warna":"Hitam","accessories":"Mount"}},{"id":"item-gpr-002","namaBarang":"GoPro Hero 12","hargaPcs":270000,"stok":2,"images":["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&q=80"],"variationValues":{"warna":"Silver","accessories":"Battery"}}]','{"warna":["Hitam","Silver"],"accessories":["Mount","Battery"]}',4,1),
  ('svc-9fb5e2c6','1','Apple Vendor','Elektronik','Laptop','Ultrabook','Elektronik','barang','Laptop Lenovo ThinkPad X1','Laptop tipis dan ringan untuk kerja produktif dan presentasi','Laptop ini sangat cocok untuk pekerjaan kantor, rapat online, dan mobilitas tinggi.','Tersedia SSD cepat dan layar full HD.',13500000,1,2,'Pengiriman bisa disertai instalasi perangkat lunak dasar.','Surabaya Timur, Jawa Timur',4.9,5,'[]','{"brand":"Lenovo","processor":"Intel Core i5","ram":"16GB","storage":"512GB","display":"14 inch"}','{"warna":["Hitam","Abu"],"storage":["256GB","512GB"]}','[{"label":"Brand","value":"Lenovo"},{"label":"Processor","value":"Intel Core i5"},{"label":"RAM","value":"16GB"}]','["Laptop unit","Charger","Garansi resmi"]','[{"id":"item-lnv-001","namaBarang":"Lenovo ThinkPad X1","hargaPcs":500000,"stok":1,"images":["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&q=80"],"variationValues":{"warna":"Hitam","storage":"256GB"}},{"id":"item-lnv-002","namaBarang":"Lenovo ThinkPad X1","hargaPcs":620000,"stok":1,"images":["https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=300&q=80"],"variationValues":{"warna":"Abu","storage":"512GB"}}]','{"warna":["Hitam","Abu"],"storage":["256GB","512GB"]}',2,1)
  ;

    CALL recalculate_ratings();
