import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * GET /api/returns?dealId=xxx
 * Get return status for a specific deal
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
        status: deal.status,
        borrowDate: deal.borrowDate || null,
        expectedReturnDate: deal.expectedReturnDate || null,
        actualReturnDate: deal.actualReturnDate || null,
        returnStatus: deal.returnStatus || 'pending',
        damageStatus: deal.damageStatus || 'none',
        damageDescription: deal.damageDescription || '',
        damageCharge: deal.damageCharge || 0,
        daysLate: deal.daysLate || 0,
        lateCharge: deal.lateCharge || 0,
        totalRefund: deal.totalRefund || 0,
        refundStatus: deal.refundStatus || 'pending',
        returnPhotos: deal.returnPhotos || [],
        customerConfirmed: deal.customerConfirmed || false,
        vendorConfirmed: deal.vendorConfirmed || false,
        settlementDate: deal.settlementDate || null,
        complains: deal.complains || []
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting return status:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}

/**
 * POST /api/returns
 * Initiate return process (customer submits return request)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { dealId, customerId, itemCondition, damageDescription, returnPhotos } = body;

    if (!dealId || !customerId || !itemCondition) {
      return NextResponse.json({
        success: false,
        message: 'dealId, customerId, dan itemCondition wajib diisi'
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

    // ✅ FIX #5: Validate rental dates are set
    if (!deal.borrowDate || !deal.expectedReturnDate) {
      return NextResponse.json({
        success: false,
        message: 'Data peminjaman tidak lengkap. borrowDate atau expectedReturnDate belum diatur. Hubungi vendor atau support.'
      }, { status: 400 });
    }

    // ✅ FIX #5: Validate deal is in correct status for return
    // Allow return only on: agreed (payment made but not started), active (ongoing rental), or returning (already initiated)
    if (!['agreed', 'active', 'returning'].includes(deal.status)) {
      return NextResponse.json({
        success: false,
        message: `Peminjaman tidak bisa di-return. Status saat ini: '${deal.status}'. Hanya status 'agreed', 'active', atau 'returning' yang bisa di-return.`
      }, { status: 400 });
    }

    // Set return date to now
    const actualReturnDate = new Date().toISOString().split('T')[0];
    deal.actualReturnDate = actualReturnDate;

    // Calculate days late using CURRENT deal's expectedReturnDate (not old deal from previous cycle - ✅ FIX #5)
    const expectedReturn = new Date(deal.expectedReturnDate);
    const actualReturn = new Date(actualReturnDate);
    const daysLate = Math.max(0, Math.ceil((actualReturn - expectedReturn) / (1000 * 60 * 60 * 24)));
    deal.daysLate = daysLate;

    // Store item condition and damage info
    deal.itemCondition = itemCondition; // 'good', 'minor_damage', 'major_damage', 'lost'
    deal.returnPhotos = returnPhotos || [];
    deal.returnStatus = 'pending_inspection'; // Waiting for vendor inspection
    deal.damageDescription = damageDescription || '';
    
    // Set initial damage status based on condition
    if (itemCondition === 'good') {
      deal.damageStatus = 'none';
      deal.damageCharge = 0;
    } else if (itemCondition === 'minor_damage') {
      deal.damageStatus = 'minor';
      deal.damageCharge = 0; // Will be set by vendor
    } else if (itemCondition === 'major_damage') {
      deal.damageStatus = 'major';
      deal.damageCharge = 0; // Will be set by vendor
    } else if (itemCondition === 'lost') {
      deal.damageStatus = 'lost';
      deal.damageCharge = deal.totalPrice || 0; // Full price as damage charge
    }

    // Calculate late charge: daily_rate × daysLate
    // daily_rate = totalPrice / rentalDays (using actual rental duration)
    // Get rental duration from deal data or calculate from dates
    let rentalDays = deal.rentalDays || deal.durationDays || 1;
    if (rentalDays <= 0 && deal.borrowDate && deal.expectedReturnDate) {
      rentalDays = Math.ceil((new Date(deal.expectedReturnDate) - new Date(deal.borrowDate)) / (1000 * 60 * 60 * 24));
    }
    rentalDays = Math.max(rentalDays, 1); // Ensure at least 1 day
    const dailyRate = (deal.totalPrice || 0) / rentalDays;
    deal.lateCharge = Math.round(daysLate * dailyRate);

    // Status for inspection
    deal.status = 'returning'; // Differentiate from 'agreed' or 'completed'

    await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Permintaan pengembalian berhasil diajukan. Tunggu inspeksi dari vendor.',
      data: {
        dealId: deal.id,
        actualReturnDate: deal.actualReturnDate,
        daysLate: deal.daysLate,
        lateCharge: deal.lateCharge,
        returnStatus: deal.returnStatus,
        itemCondition: deal.itemCondition,
        estimatedRefund: (deal.totalPrice || 0) - deal.damageCharge - deal.lateCharge
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error initiating return:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}

/**
 * PUT /api/returns
 * Vendor inspects return and assesses damage
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { dealId, vendorId, damageStatus, damageCharge, notes } = body;

    if (!dealId || !vendorId || !damageStatus) {
      return NextResponse.json({
        success: false,
        message: 'dealId, vendorId, dan damageStatus wajib diisi'
      }, { status: 400 });
    }

    if (!['none', 'minor', 'major', 'lost'].includes(damageStatus)) {
      return NextResponse.json({
        success: false,
        message: 'damageStatus harus: none, minor, major, atau lost'
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

    // ✅ FIX #5: Validate return has been initiated by customer
    if (deal.returnStatus !== 'pending_inspection' && deal.returnStatus !== 'inspected') {
      return NextResponse.json({
        success: false,
        message: `Peminjaman belum siap untuk inspeksi. Return status: '${deal.returnStatus}'. Tunggu customer mengajukan return terlebih dahulu.`
      }, { status: 400 });
    }

    // ✅ FIX #5: Validate rental dates are set (should be set when customer submits return)
    if (!deal.borrowDate || !deal.expectedReturnDate || !deal.actualReturnDate) {
      return NextResponse.json({
        success: false,
        message: 'Data peminjaman tidak lengkap. Hubungi support jika masalah berlanjut.'
      }, { status: 400 });
    }

    // ✅ FIX #5: Validate daysLate is already calculated
    if (deal.daysLate === undefined || deal.daysLate === null) {
      return NextResponse.json({
        success: false,
        message: 'Hari keterlambatan belum dihitung. Hubungi support jika masalah berlanjut.'
      }, { status: 400 });
    }

    // Update damage assessment
    deal.damageStatus = damageStatus;
    deal.damageCharge = damageCharge || 0;
    deal.inspectionNotes = notes || '';
    deal.vendorConfirmed = true;

    // Calculate total refund
    const basePrice = deal.totalPrice || 0;
    const totalDeductions = (deal.damageCharge || 0) + (deal.lateCharge || 0);
    deal.totalRefund = Math.max(0, basePrice - totalDeductions);
    deal.refundStatus = 'pending_payment'; // Ready for refund processing

    // Set return status to inspected
    deal.returnStatus = 'inspected';

    // ✅ FIX #2: Update booking status to 'pending_return' (awaiting return confirmation)
    if (deal.bookingId) {
      try {
        const servicesPath = path.join(process.cwd(), 'services.json');
        let servicesData = await fs.readFile(servicesPath, 'utf-8');
        servicesData = servicesData.replace(/^\uFEFF/, '').trim();
        const services = JSON.parse(servicesData);
        
        const serviceIndex = services.findIndex(s => s.bookings && s.bookings.find(b => b.id === deal.bookingId));
        if (serviceIndex !== -1) {
          const booking = services[serviceIndex].bookings.find(b => b.id === deal.bookingId);
          if (booking && booking.status === 'active') {
            booking.status = 'pending_return'; // Item is returned, awaiting vendor inspection
            booking.returnRequestedAt = new Date().toISOString();
            await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));
          }
        }
      } catch (e) {
        console.warn('Could not update booking status:', e.message);
        // Continue anyway - booking update is enhancement
      }
    }

    // If no issues and on-time, auto-complete
    if (damageStatus === 'none' && deal.daysLate === 0 && deal.customerConfirmed) {
      deal.status = 'completed';
      deal.returnStatus = 'completed';
      deal.refundStatus = 'processed';
      deal.settlementDate = new Date().toISOString().split('T')[0];
    }

    await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Inspeksi pengembalian berhasil disimpan',
      data: {
        dealId: deal.id,
        damageStatus: deal.damageStatus,
        damageCharge: deal.damageCharge,
        lateCharge: deal.lateCharge,
        totalRefund: deal.totalRefund,
        refundStatus: deal.refundStatus,
        returnStatus: deal.returnStatus,
        autoCompleted: deal.status === 'completed'
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error inspecting return:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/returns
 * Customer confirms return settlement (for completing the return)
 */
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { dealId, customerId } = body;

    if (!dealId || !customerId) {
      return NextResponse.json({
        success: false,
        message: 'dealId dan customerId wajib diisi'
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

    // Final confirmation from customer
    deal.customerConfirmed = true;

    // If vendor also confirmed, mark as completed
    if (deal.vendorConfirmed) {
      deal.status = 'completed';
      deal.returnStatus = 'completed';
      deal.settlementDate = new Date().toISOString().split('T')[0];
    }

    await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Pengembalian berhasil diselesaikan',
      data: {
        dealId: deal.id,
        status: deal.status,
        totalRefund: deal.totalRefund,
        refundStatus: deal.refundStatus,
        settlementDate: deal.settlementDate
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error confirming return:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}
