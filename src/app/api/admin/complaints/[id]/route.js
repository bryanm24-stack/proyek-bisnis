import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

import { ensureComplaintsTable, getComplaintById, updateComplaintWorkflow } from '@/lib/complaints';

export async function PATCH(request, { params }) {
  try {
    await ensureComplaintsTable();
    const resolvedParams = await params;
    const complaintId = resolvedParams?.id;

    if (!complaintId) {
      return NextResponse.json({ success: false, message: 'Komplain ID diperlukan' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let body = {};

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      let refundProofUrl = '';
      const proofFile = form.get('refundProof');

      if (proofFile && typeof proofFile.arrayBuffer === 'function') {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'refund-proofs');
        await fs.mkdir(uploadsDir, { recursive: true });
        const arrayBuffer = await proofFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const safeName = (proofFile.name || 'refund-proof').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filename = `${Date.now()}-${safeName}`;
        await fs.writeFile(path.join(uploadsDir, filename), buffer);
        refundProofUrl = `/uploads/refund-proofs/${filename}`;
      }

      body = {
        actorRole: form.get('actorRole') || 'vendor',
        vendorId: form.get('vendorId') || form.get('actorId') || '',
        adminId: form.get('adminId') || '',
        action: form.get('action') || '',
        note: form.get('note') || form.get('adminNote') || form.get('vendorNote') || '',
        refundAmount: form.get('refundAmount') || 0,
        refundMethod: form.get('refundMethod') || '',
        refundReference: form.get('refundReference') || '',
        refundMetadata: form.get('refundMetadata') || null,
        refundPaidAt: form.get('refundPaidAt') || '',
        verifiedRecipientName: form.get('verifiedRecipientName') || '',
        verifiedRecipientAccountNumber: form.get('verifiedRecipientAccountNumber') || '',
        refundProofUrl
      };
    } else {
      body = await request.json();
    }

    const actorRole = body.actorRole || 'admin';
    const actorId = body.adminId || body.vendorId || body.actorId;

    if (!actorId) {
      return NextResponse.json({ success: false, message: 'Identitas actor diperlukan' }, { status: 400 });
    }

    const data = await updateComplaintWorkflow({
      complaintId,
      action: body.action,
      actorRole,
      actorId,
      note: body.note || body.adminNote || body.vendorNote || '',
      refundAmount: body.refundAmount,
      refundMethod: body.refundMethod,
      refundReference: body.refundReference,
      refundProofUrl: body.refundProofUrl,
      refundPaidAt: body.refundPaidAt,
      verifiedRecipientName: body.verifiedRecipientName,
      verifiedRecipientAccountNumber: body.verifiedRecipientAccountNumber
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error updating komplain workflow:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal memperbarui komplain.' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    await ensureComplaintsTable();
    const resolvedParams = await params;
    const complaintId = resolvedParams?.id;
    const data = await getComplaintById(complaintId);

    if (!data) {
      return NextResponse.json({ success: false, message: 'Komplain tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error reading komplain detail:', error);
    return NextResponse.json({ success: false, message: 'Gagal memuat detail komplain.' }, { status: 500 });
  }
}
