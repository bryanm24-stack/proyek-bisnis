import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const parseJsonSafe = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizePromoRow = (promo) => {
  const startAt = parseDateOrNull(promo.start_at);
  const endAt = parseDateOrNull(promo.end_at);
  const claimedUserIds = parseJsonSafe(promo.claimed_user_ids, []).map((id) => String(id));
  const maxApplicants = promo.max_applicants === undefined || promo.max_applicants === null || promo.max_applicants === ''
    ? null
    : Number(promo.max_applicants);
  const claimedCount = Number.isFinite(Number(promo.claimed_count)) ? Number(promo.claimed_count) : claimedUserIds.length;

  return {
    ...promo,
    startAt: startAt ? startAt.toISOString() : null,
    endAt: endAt ? endAt.toISOString() : null,
    maxApplicants: Number.isFinite(maxApplicants) ? maxApplicants : null,
    claimedCount,
    claimedUserIds,
    active: Boolean(promo.active)
  };
};

const validatePromoAvailability = (promo, userId, successfulTransactionsForPromo) => {
  const now = Date.now();
  const normalizedPromo = normalizePromoRow(promo);

  if (normalizedPromo.active === false) {
    return 'Promo sedang tidak aktif.';
  }

  if (normalizedPromo.startAt && new Date(normalizedPromo.startAt).getTime() > now) {
    return 'Promo belum dimulai.';
  }

  if (normalizedPromo.endAt && new Date(normalizedPromo.endAt).getTime() <= now) {
    return 'Promo sudah berakhir.';
  }

  if (Number.isFinite(normalizedPromo.maxApplicants) && normalizedPromo.claimedCount >= normalizedPromo.maxApplicants) {
    return 'Kuota promo sudah habis.';
  }

  if (userId) {
    const userKey = String(userId);
    const hasClaimedBefore = normalizedPromo.claimedUserIds.includes(userKey) || successfulTransactionsForPromo.some((transaction) =>
      String(transaction.user_id) === userKey &&
      transaction.status === 'success'
    );

    if (hasClaimedBefore) {
      return 'User hanya dapat menggunakan promo ini 1 kali.';
    }
  }

  return null;
};

async function markPromoClaimed(promoId, userId) {
  if (!promoId || !userId) return;

  const rows = await query('SELECT claimed_user_ids FROM promos WHERE id = ? LIMIT 1', [promoId]);
  if (rows.length === 0) return;

  const claimedUserIds = parseJsonSafe(rows[0].claimed_user_ids, []).map((id) => String(id));
  const userKey = String(userId);
  if (!claimedUserIds.includes(userKey)) claimedUserIds.push(userKey);

  await query(
    'UPDATE promos SET claimed_user_ids = ?, claimed_count = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(claimedUserIds), claimedUserIds.length, new Date().toISOString(), promoId]
  );
}

const toDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

async function hasTransactionsServiceIdColumn() {
  const rows = await query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'transactions'
       AND COLUMN_NAME = 'service_id'
     LIMIT 1`
  );
  return rows.length > 0;
}

export async function GET(request) {
  try {
    const rows = await query('SELECT * FROM transactions ORDER BY COALESCE(created_at, NOW()) DESC');
    const transactions = rows.map((row) => ({
      ...row,
      card_details: parseJsonSafe(row.card_details, null),
      identity_verification: parseJsonSafe(row.identity_verification, null)
    }));

    return NextResponse.json(transactions, { status: 200 });
  } catch (error) {
    console.error('Error reading transactions:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const hasServiceIdColumn = await hasTransactionsServiceIdColumn();

    const txId = body.id || `TRX-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const timestamp = body.timestamp || createdAt;

    // Determine service ID early from deal or direct parameter
    let serviceId = body.serviceId;
    if (!serviceId && body.dealId) {
      const dealRows = await query('SELECT service_id FROM deals WHERE id = ? LIMIT 1', [body.dealId]);
      if (dealRows.length > 0) {
        serviceId = dealRows[0].service_id;
      }
    }

    if (body.promoId) {
      try {
        const promoRows = await query('SELECT * FROM promos WHERE id = ? LIMIT 1', [body.promoId]);
        const promo = promoRows[0] || null;

        const promoTransactions = await query(
          'SELECT promo_id, user_id, status FROM transactions WHERE promo_id = ? AND status = ?',
          [body.promoId, 'success']
        );

        if (!promo) {
          return NextResponse.json({
            success: false,
            error: 'Promo tidak ditemukan',
            message: 'Promo tidak ditemukan atau sudah dihapus.'
          }, { status: 404 });
        }

        const promoError = validatePromoAvailability(promo, body.userId, promoTransactions);
        if (promoError) {
          return NextResponse.json({
            success: false,
            error: 'Promo tidak tersedia',
            message: promoError,
            status: 'promo_unavailable'
          }, { status: 400 });
        }
      } catch (promoError) {
        console.warn('Promo check warning:', promoError.message);
        return NextResponse.json({
          success: false,
          error: 'Promo tidak tersedia',
          message: 'Gagal memvalidasi promo.',
          status: 'promo_validation_failed'
        }, { status: 400 });
      }
    }

    // Validate stock availability before processing payment
    if ((body.status === 'success' || !body.status) && body.startDate && body.durationDays && serviceId) {
      try {
        // Calculate end date based on start date and duration
        const startDate = new Date(body.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Number(body.durationDays || 0));

        // Check availability
        const services = await query(
          'SELECT id, quantity FROM services WHERE id = ? LIMIT 1',
          [serviceId]
        );

        if (services.length === 0) {
          console.warn(`Service ${serviceId} not found for availability check`);
        } else {
          const service = services[0];
          const totalQuantity = Number(service.quantity ?? 0);
          const requestedQuantity = Number(body.quantity ?? 1);

          // Find overlapping transactions
          const transactions = hasServiceIdColumn
            ? await query(
              `SELECT quantity, start_date, duration_days FROM transactions
               WHERE service_id = ? AND status = 'success' ORDER BY start_date ASC`,
              [serviceId]
            )
            : await query(
              `SELECT t.quantity, t.start_date, t.duration_days
               FROM transactions t
               LEFT JOIN deals d ON d.id = t.deal_id
               WHERE d.service_id = ? AND t.status = 'success'
               ORDER BY t.start_date ASC`,
              [serviceId]
            );

          let bookedQuantity = 0;
          for (const tx of transactions) {
            if (!tx.start_date || !tx.duration_days) continue;
            const txStart = new Date(tx.start_date);
            const txEnd = new Date(txStart);
            txEnd.setDate(txEnd.getDate() + Number(tx.duration_days));

            // Check for date range overlap
            if (txStart < endDate && txEnd > startDate) {
              bookedQuantity += Number(tx.quantity || 0);
            }
          }

          const availableQuantity = totalQuantity - bookedQuantity;

          if (availableQuantity < requestedQuantity) {
            return NextResponse.json({
              success: false,
              error: 'Stok tidak tersedia',
              message: `❌ Stok tidak mencukupi untuk tanggal tersebut. Tersedia: ${availableQuantity} unit, diminta: ${requestedQuantity} unit`,
              available: false,
              availableQuantity,
              requestedQuantity,
              totalQuantity,
              bookedQuantity,
              status: 'stock_unavailable'
            }, { status: 400 });
          }

          // Log availability check passed
          if (availableQuantity === requestedQuantity) {
            console.log(`[STOCK] Last unit(s) booked for service ${serviceId}: ${availableQuantity - requestedQuantity} remaining`);
          }
        }
      } catch (stockError) {
        console.warn('Stock availability check warning:', stockError.message);
        // Don't fail the transaction if stock check fails, just log it
      }
    }

    const insertValues = hasServiceIdColumn
      ? [
        txId,
        body.invoiceId || null,
        body.dealId || null,
        serviceId || null,
        body.userId || null,
        body.promoId || null,
        body.paymentMethod || null,
        Number(body.basePrice ?? body.amount ?? 0) || 0,
        Number(body.quantity ?? 1) || 1,
        body.quantityType || 'Unit',
        Number(body.durationDays ?? 0) || null,
        body.notes || '',
        toDateOnly(body.startDate),
        Number(body.amount ?? 0) || 0,
        Number(body.serviceFee ?? 0) || 0,
        Number(body.totalAmount ?? body.amount ?? 0) || 0,
        body.status || 'pending',
        timestamp,
        body.cardDetails ? JSON.stringify(body.cardDetails) : null,
        body.qrCode || null,
        body.identityVerification ? JSON.stringify(body.identityVerification) : null,
        createdAt
      ]
      : [
        txId,
        body.invoiceId || null,
        body.dealId || null,
        body.userId || null,
        body.promoId || null,
        body.paymentMethod || null,
        Number(body.basePrice ?? body.amount ?? 0) || 0,
        Number(body.quantity ?? 1) || 1,
        body.quantityType || 'Unit',
        Number(body.durationDays ?? 0) || null,
        body.notes || '',
        toDateOnly(body.startDate),
        Number(body.amount ?? 0) || 0,
        Number(body.serviceFee ?? 0) || 0,
        Number(body.totalAmount ?? body.amount ?? 0) || 0,
        body.status || 'pending',
        timestamp,
        body.cardDetails ? JSON.stringify(body.cardDetails) : null,
        body.qrCode || null,
        body.identityVerification ? JSON.stringify(body.identityVerification) : null,
        createdAt
      ];

    await query(
      hasServiceIdColumn
        ? `INSERT INTO transactions (
            id, invoice_id, deal_id, service_id, user_id, promo_id, payment_method, base_price,
            quantity, quantity_type, duration_days, notes, start_date,
            amount, service_fee, total_amount, status, timestamp,
            card_details, qr_code, identity_verification, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        : `INSERT INTO transactions (
            id, invoice_id, deal_id, user_id, promo_id, payment_method, base_price,
            quantity, quantity_type, duration_days, notes, start_date,
            amount, service_fee, total_amount, status, timestamp,
            card_details, qr_code, identity_verification, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      insertValues
    );

    if (body.promoId && (body.status || 'pending') === 'success') {
      try {
        await markPromoClaimed(body.promoId, body.userId);
      } catch (promoWriteError) {
        console.warn('Could not update promo claim state:', promoWriteError);
      }
    }

    const dealRows = body.dealId ? await query('SELECT * FROM deals WHERE id = ? LIMIT 1', [body.dealId]) : [];
    const currentDeal = dealRows[0] || null;
    const promoRows = body.promoId ? await query('SELECT * FROM promos WHERE id = ? LIMIT 1', [body.promoId]) : [];
    const currentPromo = promoRows[0] || null;

    if ((body.dealId || body.promoId) && body.paymentType !== 'invoice_payment') {
      const isPayAfter = body.paymentType === 'pay_after';
      const paymentCompletedAt = timestamp;
      const paymentDeadlineDate = new Date();
      paymentDeadlineDate.setDate(paymentDeadlineDate.getDate() + 2);

      const existingInvoiceRows = await query(
        `SELECT * FROM invoices
         WHERE transaction_id = ?
            OR (deal_id = ? AND payment_type = ?)
            OR (deal_id = ? AND payment_type = 'deal_pending' AND status <> 'paid')
         ORDER BY COALESCE(created_at, NOW()) DESC
         LIMIT 1`,
        [txId, body.dealId || null, body.paymentType || 'full', body.dealId || null]
      );

      if (existingInvoiceRows.length > 0) {
        const invoiceId = existingInvoiceRows[0].id;
        await query(
          `UPDATE invoices
           SET customer_id = ?, vendor_id = ?, service_id = ?, transaction_id = ?,
               remaining_payment = ?, payment_deadline = ?, payment_method = ?, payment_type = ?,
               status = ?, paid_at = ?, payment_transaction_id = ?, notes = ?
           WHERE id = ?`,
          [
            body.userId || currentDeal?.customer_id || null,
            currentDeal?.vendor_id || currentPromo?.vendor_id || body.vendorId || null,
            currentDeal?.service_id || null,
            txId,
            isPayAfter ? Number(body.remainingPayment ?? 0) : Number(body.totalAmount ?? body.amount ?? 0),
            isPayAfter ? paymentDeadlineDate.toISOString() : timestamp,
            body.paymentMethod || null,
            body.paymentType || 'full',
            isPayAfter ? 'pending' : 'paid',
            isPayAfter ? null : paymentCompletedAt,
            isPayAfter ? null : txId,
            body.notes || '',
            invoiceId
          ]
        );
      } else {
        await query(
          `INSERT INTO invoices (
            id, deal_id, customer_id, vendor_id, service_id, transaction_id,
            remaining_payment, payment_deadline, payment_method, payment_type,
            status, created_at, paid_at, payment_transaction_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `INV-${Date.now()}`,
            body.dealId || null,
            body.userId || currentDeal?.customer_id || null,
            currentDeal?.vendor_id || currentPromo?.vendor_id || body.vendorId || null,
            currentDeal?.service_id || null,
            txId,
            isPayAfter ? Number(body.remainingPayment ?? 0) : Number(body.totalAmount ?? body.amount ?? 0),
            isPayAfter ? paymentDeadlineDate.toISOString() : timestamp,
            body.paymentMethod || null,
            body.paymentType || 'full',
            isPayAfter ? 'pending' : 'paid',
            createdAt,
            isPayAfter ? null : paymentCompletedAt,
            isPayAfter ? null : txId,
            body.notes || ''
          ]
        );
      }

      if (body.dealId) {
        await query(
          `UPDATE deals
           SET invoice_status = ?, status = ?, payment_confirmed_at = ?, completed_at = ?
           WHERE id = ?`,
          [
            isPayAfter ? 'pending' : 'paid',
            isPayAfter ? 'agreed' : 'active',
            isPayAfter ? null : paymentCompletedAt,
            isPayAfter ? null : paymentCompletedAt,
            body.dealId
          ]
        );

        const dealRowsAfter = await query('SELECT chat_id FROM deals WHERE id = ? LIMIT 1', [body.dealId]);
        if (dealRowsAfter.length > 0 && dealRowsAfter[0].chat_id) {
          await query('UPDATE chats SET deal_status = ? WHERE id = ?', [isPayAfter ? 'agreed' : 'active', dealRowsAfter[0].chat_id]);
        }
      }
    }

    const inserted = await query('SELECT * FROM transactions WHERE id = ? LIMIT 1', [txId]);

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil diproses ke SQL',
      data: inserted[0] || { id: txId }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat memproses transaksi'
    }, { status: 500 });
  }
}
