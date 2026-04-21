'use server';

import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const readJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

const writeJsonFile = async (filePath, data) => {
  try {
    const utf8 = new TextEncoder();
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, action, complaintDescription, complaintPhoto } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { success: false, message: 'orderId dan action harus diisi' },
        { status: 400 }
      );
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const deals = await readJsonFile(dealsPath);

    const dealIndex = deals.findIndex(d => d.id === orderId);
    if (dealIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    const deal = deals[dealIndex];

    if (action === 'approve') {
      // Customer setuju dengan barang
      deal.inspectionStatus = 'approved';
      deal.approvedAt = new Date().toISOString();
    } else if (action === 'complaint') {
      // Customer komplain
      if (!complaintDescription) {
        return NextResponse.json(
          { success: false, message: 'Deskripsi komplain harus diisi' },
          { status: 400 }
        );
      }
      deal.inspectionStatus = 'complaint';
      deal.complaintDescription = complaintDescription;
      deal.complaintPhoto = complaintPhoto || null;
      deal.complaintDate = new Date().toISOString();
    } else if (action === 'confirm-complaint') {
      // Vendor setuju komplain - trigger refund
      if (deal.inspectionStatus !== 'complaint') {
        return NextResponse.json(
          { success: false, message: 'Hanya komplain yang bisa disetujui' },
          { status: 400 }
        );
      }
      deal.inspectionStatus = 'refunded';
      deal.refundedAt = new Date().toISOString();
      deal.status = 'refunded';
      
      // Catat refund
      deal.refundAmount = deal.totalPrice || 0;
      deal.refundReason = 'Komplain customer disetujui vendor';
    } else {
      return NextResponse.json(
        { success: false, message: 'Action tidak valid' },
        { status: 400 }
      );
    }

    // Save updated deals
    const success = await writeJsonFile(dealsPath, deals);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan perubahan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Status berhasil diupdate',
      data: deal
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server', error: error.message },
      { status: 500 }
    );
  }
}
