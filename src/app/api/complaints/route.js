import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

import { query } from '@/lib/db';
import {
  createComplaintDraft,
  ensureComplaintsTable,
  isPaidTransactionContext,
  listComplaintsForCustomer,
  normalizeComplaintType,
  resolveComplaintReference
} from '@/lib/complaints';

async function saveEvidenceFiles(files) {
  const uploads = [];
  if (!Array.isArray(files) || files.length === 0) return uploads;

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'complaints');
  await fs.mkdir(uploadsDir, { recursive: true });

  for (const file of files) {
    if (!file || typeof file.arrayBuffer !== 'function') continue;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = (file.name || 'evidence').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filename = `${Date.now()}-${safeName}`;
      await fs.writeFile(path.join(uploadsDir, filename), buffer);
      uploads.push(`/uploads/complaints/${filename}`);
    } catch (error) {
      console.warn('Failed to save complaint evidence:', error?.message || error);
    }
  }

  return uploads;
}

function getReferenceId(source) {
  return source.referenceId || source.transactionId || source.invoiceId || source.dealId || '';
}

export async function GET(request) {
  try {
    await ensureComplaintsTable();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const scope = (searchParams.get('scope') || 'all').toLowerCase();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId diperlukan' }, { status: 400 });
    }

    let data = await listComplaintsForCustomer(userId);
    if (scope === 'active') {
      data = data.filter((item) => item.status !== 'RESOLVED');
    } else if (scope === 'resolved') {
      data = data.filter((item) => item.status === 'RESOLVED');
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error reading complaints:', error);
    return NextResponse.json({ success: false, message: 'Gagal memuat complaint.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureComplaintsTable();

    let payload = {};
    let evidenceUrls = [];
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      payload = {
        referenceId: form.get('referenceId') || form.get('transactionId') || form.get('invoiceId') || form.get('dealId') || '',
        transactionId: form.get('transactionId') || '',
        invoiceId: form.get('invoiceId') || '',
        dealId: form.get('dealId') || '',
        userId: form.get('userId') || '',
        type: form.get('type') || '',
        description: form.get('description') || ''
      };
      evidenceUrls = await saveEvidenceFiles(form.getAll('evidence'));
    } else {
      payload = await request.json();
      evidenceUrls = Array.isArray(payload.evidenceUrls)
        ? payload.evidenceUrls.filter(Boolean)
        : (payload.evidenceUrl ? [payload.evidenceUrl] : []);
    }

    const userId = String(payload.userId || '').trim();
    const normalizedType = normalizeComplaintType(payload.type);
    const referenceId = getReferenceId(payload);

    if (!userId || !normalizedType || !referenceId) {
      return NextResponse.json({ success: false, message: 'userId, type, dan Invoice/Deal/Transaction ID wajib diisi' }, { status: 400 });
    }

    const context = await resolveComplaintReference(referenceId);
    if (!context || !context.transaction_id || !context.vendor_id) {
      return NextResponse.json({ success: false, message: 'Transaksi tidak ditemukan untuk referensi tersebut' }, { status: 404 });
    }

    if (String(context.user_id || '') !== userId) {
      return NextResponse.json({ success: false, message: 'Anda tidak memiliki akses ke transaksi ini' }, { status: 403 });
    }

    if (normalizedType === 'pembatalan' && !isPaidTransactionContext(context)) {
      return NextResponse.json({
        success: false,
        message: 'Complaint pembatalan hanya dipakai untuk transaksi yang sudah dibayar. Jika belum bayar, gunakan pembatalan deal biasa.'
      }, { status: 400 });
    }

    let userBank = { bankName: '', accountNumber: '', accountHolder: '' };
    try {
      const urows = await query('SELECT bankName, accountNumber, accountHolder FROM users WHERE id = ? LIMIT 1', [userId]);
      if (Array.isArray(urows) && urows[0]) {
        userBank.bankName = urows[0].bankName || '';
        userBank.accountNumber = urows[0].accountNumber || '';
        userBank.accountHolder = urows[0].accountHolder || '';
      }
    } catch (err) {
      console.warn('Failed to load complaint customer bank info:', err?.message || err);
    }

    const complaint = await createComplaintDraft({
      userId,
      vendorId: context.vendor_id,
      transactionId: context.transaction_id,
      type: normalizedType,
      description: payload.description || (normalizedType === 'pembatalan'
        ? 'Permintaan pembatalan transaksi yang sudah dibayar.'
        : ''),
      evidenceUrl: evidenceUrls[0] || '',
      refundAmount: payload.refundAmount || 0,
      customer_account_name: userBank.accountHolder,
      customer_account_number: userBank.accountNumber,
      customer_bank_name: userBank.bankName
    });

    return NextResponse.json({
      success: true,
      message: normalizedType === 'pembatalan'
        ? 'Permintaan pembatalan berhasil diteruskan ke admin untuk dimediasi.'
        : 'Complaint berhasil diajukan ke admin.',
      data: complaint
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating complaint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal membuat complaint.' }, { status: 500 });
  }
}
