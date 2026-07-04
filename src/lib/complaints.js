import { query } from '@/lib/db';

const COMPLAINT_STATUSES = {
  PENDING_ADMIN: 'PENDING_ADMIN',
  FORWARDED_TO_VENDOR: 'FORWARDED_TO_VENDOR',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  RESOLVED: 'RESOLVED'
};

function normalizeComplaintType(type) {
  const raw = String(type || '').trim().toLowerCase();
  if (['kerusakan', 'damage', 'complaint'].includes(raw)) return 'kerusakan';
  if (['pembatalan', 'cancel', 'cancellation'].includes(raw)) return 'pembatalan';
  return null;
}

function parseEvidenceUrl(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.filter(Boolean)[0] || '';
  return String(value);
}

function normalizePersonName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeAccountNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

export async function ensureComplaintsTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS complaints (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      vendor_id VARCHAR(255) NOT NULL,
      transaction_id VARCHAR(255) NOT NULL,
      type ENUM('kerusakan', 'pembatalan') NOT NULL,
      description TEXT,
      evidence_url TEXT,
      status ENUM('PENDING_ADMIN', 'FORWARDED_TO_VENDOR', 'REFUND_PROCESSED', 'RESOLVED') NOT NULL DEFAULT 'PENDING_ADMIN',
      admin_note TEXT,
      vendor_note TEXT,
      refund_amount DECIMAL(18,2) DEFAULT 0,
      refund_method VARCHAR(100),
      refund_reference VARCHAR(255),
      refund_proof_url TEXT,
      refund_paid_at DATETIME(3),
      admin_verified_at DATETIME(3),
      customer_confirmed_at DATETIME(3),
      forwarded_at DATETIME(3),
      vendor_processed_at DATETIME(3),
      resolved_at DATETIME(3),
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_complaints_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_complaints_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      INDEX idx_complaints_user_id (user_id),
      INDEX idx_complaints_vendor_id (vendor_id),
      INDEX idx_complaints_transaction_id (transaction_id),
      INDEX idx_complaints_status (status),
      INDEX idx_complaints_type (type),
      INDEX idx_complaints_created_at (created_at)
    )`
  );

  const columns = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'complaints'`
  );
  const columnNames = new Set(columns.map((column) => String(column.COLUMN_NAME || '').toLowerCase()));

  if (!columnNames.has('refund_method')) {
    await query('ALTER TABLE complaints ADD COLUMN refund_method VARCHAR(100) AFTER refund_amount');
  }
  if (!columnNames.has('refund_reference')) {
    await query('ALTER TABLE complaints ADD COLUMN refund_reference VARCHAR(255) AFTER refund_method');
  }
  if (!columnNames.has('refund_proof_url')) {
    await query('ALTER TABLE complaints ADD COLUMN refund_proof_url TEXT AFTER refund_reference');
  }
  if (!columnNames.has('refund_paid_at')) {
    await query('ALTER TABLE complaints ADD COLUMN refund_paid_at DATETIME(3) AFTER refund_proof_url');
  }
  if (!columnNames.has('admin_verified_at')) {
    await query('ALTER TABLE complaints ADD COLUMN admin_verified_at DATETIME(3) AFTER refund_paid_at');
  }
  if (!columnNames.has('customer_confirmed_at')) {
    await query('ALTER TABLE complaints ADD COLUMN customer_confirmed_at DATETIME(3) AFTER admin_verified_at');
  }
  // Add customer bank details columns to store destination account for refunds
  if (!columnNames.has('customer_account_name')) {
    await query("ALTER TABLE complaints ADD COLUMN customer_account_name VARCHAR(255) AFTER evidence_url");
  }
  if (!columnNames.has('customer_account_number')) {
    await query("ALTER TABLE complaints ADD COLUMN customer_account_number VARCHAR(255) AFTER customer_account_name");
  }
  if (!columnNames.has('customer_bank_name')) {
    await query("ALTER TABLE complaints ADD COLUMN customer_bank_name VARCHAR(255) AFTER customer_account_number");
  }
}

async function createNotification(userId, type, message, relatedId, relatedData = {}) {
  if (!userId) return;
  try {
    await query(
      `INSERT INTO notifications (id, user_id, type, message, related_id, related_data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        String(userId),
        String(type || 'complaint_update'),
        String(message || ''),
        String(relatedId || ''),
        JSON.stringify(relatedData || {}),
        0,
        new Date().toISOString()
      ]
    );
  } catch (error) {
    console.warn('Failed to create complaint notification:', error?.message || error);
  }
}

export async function notifyAdmins(type, message, relatedId, relatedData = {}) {
  try {
    const admins = await query(`SELECT id FROM users WHERE role = 'admin' OR role_id = 3`);
    await Promise.all(admins.map((admin) => createNotification(admin.id, type, message, relatedId, relatedData)));
  } catch (error) {
    console.warn('Failed to notify admins:', error?.message || error);
  }
}

async function loadTransactionByTransactionId(transactionId) {
  const rows = await query(
    `SELECT
       t.id AS transaction_id,
       t.user_id,
       t.status AS transaction_status,
       t.total_amount,
       t.amount,
       t.deal_id,
       COALESCE(i.id, t.invoice_id) AS invoice_id,
       COALESCE(d.vendor_id, i.vendor_id) AS vendor_id,
       COALESCE(d.invoice_status, i.status) AS payment_status,
       COALESCE(d.status, '') AS deal_status,
       d.service_id,
       d.chat_id
     FROM transactions t
     LEFT JOIN deals d ON d.id = t.deal_id
     LEFT JOIN invoices i ON i.transaction_id = t.id OR i.id = t.invoice_id OR (i.deal_id = t.deal_id AND i.status = 'paid')
     WHERE t.id = ?
     ORDER BY COALESCE(i.created_at, t.created_at, t.timestamp, NOW()) DESC
     LIMIT 1`,
    [String(transactionId)]
  );
  return rows[0] || null;
}

async function loadTransactionByInvoiceId(invoiceId) {
  const rows = await query(
    `SELECT
       t.id AS transaction_id,
       COALESCE(t.user_id, i.customer_id) AS user_id,
       COALESCE(t.status, i.status) AS transaction_status,
       COALESCE(t.total_amount, t.amount, i.remaining_payment) AS total_amount,
       t.amount,
       COALESCE(t.deal_id, i.deal_id) AS deal_id,
       i.id AS invoice_id,
       COALESCE(d.vendor_id, i.vendor_id) AS vendor_id,
       COALESCE(d.invoice_status, i.status) AS payment_status,
       COALESCE(d.status, '') AS deal_status,
       COALESCE(d.service_id, i.service_id) AS service_id,
       d.chat_id
     FROM invoices i
     LEFT JOIN transactions t ON t.id = COALESCE(i.payment_transaction_id, i.transaction_id)
     LEFT JOIN deals d ON d.id = COALESCE(t.deal_id, i.deal_id)
     WHERE i.id = ?
     ORDER BY COALESCE(t.created_at, t.timestamp, i.created_at, NOW()) DESC
     LIMIT 1`,
    [String(invoiceId)]
  );
  return rows[0] || null;
}

async function loadTransactionByDealId(dealId) {
  const rows = await query(
    `SELECT
       t.id AS transaction_id,
       COALESCE(t.user_id, d.customer_id) AS user_id,
       t.status AS transaction_status,
       COALESCE(t.total_amount, t.amount, i.remaining_payment, d.final_price) AS total_amount,
       t.amount,
       d.id AS deal_id,
       COALESCE(i.id, t.invoice_id) AS invoice_id,
       d.vendor_id,
       COALESCE(d.invoice_status, i.status) AS payment_status,
       d.status AS deal_status,
       d.service_id,
       d.chat_id
     FROM deals d
     LEFT JOIN transactions t ON t.deal_id = d.id
     LEFT JOIN invoices i ON i.deal_id = d.id
     WHERE d.id = ?
     ORDER BY COALESCE(t.created_at, t.timestamp, i.created_at, d.created_at, NOW()) DESC
     LIMIT 1`,
    [String(dealId)]
  );
  return rows[0] || null;
}

export async function resolveComplaintReference(referenceId) {
  const normalized = String(referenceId || '').trim();
  if (!normalized) return null;

  const byTransaction = await loadTransactionByTransactionId(normalized);
  if (byTransaction) return byTransaction;

  const byInvoice = await loadTransactionByInvoiceId(normalized.replace(/^#/, ''));
  if (byInvoice) return byInvoice;

  const byDeal = await loadTransactionByDealId(normalized.replace(/^#/, ''));
  return byDeal;
}

export function isPaidTransactionContext(context) {
  if (!context) return false;
  const paymentStatus = String(context.payment_status || '').toLowerCase();
  const txStatus = String(context.transaction_status || '').toLowerCase();
  return paymentStatus === 'paid' || txStatus === 'success';
}

export function mapComplaintRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    vendorId: row.vendor_id,
    transactionId: row.transaction_id,
    dealId: row.deal_id || null,
    invoiceId: row.invoice_id || null,
    type: row.type,
    description: row.description || '',
    evidenceUrl: parseEvidenceUrl(row.evidence_url),
    status: row.status,
    adminNote: row.admin_note || '',
    vendorNote: row.vendor_note || '',
    refundAmount: Number(row.refund_amount || 0),
    refundMethod: row.refund_method || '',
    refundReference: row.refund_reference || '',
    refundProofUrl: parseEvidenceUrl(row.refund_proof_url),
    customerAccountName: row.customer_account_name || '',
    customerAccountNumber: row.customer_account_number || '',
    customerBankName: row.customer_bank_name || '',
    refundPaidAt: row.refund_paid_at || null,
    adminVerifiedAt: row.admin_verified_at || null,
    customerConfirmedAt: row.customer_confirmed_at || null,
    forwardedAt: row.forwarded_at || null,
    vendorProcessedAt: row.vendor_processed_at || null,
    resolvedAt: row.resolved_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name || '',
    vendorName: row.vendor_name || '',
    customerEmail: row.customer_email || '',
    vendorDisplayName: row.vendor_display_name || row.vendor_name || '',
    transactionStatus: row.transaction_status || '',
    paymentStatus: row.payment_status || '',
    totalAmount: Number(row.total_amount || 0),
    serviceTitle: row.service_title || '',
    serviceId: row.service_id || null
  };
}

async function loadComplaintRowById(complaintId) {
  await ensureComplaintsTable();
  const rows = await query(
    `SELECT
       c.*,
       u.name AS customer_name,
       u.email AS customer_email,
       v.name AS vendor_name,
       vp.vendor_name AS vendor_display_name,
       t.status AS transaction_status,
       COALESCE(t.total_amount, t.amount, 0) AS total_amount,
       d.invoice_status AS payment_status,
       s.title AS service_title,
       s.id AS service_id,
       d.id AS deal_id,
       i.id AS invoice_id
     FROM complaints c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN users v ON v.id = c.vendor_id
     LEFT JOIN vendor_profiles vp ON vp.vendor_id = c.vendor_id
     LEFT JOIN transactions t ON t.id = c.transaction_id
     LEFT JOIN deals d ON d.id = t.deal_id
     LEFT JOIN invoices i ON i.transaction_id = t.id OR i.deal_id = d.id
     LEFT JOIN services s ON s.id = d.service_id
     WHERE c.id = ?
     ORDER BY COALESCE(i.created_at, NOW()) DESC
     LIMIT 1`,
    [String(complaintId)]
  );
  return rows[0] || null;
}

export async function getComplaintById(complaintId) {
  const row = await loadComplaintRowById(complaintId);
  return mapComplaintRow(row);
}

export async function createComplaintDraft({
  userId,
  vendorId,
  transactionId,
  type,
  description = '',
  evidenceUrl = '',
  refundAmount = 0,
  customer_account_name = '',
  customer_account_number = '',
  customer_bank_name = '',
  adminNote = '',
  status = COMPLAINT_STATUSES.PENDING_ADMIN
}) {
  await ensureComplaintsTable();

  const normalizedType = normalizeComplaintType(type);
  if (!normalizedType) {
    throw new Error('Tipe complaint tidak valid');
  }

  const existingRows = await query(
    `SELECT * FROM complaints
     WHERE user_id = ? AND transaction_id = ? AND type = ? AND status <> 'RESOLVED'
     ORDER BY COALESCE(updated_at, created_at) DESC
     LIMIT 1`,
    [String(userId), String(transactionId), normalizedType]
  );

  if (existingRows.length > 0) {
    return getComplaintById(existingRows[0].id);
  }

  const complaintId = `CMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO complaints (
      id, user_id, vendor_id, transaction_id, type, description, evidence_url, status,
      customer_account_name, customer_account_number, customer_bank_name,
      admin_note, vendor_note, refund_amount, refund_method, refund_reference, refund_proof_url, 
      refund_paid_at, admin_verified_at, customer_confirmed_at, forwarded_at, vendor_processed_at,
      resolved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      complaintId,
      String(userId),
      String(vendorId),
      String(transactionId),
      normalizedType,
      String(description || '').trim(),
      parseEvidenceUrl(evidenceUrl),
      status,
      String(customer_account_name || ''),
      String(customer_account_number || ''),
      String(customer_bank_name || ''),
      adminNote || '',
      '',
      Number(refundAmount || 0),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      now,
      now
    ]
  );

  await notifyAdmins(
    'complaint_created',
    normalizedType === 'pembatalan'
      ? 'Ada permintaan pembatalan yang menunggu mediasi admin.'
      : 'Ada complaint baru dari customer yang menunggu mediasi admin.',
    complaintId,
    { complaintId, transactionId, vendorId, userId, type: normalizedType }
  );

  return getComplaintById(complaintId);
}

export async function listComplaintsForCustomer(userId) {
  await ensureComplaintsTable();
  const rows = await query(
    `SELECT
       c.*,
       u.name AS customer_name,
       u.email AS customer_email,
       v.name AS vendor_name,
       vp.vendor_name AS vendor_display_name,
       t.status AS transaction_status,
       COALESCE(t.total_amount, t.amount, 0) AS total_amount,
       d.invoice_status AS payment_status,
       s.title AS service_title,
       s.id AS service_id,
       d.id AS deal_id,
       i.id AS invoice_id
     FROM complaints c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN users v ON v.id = c.vendor_id
     LEFT JOIN vendor_profiles vp ON vp.vendor_id = c.vendor_id
     LEFT JOIN transactions t ON t.id = c.transaction_id
     LEFT JOIN deals d ON d.id = t.deal_id
     LEFT JOIN invoices i ON i.transaction_id = t.id OR i.deal_id = d.id
     LEFT JOIN services s ON s.id = d.service_id
     WHERE c.user_id = ?
     ORDER BY COALESCE(c.updated_at, c.created_at) DESC`,
    [String(userId)]
  );
  return rows.map(mapComplaintRow);
}

export async function listComplaintsForAdmin() {
  await ensureComplaintsTable();
  const rows = await query(
    `SELECT
       c.*,
       u.name AS customer_name,
       u.email AS customer_email,
       v.name AS vendor_name,
       vp.vendor_name AS vendor_display_name,
       t.status AS transaction_status,
       COALESCE(t.total_amount, t.amount, 0) AS total_amount,
       d.invoice_status AS payment_status,
       s.title AS service_title,
       s.id AS service_id,
       d.id AS deal_id,
       i.id AS invoice_id
     FROM complaints c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN users v ON v.id = c.vendor_id
     LEFT JOIN vendor_profiles vp ON vp.vendor_id = c.vendor_id
     LEFT JOIN transactions t ON t.id = c.transaction_id
     LEFT JOIN deals d ON d.id = t.deal_id
     LEFT JOIN invoices i ON i.transaction_id = t.id OR i.deal_id = d.id
     LEFT JOIN services s ON s.id = d.service_id
     ORDER BY FIELD(c.status, 'PENDING_ADMIN', 'FORWARDED_TO_VENDOR', 'REFUND_PROCESSED', 'RESOLVED'), COALESCE(c.updated_at, c.created_at) DESC`
  );
  return rows.map(mapComplaintRow);
}

export async function listComplaintsForVendor(vendorId) {
  await ensureComplaintsTable();
  const rows = await query(
    `SELECT
       c.*,
       u.name AS customer_name,
       u.email AS customer_email,
       v.name AS vendor_name,
       vp.vendor_name AS vendor_display_name,
       t.status AS transaction_status,
       COALESCE(t.total_amount, t.amount, 0) AS total_amount,
       d.invoice_status AS payment_status,
       s.title AS service_title,
       s.id AS service_id,
       d.id AS deal_id,
       i.id AS invoice_id
     FROM complaints c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN users v ON v.id = c.vendor_id
     LEFT JOIN vendor_profiles vp ON vp.vendor_id = c.vendor_id
     LEFT JOIN transactions t ON t.id = c.transaction_id
     LEFT JOIN deals d ON d.id = t.deal_id
     LEFT JOIN invoices i ON i.transaction_id = t.id OR i.deal_id = d.id
     LEFT JOIN services s ON s.id = d.service_id
     WHERE c.vendor_id = ?
       AND c.status IN ('FORWARDED_TO_VENDOR', 'REFUND_PROCESSED', 'RESOLVED')
     ORDER BY FIELD(c.status, 'FORWARDED_TO_VENDOR', 'REFUND_PROCESSED', 'RESOLVED'), COALESCE(c.updated_at, c.created_at) DESC`,
    [String(vendorId)]
  );
  return rows.map(mapComplaintRow);
}

export async function updateComplaintWorkflow({
  complaintId,
  action,
  actorRole,
  actorId,
  note = '',
  refundAmount,
  refundMethod = '',
  refundReference = '',
  refundProofUrl = '',
  refundPaidAt = null,
  verifiedRecipientName = '',
  verifiedRecipientAccountNumber = ''
}) {
  await ensureComplaintsTable();
  const current = await loadComplaintRowById(complaintId);
  if (!current) throw new Error('Complaint tidak ditemukan');

  const now = new Date().toISOString();
  const normalizedAction = String(action || '').trim().toLowerCase();
  const normalizedRole = String(actorRole || '').trim().toLowerCase();

  if (normalizedRole === 'admin') {
    if (normalizedAction === 'forward_to_vendor') {
      if (current.status !== COMPLAINT_STATUSES.PENDING_ADMIN) {
        throw new Error('Complaint ini tidak bisa diteruskan lagi ke vendor');
      }

      await query(
        `UPDATE complaints
         SET status = ?, admin_note = ?, refund_amount = ?, forwarded_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          COMPLAINT_STATUSES.FORWARDED_TO_VENDOR,
          String(note || '').trim(),
          Number(refundAmount || current.refund_amount || 0),
          now,
          now,
          String(complaintId)
        ]
      );

      await createNotification(
        current.vendor_id,
        'complaint_forwarded_to_vendor',
        'Admin meneruskan instruksi complaint/refund yang perlu Anda proses.',
        complaintId,
        { complaintId, transactionId: current.transaction_id }
      );
    } else if (normalizedAction === 'resolve') {
      if (current.status !== COMPLAINT_STATUSES.REFUND_PROCESSED) {
        throw new Error('Complaint hanya bisa diselesaikan setelah vendor mengirim bukti refund');
      }
      if (!current.refund_proof_url || !current.refund_paid_at) {
        throw new Error('Bukti refund vendor belum lengkap');
      }

      const expectedRecipientName = String(current.customer_account_name || '').trim();
      const expectedRecipientNumber = normalizeAccountNumber(current.customer_account_number);
      const providedRecipientName = String(verifiedRecipientName || '').trim();
      const providedRecipientNumber = normalizeAccountNumber(verifiedRecipientAccountNumber);

      if (!expectedRecipientName || !expectedRecipientNumber) {
        throw new Error('Data rekening customer belum lengkap, admin tidak dapat melakukan verifikasi akhir');
      }
      if (!providedRecipientName || !providedRecipientNumber) {
        throw new Error('Nama penerima dan nomor rekening tujuan refund wajib diisi untuk verifikasi admin');
      }

      if (normalizePersonName(providedRecipientName) !== normalizePersonName(expectedRecipientName)) {
        throw new Error('Nama penerima refund tidak sesuai dengan nama rekening customer');
      }
      if (providedRecipientNumber !== expectedRecipientNumber) {
        throw new Error('Nomor rekening tujuan refund tidak sesuai dengan data customer');
      }

      await query(
        `UPDATE complaints
         SET status = ?, admin_note = ?, admin_verified_at = ?, resolved_at = ?, updated_at = ?
         WHERE id = ?`,
        [COMPLAINT_STATUSES.RESOLVED, String(note || current.admin_note || '').trim(), now, now, now, String(complaintId)]
      );

      await createNotification(
        current.user_id,
        'complaint_resolved',
        'Complaint Anda telah diselesaikan oleh admin.',
        complaintId,
        { complaintId, transactionId: current.transaction_id }
      );
    } else {
      throw new Error('Aksi admin tidak dikenali');
    }
  } else if (normalizedRole === 'customer') {
    if (normalizedAction !== 'customer_confirm_receipt') {
      throw new Error('Aksi customer tidak dikenali');
    }
    if (String(current.user_id) !== String(actorId)) {
      throw new Error('Anda tidak memiliki akses ke complaint ini');
    }
    if (current.status !== COMPLAINT_STATUSES.RESOLVED) {
      throw new Error('Konfirmasi penerimaan hanya tersedia setelah admin menutup complaint');
    }
    if (!current.admin_verified_at) {
      throw new Error('Complaint belum diverifikasi admin');
    }

    await query(
      `UPDATE complaints
       SET customer_confirmed_at = ?, updated_at = ?
       WHERE id = ?`,
      [now, now, String(complaintId)]
    );

    await createNotification(
      current.user_id,
      'complaint_customer_confirmed',
      'Anda telah mengonfirmasi penerimaan hasil complaint/refund.',
      complaintId,
      { complaintId, transactionId: current.transaction_id }
    );
  } else if (normalizedRole === 'vendor') {
    if (String(current.vendor_id) !== String(actorId)) {
      throw new Error('Anda tidak memiliki akses ke complaint ini');
    }
    if (normalizedAction !== 'submit_refund_payment') {
      throw new Error('Aksi vendor tidak dikenali');
    }
    if (current.status !== COMPLAINT_STATUSES.FORWARDED_TO_VENDOR) {
      throw new Error('Complaint ini belum siap diproses refund oleh vendor');
    }

    const normalizedRefundMethod = String(refundMethod || '').trim();
    const normalizedRefundReference = String(refundReference || '').trim();
    const normalizedRefundProofUrl = parseEvidenceUrl(refundProofUrl);
    const normalizedRefundPaidAt = refundPaidAt ? new Date(refundPaidAt).toISOString() : now;

    if (!normalizedRefundMethod) {
      throw new Error('Metode refund wajib diisi vendor');
    }
    if (!normalizedRefundProofUrl) {
      throw new Error('Bukti refund wajib diunggah vendor');
    }

    await query(
      `UPDATE complaints
       SET status = ?, vendor_note = ?, refund_method = ?, refund_reference = ?, refund_proof_url = ?, refund_paid_at = ?, vendor_processed_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        COMPLAINT_STATUSES.REFUND_PROCESSED,
        String(note || '').trim(),
        normalizedRefundMethod,
        normalizedRefundReference || null,
        normalizedRefundProofUrl,
        normalizedRefundPaidAt,
        now,
        now,
        String(complaintId)
      ]
    );

    await notifyAdmins(
      'complaint_vendor_processed',
      'Vendor telah mengirim bukti pembayaran refund untuk complaint.',
      complaintId,
      { complaintId, transactionId: current.transaction_id, vendorId: current.vendor_id }
    );

    await createNotification(
      current.user_id,
      'complaint_refund_submitted',
      'Vendor telah mengirim bukti refund. Complaint sedang diverifikasi admin.',
      complaintId,
      { complaintId, transactionId: current.transaction_id }
    );
  } else {
    throw new Error('Role actor tidak valid');
  }

  return getComplaintById(complaintId);
}

export { COMPLAINT_STATUSES, normalizeComplaintType };
