import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

import { query } from '@/lib/db';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const normalizeItemCondition = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;

  if (['good', 'baik'].includes(raw)) {
    return { code: 'good', label: 'Baik', damageStatus: 'none' };
  }
  if (['minor_damage', 'minor', 'rusak ringan', 'rusak_ringan'].includes(raw)) {
    return { code: 'minor_damage', label: 'Rusak ringan', damageStatus: 'minor' };
  }
  if (['major_damage', 'major', 'rusak berat', 'rusak_berat'].includes(raw)) {
    return { code: 'major_damage', label: 'Rusak berat', damageStatus: 'major' };
  }
  if (['lost', 'hilang'].includes(raw)) {
    return { code: 'lost', label: 'Hilang', damageStatus: 'lost' };
  }

  return null;
};

const toItemConditionLabel = (value) => {
  const normalized = normalizeItemCondition(value);
  return normalized?.label || String(value || '').trim();
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const toDateOnlyUTC = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

const daysBetweenDates = (dateAString, dateBString) => {
  const a = toDateOnlyUTC(dateAString);
  const b = toDateOnlyUTC(dateBString);
  if (a === null || b === null) return 0;
  return Math.max(0, Math.round((a - b) / MS_PER_DAY));
};

function mapReturnRow(row, role = null, currentUserId = null) {
  const photos = parseJsonArray(row.photos);
  const safePhotos = photos.map((item) => {
    if (typeof item === 'string') {
      return { url: item, filename: '', uploadedAt: row.created_at };
    }
    return {
      url: item?.url || '',
      filename: item?.filename || '',
      uploadedAt: item?.uploadedAt || row.created_at
    };
  }).filter((item) => item.url);

  const serviceImages = parseJsonArray(row.service_images);
  const isComplaint = row.request_type === 'complaint' || row.request_type === 'issue';
  const itemConditionLabel = toItemConditionLabel(row.item_condition);

  const isVendorPerspective = currentUserId
    ? String(row.vendor_id || '') === String(currentUserId)
    : role === 'vendor';

  return {
    id: row.deal_id || row.id,
    returnId: row.id,
    invoiceId: row.invoice_id,
    dealId: row.deal_id,
    customerId: row.customer_id,
    vendorId: row.vendor_id,
    serviceId: row.service_id,
    returnType: row.request_type || 'end_of_use',
    returnStatus: row.status || 'pending_inspection',
    complaintCategory: row.complaint_category || itemConditionLabel || '',
    itemCondition: itemConditionLabel || '',
    complaintDescription: row.description || '',
    damageDescription: row.description || '',
    returnPhotos: safePhotos,
    damageStatus: row.damage_status || 'none',
    damageCharge: Number(row.damage_charge || 0),
    lateCharge: Number(row.late_charge || 0),
    totalRefund: Number(row.total_refund || 0),
    complaintResolution: row.complaint_resolution || null,
    complaintPenalty: Number(row.complaint_penalty || 0),
    inspectionNotes: row.vendor_notes || '',
    complaintResolutionNotes: row.vendor_notes || '',
    customerConfirmed: Boolean(row.customer_confirmed),
    vendorConfirmed: Boolean(row.vendor_confirmed),
    is_customer_confirmed: Boolean(row.customer_confirmed),
    is_vendor_confirmed: Boolean(row.vendor_confirmed),
    reportedAt: row.created_at,
    actualReturnDate: row.resolved_at || null,
    settlementDate: row.resolved_at || null,
    service: {
      id: row.service_id,
      title: row.service_title || 'Item',
      images: serviceImages
    },
    vendorName: row.vendor_name || '',
    customerName: row.customer_name || '',
    perspective: isVendorPerspective ? 'vendor' : 'customer',
    otherUser: isVendorPerspective
      ? { id: row.customer_id, name: row.customer_name || '' }
      : { id: row.vendor_id, name: row.vendor_name || '' },
    returnSummary: isComplaint
      ? (row.complaint_resolution ? `Complaint: ${row.complaint_resolution.replace(/_/g, ' ')}` : 'Complaint menunggu tindak lanjut')
      : (row.status === 'completed' ? 'Return selesai' : 'Proses return berjalan')
  };
}

async function findInvoiceByInput(dealOrInvoiceId) {
  const raw = String(dealOrInvoiceId || '').trim();
  if (!raw) return null;

  const byInvoiceId = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [raw]);
  if (byInvoiceId.length > 0) return byInvoiceId[0];

  const byDeal = await query(
    'SELECT * FROM invoices WHERE deal_id = ? ORDER BY COALESCE(created_at, payment_deadline) DESC LIMIT 1',
    [raw]
  );
  return byDeal[0] || null;
}

async function createOrUpdateDamageInvoice(returnRequest, amount) {
  const damageAmount = Number(amount || 0);
  if (damageAmount <= 0) return null;

  const existing = await query(
    `SELECT * FROM invoices
     WHERE deal_id = ? AND payment_type = 'damage'
     ORDER BY COALESCE(created_at, payment_deadline) DESC
     LIMIT 1`,
    [returnRequest.deal_id || null]
  );

  if (existing.length > 0) {
    await query(
      `UPDATE invoices
       SET remaining_payment = ?,
           status = CASE WHEN status = 'paid' THEN 'paid' ELSE 'pending' END,
           payment_deadline = COALESCE(payment_deadline, ?),
           notes = 'Tagihan biaya kerusakan'
       WHERE id = ?`,
      [damageAmount, new Date(Date.now() + 2 * MS_PER_DAY).toISOString(), existing[0].id]
    );
    return existing[0].id;
  }

  const newInvoiceId = `INV-DAMAGE-${Date.now()}`;
  await query(
    `INSERT INTO invoices (
      id, deal_id, customer_id, vendor_id, service_id, transaction_id,
      remaining_payment, payment_deadline, payment_method, payment_type,
      status, created_at, paid_at, payment_transaction_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newInvoiceId,
      returnRequest.deal_id || null,
      returnRequest.customer_id || null,
      returnRequest.vendor_id || null,
      returnRequest.service_id || null,
      null,
      damageAmount,
      new Date(Date.now() + 2 * MS_PER_DAY).toISOString(),
      null,
      'damage',
      'pending',
      new Date().toISOString(),
      null,
      null,
      'Tagihan biaya kerusakan'
    ]
  );

  return newInvoiceId;
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
        String(type || 'return_update'),
        String(message || ''),
        String(relatedId || ''),
        JSON.stringify(relatedData || {}),
        0,
        new Date().toISOString()
      ]
    );
  } catch (error) {
    console.warn('Failed to create notification:', error?.message || error);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!dealId && (!userId || !userRole)) {
      return NextResponse.json({ success: false, message: 'dealId atau userId dan userRole diperlukan' }, { status: 400 });
    }

    if (userId && userRole) {
      const isVendorUser = userRole === 'vendor';
      const roleCondition = isVendorUser
        ? '(rr.vendor_id = ? OR rr.customer_id = ?)'
        : 'rr.customer_id = ?';
      const roleParams = isVendorUser
        ? [String(userId), String(userId)]
        : [String(userId)];
      const rows = await query(
        `SELECT
           rr.*,
           s.title AS service_title,
           s.images AS service_images,
           c.name AS customer_name,
           v.name AS vendor_name
         FROM return_requests rr
         LEFT JOIN services s ON s.id = rr.service_id
         LEFT JOIN users c ON c.id = rr.customer_id
         LEFT JOIN users v ON v.id = rr.vendor_id
         WHERE ${roleCondition}
         ORDER BY COALESCE(rr.updated_at, rr.created_at) DESC`,
        roleParams
      );

      const data = rows.map((row) => mapReturnRow(row, userRole, String(userId)));
      return NextResponse.json({
        success: true,
        data,
        message: data.length === 0 ? 'Tidak ada return yang tercatat' : 'Data return ditemukan'
      }, { status: 200 });
    }

    const rows = await query(
      `SELECT * FROM return_requests
       WHERE deal_id = ?
       ORDER BY COALESCE(updated_at, created_at) DESC
       LIMIT 1`,
      [String(dealId)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Return tidak ditemukan' }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
      success: true,
      data: {
        dealId: row.deal_id,
        returnId: row.id,
        invoiceId: row.invoice_id,
        returnType: row.request_type,
        returnStatus: row.status,
        itemCondition: toItemConditionLabel(row.item_condition) || null,
        damageDescription: row.description || '',
        damageStatus: row.damage_status || 'none',
        damageCharge: Number(row.damage_charge || 0),
        damageInvoiceId: row.damage_invoice_id || null,
        lateCharge: Number(row.late_charge || 0),
        totalRefund: Number(row.total_refund || 0),
        refundStatus: row.status === 'completed' ? 'processed' : 'pending_payment',
        returnPhotos: parseJsonArray(row.photos),
        customerConfirmed: Boolean(row.customer_confirmed),
        vendorConfirmed: Boolean(row.vendor_confirmed),
        is_customer_confirmed: Boolean(row.customer_confirmed),
        is_vendor_confirmed: Boolean(row.vendor_confirmed),
        settlementDate: row.resolved_at || null,
        complains: []
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting return status:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let dealId;
    let customerId;
    let itemCondition;
    let damageDescription = '';
    let returnPhotos = [];
    let type = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      dealId = form.get('dealId');
      customerId = form.get('customerId');
      itemCondition = form.get('itemCondition');
      damageDescription = form.get('damageDescription') || '';
      type = form.get('type') || null;

      const files = form.getAll('photos') || [];
      if (files.length > 0) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'returns');
        await fs.mkdir(uploadsDir, { recursive: true });

        for (const file of files) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const safeName = (file.name || 'photo').replace(/[^a-zA-Z0-9_.-]/g, '_');
            const filename = `${Date.now()}-${safeName}`;
            const dest = path.join(uploadsDir, filename);
            await fs.writeFile(dest, buffer);
            returnPhotos.push({ url: `/uploads/returns/${filename}`, filename, uploadedAt: new Date().toISOString() });
          } catch (fileErr) {
            console.warn('Could not save uploaded file:', fileErr?.message || fileErr);
          }
        }
      }
    } else {
      const body = await request.json();
      dealId = body?.dealId;
      customerId = body?.customerId;
      itemCondition = body?.itemCondition;
      damageDescription = body?.damageDescription || '';
      returnPhotos = Array.isArray(body?.returnPhotos) ? body.returnPhotos : [];
      type = body?.type || null;
    }

    if (!dealId || !customerId || !itemCondition) {
      return NextResponse.json({ success: false, message: 'dealId, customerId, dan itemCondition wajib diisi' }, { status: 400 });
    }

    const invoice = await findInvoiceByInput(dealId);
    if (!invoice) {
      return NextResponse.json({ success: false, message: 'Invoice tidak ditemukan untuk deal/invoice ID tersebut' }, { status: 404 });
    }

    if (String(invoice.customer_id || '') && String(invoice.customer_id) !== String(customerId)) {
      return NextResponse.json({ success: false, message: 'Anda tidak memiliki akses untuk invoice ini' }, { status: 403 });
    }

    const deals = invoice.deal_id
      ? await query('SELECT * FROM deals WHERE id = ? LIMIT 1', [invoice.deal_id])
      : [];
    const deal = deals[0] || null;

    const normalizedType = (type || '').toString().toLowerCase();
    const requestType = normalizedType === 'complaint'
      ? 'complaint'
      : (normalizedType === 'issue' ? 'issue' : 'end_of_use');
    const normalizedItemCondition = normalizeItemCondition(itemCondition);

    if (requestType === 'end_of_use' && !normalizedItemCondition) {
      return NextResponse.json({
        success: false,
        message: 'itemCondition harus: Baik, Rusak ringan, Rusak berat, atau Hilang'
      }, { status: 400 });
    }

    const itemConditionCode = normalizedItemCondition?.code || String(itemCondition || '').trim().toLowerCase();
    const itemConditionLabel = requestType === 'end_of_use'
      ? (normalizedItemCondition?.label || String(itemCondition || '').trim())
      : null;

    const expectedReturnDate = deal?.expected_return_date || null;
    const daysLate = requestType === 'end_of_use' ? daysBetweenDates(new Date().toISOString(), expectedReturnDate) : 0;

    const baseAmount = Number(invoice.remaining_payment || 0);
    const lateCharge = daysLate > 0 ? Math.round((baseAmount / Math.max(Number(deal?.duration_days || 1), 1)) * daysLate) : 0;
    const damageCharge = (requestType === 'end_of_use' && itemConditionCode === 'lost') ? baseAmount : 0;

    const initialStatus = requestType === 'end_of_use' ? 'pending_inspection' : 'reported';
    const id = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await query(
      `INSERT INTO return_requests (
        id, invoice_id, deal_id, customer_id, vendor_id, service_id,
        request_type, item_condition, complaint_category, description,
        photos, status, damage_status, damage_charge, late_charge,
        total_refund, complaint_resolution, complaint_penalty,
        vendor_notes, customer_confirmed, vendor_confirmed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        invoice.id,
        invoice.deal_id || null,
        invoice.customer_id || String(customerId),
        invoice.vendor_id || null,
        invoice.service_id || null,
        requestType,
        requestType === 'end_of_use' ? itemConditionLabel : null,
        requestType === 'end_of_use' ? null : itemCondition,
        damageDescription || '',
        JSON.stringify(returnPhotos || []),
        initialStatus,
        requestType === 'end_of_use' ? (normalizedItemCondition?.damageStatus || 'none') : 'none',
        damageCharge,
        lateCharge,
        Math.max(0, baseAmount - damageCharge - lateCharge),
        null,
        0,
        '',
        false,
        false,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Permintaan pengembalian berhasil diajukan. Tunggu inspeksi dari vendor.',
      data: {
        returnId: id,
        dealId: invoice.deal_id,
        invoiceId: invoice.id,
        returnStatus: initialStatus
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error initiating return:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      dealId,
      returnId,
      vendorId,
      damageStatus,
      damageCharge,
      lateCharge,
      notes,
      complaintResolution,
      complaintPenalty
    } = body;

    if ((!dealId && !returnId) || !vendorId) {
      return NextResponse.json({ success: false, message: 'dealId/returnId dan vendorId wajib diisi' }, { status: 400 });
    }

    const rows = returnId
      ? await query('SELECT * FROM return_requests WHERE id = ? LIMIT 1', [String(returnId)])
      : await query(
        `SELECT * FROM return_requests
         WHERE deal_id = ?
         ORDER BY COALESCE(updated_at, created_at) DESC
         LIMIT 1`,
        [String(dealId)]
      );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Return request tidak ditemukan' }, { status: 404 });
    }

    const requestRow = rows[0];

    if (String(requestRow.vendor_id || '') !== String(vendorId)) {
      return NextResponse.json({ success: false, message: 'Anda tidak memiliki akses untuk return ini' }, { status: 403 });
    }

    const isComplaint = requestRow.request_type === 'complaint' || requestRow.request_type === 'issue';

    let nextComplaintResolution = requestRow.complaint_resolution;
    let nextComplaintPenalty = Number(requestRow.complaint_penalty || 0);
    let nextDamageStatus = requestRow.damage_status || 'none';
    let nextDamageCharge = Number(requestRow.damage_charge || 0);
    let nextLateCharge = Number(requestRow.late_charge || 0);
    let nextTotalRefund = Number(requestRow.total_refund || 0);
    let nextDamageInvoiceId = requestRow.damage_invoice_id || null;

    if (isComplaint) {
      const normalizedResolution = (complaintResolution || '').toString().toLowerCase();
      const allowedResolutions = ['confirm', 'partial_refund', 'penalty', 'reject'];
      if (!allowedResolutions.includes(normalizedResolution)) {
        return NextResponse.json({ success: false, message: 'complaintResolution harus: confirm, partial_refund, penalty, reject' }, { status: 400 });
      }

      const penalty = Number(complaintPenalty || 0) || 0;
      nextComplaintResolution = normalizedResolution;
      nextComplaintPenalty = penalty;
      const invoiceAmount = Number(requestRow.total_refund || 0);
      nextTotalRefund = Math.max(0, invoiceAmount - penalty);
    } else {
      if (!['none', 'minor', 'major', 'lost'].includes(String(damageStatus || 'none'))) {
        return NextResponse.json({ success: false, message: 'damageStatus harus: none, minor, major, atau lost' }, { status: 400 });
      }

      nextDamageStatus = String(damageStatus || 'none');
      nextDamageCharge = Number(damageCharge || 0) || 0;
      nextLateCharge = Number(lateCharge || 0) || 0;
      nextTotalRefund = Math.max(0, Number(requestRow.total_refund || 0) - nextDamageCharge - nextLateCharge);

      if (nextDamageCharge > 0) {
        nextDamageInvoiceId = await createOrUpdateDamageInvoice(requestRow, nextDamageCharge);
      }
    }

    const nextStatus = 'inspected';
    const nowIso = new Date().toISOString();

    await query(
      `UPDATE return_requests
       SET status = ?,
           damage_status = ?,
           damage_charge = ?,
           late_charge = ?,
           damage_invoice_id = ?,
           total_refund = ?,
           complaint_resolution = ?,
           complaint_penalty = ?,
           vendor_notes = ?,
           vendor_confirmed = true,
           updated_at = ?
       WHERE id = ?`,
      [
        nextStatus,
        nextDamageStatus,
        nextDamageCharge,
        nextLateCharge,
        nextDamageInvoiceId,
        nextTotalRefund,
        nextComplaintResolution,
        nextComplaintPenalty,
        notes || '',
        nowIso,
        requestRow.id
      ]
    );

    await createNotification(
      requestRow.customer_id,
      'return_inspection_done',
      'Inspeksi telah selesai, silakan periksa rincian denda dan lakukan konfirmasi akhir',
      requestRow.id,
      {
        returnId: requestRow.id,
        dealId: requestRow.deal_id,
        invoiceId: requestRow.invoice_id,
        status: nextStatus
      }
    );

    return NextResponse.json({
      success: true,
      message: isComplaint ? 'Resolusi complaint tersimpan' : 'Inspeksi pengembalian berhasil disimpan',
      data: {
        returnId: requestRow.id,
        dealId: requestRow.deal_id,
        returnStatus: nextStatus,
        damageInvoiceId: nextDamageInvoiceId,
        totalRefund: nextTotalRefund,
        is_vendor_confirmed: true,
        is_customer_confirmed: Boolean(requestRow.customer_confirmed)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error inspecting return:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { dealId, returnId, customerId } = body;

    if ((!dealId && !returnId) || !customerId) {
      return NextResponse.json({ success: false, message: 'dealId/returnId dan customerId wajib diisi' }, { status: 400 });
    }

    const rows = returnId
      ? await query('SELECT * FROM return_requests WHERE id = ? LIMIT 1', [String(returnId)])
      : await query(
        `SELECT * FROM return_requests
         WHERE deal_id = ?
         ORDER BY COALESCE(updated_at, created_at) DESC
         LIMIT 1`,
        [String(dealId)]
      );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Return request tidak ditemukan' }, { status: 404 });
    }

    const requestRow = rows[0];

    if (String(requestRow.customer_id || '') !== String(customerId)) {
      return NextResponse.json({ success: false, message: 'Anda tidak memiliki akses untuk return ini' }, { status: 403 });
    }

    if (!Boolean(requestRow.vendor_confirmed)) {
      return NextResponse.json({
        success: false,
        message: 'Menunggu inspeksi dari vendor',
        data: {
          returnId: requestRow.id,
          dealId: requestRow.deal_id,
          is_vendor_confirmed: false,
          is_customer_confirmed: Boolean(requestRow.customer_confirmed)
        }
      }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    await query(
      `UPDATE return_requests
       SET customer_confirmed = true,
           status = 'completed',
           updated_at = ?,
           resolved_at = ?
       WHERE id = ?`,
      [nowIso, nowIso, requestRow.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Pengembalian berhasil diselesaikan',
      data: {
        returnId: requestRow.id,
        dealId: requestRow.deal_id,
        status: 'completed',
        totalRefund: Number(requestRow.total_refund || 0),
        settlementDate: nowIso,
        is_vendor_confirmed: true,
        is_customer_confirmed: true
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error confirming return:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
