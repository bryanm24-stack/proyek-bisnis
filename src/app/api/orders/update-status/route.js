'use server';

import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      orderId,
      action,
      complaintDescription,
      complaintPhoto,
      complaintCategory,
      complaintSeverity,
      resolutionNotes,
      penaltyAmount,
      refundAmount
    } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { success: false, message: 'orderId dan action harus diisi' },
        { status: 400 }
      );
    }

    const deals = await readData('deals');

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
      deal.complaintCategory = complaintCategory || 'damage';
      deal.complaintSeverity = complaintSeverity || 'major';
      deal.complaintDate = new Date().toISOString();
      deal.complaintResolution = null;
      deal.complaintResolutionNotes = null;
      deal.penaltyAmount = 0;
      deal.refundAmount = 0;
    } else if (action === 'request-refund') {
      if (deal.inspectionStatus !== 'checking') {
        return NextResponse.json(
          { success: false, message: 'Refund hanya dapat diminta saat status checking' },
          { status: 400 }
        );
      }
      deal.inspectionStatus = 'refund_requested';
      deal.status = 'refund_requested';
      deal.refundRequestedAt = new Date().toISOString();
      deal.refundAmount = 0;
      deal.refundReason = resolutionNotes || 'Permintaan refund customer';
      deal.complaintResolution = 'refund_requested';
      deal.complaintResolutionNotes = resolutionNotes || '';
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
      deal.complaintResolution = 'full_refund';
      deal.complaintResolutionNotes = resolutionNotes || '';
      deal.penaltyAmount = 0;
    } else if (action === 'approve-refund') {
      if (deal.inspectionStatus !== 'refund_requested') {
        return NextResponse.json(
          { success: false, message: 'Hanya permintaan refund yang bisa disetujui' },
          { status: 400 }
        );
      }
      deal.inspectionStatus = 'refunded';
      deal.status = 'refunded';
      deal.refundedAt = new Date().toISOString();
      deal.refundAmount = deal.totalPrice || 0;
      deal.refundReason = resolutionNotes || 'Refund disetujui vendor';
      deal.complaintResolution = 'refund_approved';
      deal.complaintResolutionNotes = resolutionNotes || '';
      deal.penaltyAmount = 0;
    } else if (action === 'reject-refund') {
      if (deal.inspectionStatus !== 'refund_requested') {
        return NextResponse.json(
          { success: false, message: 'Hanya permintaan refund yang bisa ditolak' },
          { status: 400 }
        );
      }
      deal.inspectionStatus = 'refund_rejected';
      deal.status = deal.status || 'paid';
      deal.refundAmount = 0;
      deal.refundReason = resolutionNotes || 'Refund ditolak vendor';
      deal.complaintResolution = 'refund_rejected';
      deal.complaintResolutionNotes = resolutionNotes || '';
      deal.penaltyAmount = 0;
    } else if (action === 'resolve-partial-refund') {
      if (deal.inspectionStatus !== 'complaint') {
        return NextResponse.json(
          { success: false, message: 'Hanya komplain yang bisa diselesaikan dengan partial refund' },
          { status: 400 }
        );
      }

      const safePenalty = Number(penaltyAmount || 0);
      const basePrice = Number(deal.totalPrice || 0);
      let calculatedRefund = Number(refundAmount || 0);

      if (calculatedRefund <= 0) {
        calculatedRefund = Math.max(0, basePrice - safePenalty);
      }

      deal.inspectionStatus = 'partially_refunded';
      deal.status = 'partially_refunded';
      deal.refundedAt = new Date().toISOString();
      deal.penaltyAmount = safePenalty;
      deal.refundAmount = Math.max(0, Math.min(calculatedRefund, basePrice));
      deal.refundReason = 'Partial refund sesuai hasil investigasi komplain';
      deal.complaintResolution = 'partial_refund';
      deal.complaintResolutionNotes = resolutionNotes || '';
    } else if (action === 'apply-penalty') {
      if (deal.inspectionStatus !== 'complaint') {
        return NextResponse.json(
          { success: false, message: 'Hanya komplain yang bisa diberi denda' },
          { status: 400 }
        );
      }

      const safePenalty = Number(penaltyAmount || 0);
      if (safePenalty <= 0) {
        return NextResponse.json(
          { success: false, message: 'Nominal denda harus lebih dari 0' },
          { status: 400 }
        );
      }

      deal.inspectionStatus = 'penalty_applied';
      deal.status = 'penalty_applied';
      deal.penaltyAmount = safePenalty;
      deal.penaltyAppliedAt = new Date().toISOString();
      deal.refundAmount = 0;
      deal.complaintResolution = 'penalty';
      deal.complaintResolutionNotes = resolutionNotes || 'Denda diberlakukan karena pelanggaran ketentuan sewa';
    } else if (action === 'reject-complaint') {
      if (deal.inspectionStatus !== 'complaint') {
        return NextResponse.json(
          { success: false, message: 'Hanya komplain yang bisa ditolak' },
          { status: 400 }
        );
      }

      deal.inspectionStatus = 'complaint_rejected';
      deal.status = 'completed';
      deal.complaintResolution = 'rejected';
      deal.complaintResolutionNotes = resolutionNotes || 'Komplain tidak dapat diproses karena bukti tidak cukup';
      deal.penaltyAmount = 0;
      deal.refundAmount = 0;
      deal.complaintRejectedAt = new Date().toISOString();
    } else {
      return NextResponse.json(
        { success: false, message: 'Action tidak valid' },
        { status: 400 }
      );
    }

    // Save updated deals
    const success = await writeData('deals', deals);
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
