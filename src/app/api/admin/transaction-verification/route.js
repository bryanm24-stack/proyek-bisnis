import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';

export async function GET() {
  try {
    const transactions = await readData('transactions');
    const users = await readData('users');

    const data = transactions
      .filter((trx) => trx.identityVerification)
      .map((trx) => {
        const customer = users.find((u) => u.id === trx.userId);
        return {
          ...trx,
          customerName: customer?.name || 'Customer',
          customerEmail: customer?.email || '-',
          customerPhone: customer?.phone || '-'
        };
      })
      .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error getting transaction verification list:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { transactionId, action, adminId, adminName, adminNotes } = body;

    if (!transactionId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'transactionId dan action (approve/reject) wajib diisi.' },
        { status: 400 }
      );
    }

    const transactions = await readData('transactions');
    const trxIndex = transactions.findIndex((trx) => trx.id === transactionId);

    if (trxIndex === -1) {
      return NextResponse.json({ success: false, message: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    if (!transactions[trxIndex].identityVerification) {
      return NextResponse.json(
        { success: false, message: 'Data identitas untuk transaksi ini tidak ditemukan.' },
        { status: 400 }
      );
    }

    transactions[trxIndex].identityVerification.status = action === 'approve' ? 'approved' : 'rejected';
    transactions[trxIndex].identityVerification.reviewedAt = new Date().toISOString();
    transactions[trxIndex].identityVerification.reviewedBy = {
      id: adminId || null,
      name: adminName || 'Admin'
    };
    transactions[trxIndex].identityVerification.adminNotes = adminNotes || '';

    await writeData('transactions', transactions);

    return NextResponse.json(
      {
        success: true,
        message: action === 'approve' ? 'Identitas transaksi berhasil diverifikasi.' : 'Identitas transaksi ditolak.',
        data: transactions[trxIndex]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating transaction verification status:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
