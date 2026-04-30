import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * GET /api/returns/extension?dealId=xxx
 * Get extension request status for a deal
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');

    if (!dealId) {
      return NextResponse.json({
        success: false,
        message: 'dealId diperlukan'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    const deals = JSON.parse(dealsData);

    const deal = deals.find(d => d.id === dealId);
    if (!deal) {
      return NextResponse.json({
        success: false,
        message: 'Deal tidak ditemukan'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        dealId: deal.id,
        extensionRequest: deal.extensionRequest || null,
        extensionRequests: deal.extensionRequests || [],
        currentReturnDate: deal.expectedReturnDate,
        canExtend: deal.status === 'agreed' && !deal.extensionRequest?.approved
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting extension status:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}

/**
 * POST /api/returns/extension
 * Customer requests rental extension
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { dealId, customerId, extendedReturnDate, proposedPrice, reason } = body;

    if (!dealId || !customerId || !extendedReturnDate || !proposedPrice) {
      return NextResponse.json({
        success: false,
        message: 'dealId, customerId, extendedReturnDate, dan proposedPrice wajib diisi'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    let deals = JSON.parse(dealsData);

    const dealIndex = deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Deal tidak ditemukan'
      }, { status: 404 });
    }

    const deal = deals[dealIndex];

    // Validate customer
    if (deal.customerId !== customerId) {
      return NextResponse.json({
        success: false,
        message: 'Anda tidak memiliki akses untuk deal ini'
      }, { status: 403 });
    }

    // Only can extend if rental is still ongoing (status = 'agreed')
    if (deal.status !== 'agreed') {
      return NextResponse.json({
        success: false,
        message: 'Hanya bisa extend rental yang masih berlangsung'
      }, { status: 400 });
    }

    // Validate extended date is after current return date
    const currentReturn = new Date(deal.expectedReturnDate);
    const extendedDate = new Date(extendedReturnDate);
    if (extendedDate <= currentReturn) {
      return NextResponse.json({
        success: false,
        message: 'Tanggal perpanjangan harus lebih baru dari tanggal kembali asli'
      }, { status: 400 });
    }

    // Create extension request
    const extensionRequest = {
      id: `ext_${Date.now()}`,
      originalReturnDate: deal.expectedReturnDate,
      extendedReturnDate,
      proposedPrice,
      reason: reason || '',
      status: 'pending', // pending, approved, rejected
      requestedAt: new Date().toISOString(),
      respondedAt: null
    };

    if (!deal.extensionRequests) {
      deal.extensionRequests = [];
    }
    deal.extensionRequests.push(extensionRequest);
    deal.extensionRequest = extensionRequest; // Current active request

    await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Permintaan perpanjangan berhasil dikirim. Tunggu persetujuan vendor.',
      data: extensionRequest
    }, { status: 201 });
  } catch (error) {
    console.error('Error requesting extension:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}

/**
 * PUT /api/returns/extension
 * Vendor responds to extension request (approve/reject)
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { dealId, vendorId, extensionRequestId, action, counterPrice } = body;

    if (!dealId || !vendorId || !extensionRequestId || !action) {
      return NextResponse.json({
        success: false,
        message: 'dealId, vendorId, extensionRequestId, dan action wajib diisi'
      }, { status: 400 });
    }

    if (!['approve', 'reject', 'counter'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'action harus: approve, reject, atau counter'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    let deals = JSON.parse(dealsData);

    const dealIndex = deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Deal tidak ditemukan'
      }, { status: 404 });
    }

    const deal = deals[dealIndex];

    // Validate vendor
    if (deal.vendorId !== vendorId) {
      return NextResponse.json({
        success: false,
        message: 'Anda tidak memiliki akses untuk deal ini'
      }, { status: 403 });
    }

    // Find extension request
    const extReqIndex = (deal.extensionRequests || []).findIndex(r => r.id === extensionRequestId);
    if (extReqIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Permintaan perpanjangan tidak ditemukan'
      }, { status: 404 });
    }

    const extRequest = deal.extensionRequests[extReqIndex];

    if (action === 'approve') {
      // Approve extension
      extRequest.status = 'approved';
      extRequest.respondedAt = new Date().toISOString();
      
      // Update deal with new return date and additional price
      deal.expectedReturnDate = extRequest.extendedReturnDate;
      deal.extensionPrice = extRequest.proposedPrice;
      deal.totalPrice = (deal.totalPrice || 0) + extRequest.proposedPrice;
      deal.extensionRequest = extRequest;
    } else if (action === 'reject') {
      // Reject extension
      extRequest.status = 'rejected';
      extRequest.respondedAt = new Date().toISOString();
      deal.extensionRequest = null;
    } else if (action === 'counter') {
      // Counter offer
      if (!counterPrice) {
        return NextResponse.json({
          success: false,
          message: 'counterPrice diperlukan untuk counter offer'
        }, { status: 400 });
      }
      extRequest.status = 'counter_offered';
      extRequest.counterPrice = counterPrice;
      extRequest.respondedAt = new Date().toISOString();
      deal.extensionRequest = extRequest;
    }

    await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

    return NextResponse.json({
      success: true,
      message: `Permintaan perpanjangan ${action === 'approve' ? 'disetujui' : action === 'reject' ? 'ditolak' : 'counter ditawarkan'}`,
      data: {
        dealId: deal.id,
        extensionRequest: extRequest,
        newReturnDate: deal.expectedReturnDate,
        newTotalPrice: deal.totalPrice
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error responding to extension:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}
