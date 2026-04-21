import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const transactionsPath = path.join(process.cwd(), 'transactions.json');
const usersPath = path.join(process.cwd(), 'users.json');

async function readJsonFile(filePath, fallback = []) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export async function GET() {
  try {
    const transactions = await readJsonFile(transactionsPath, []);
    const users = await readJsonFile(usersPath, []);

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

    const transactions = await readJsonFile(transactionsPath, []);
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

    await fs.writeFile(transactionsPath, JSON.stringify(transactions, null, 2));

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
