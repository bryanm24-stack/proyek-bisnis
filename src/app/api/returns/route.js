import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Helpers: date-only UTC handling to avoid timezone off-by-one
const MS_PER_DAY = 24 * 60 * 60 * 1000;
async function readJsonFile(filePath) {
  const fileData = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(fileData.replace(/^\uFEFF/, '').trim());
}
function toDateOnlyUTC(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}
function todayDateString() {
  return new Date().toISOString().split('T')[0];
}
function daysBetweenDates(dateAString, dateBString) {
  const a = toDateOnlyUTC(dateAString);
  const b = toDateOnlyUTC(dateBString);
  if (a === null || b === null) return 0;
  return Math.max(0, Math.round((a - b) / MS_PER_DAY));
}

/**
 * GET /api/returns?dealId=xxx
 * Get return status for a specific deal
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!dealId && (!userId || !userRole)) {
      return NextResponse.json({
        success: false,
        message: 'dealId atau userId dan userRole diperlukan'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const servicesPath = path.join(process.cwd(), 'services.json');
    const usersPath = path.join(process.cwd(), 'users.json');
    const deals = await readJsonFile(dealsPath);
    const services = await readJsonFile(servicesPath);
    const users = await readJsonFile(usersPath);

    if (userId && userRole) {
      const normalizedUserId = String(userId);
      const returnDeals = deals.filter((deal) => {
        const matchesUser = userRole === 'vendor'
          ? String(deal.vendorId) === normalizedUserId
          : String(deal.customerId) === normalizedUserId;

        const hasReturnActivity = Boolean(
          deal.actualReturnDate ||
          deal.itemCondition ||
          deal.returnPhotos?.length ||
          deal.damageDescription ||
          deal.returnStatus === 'pending_inspection' ||
          deal.returnStatus === 'inspected' ||
          deal.returnStatus === 'completed' ||
          deal.returnStatus === 'returning' ||
          deal.refundStatus === 'pending_payment' ||
          deal.refundStatus === 'processed'
        );

        return matchesUser && hasReturnActivity;
      });

      const enrichedReturns = returnDeals
        .map((deal) => {
          const service = services.find((item) => String(item.id) === String(deal.serviceId)) || null;
          const otherUser = userRole === 'vendor'
            ? users.find((item) => String(item.id) === String(deal.customerId)) || null
            : users.find((item) => String(item.id) === String(deal.vendorId)) || null;

          return {
            ...deal,
            service,
            otherUser,
            returnSummary: deal.returnStatus === 'completed'
              ? 'Retur selesai'
              : deal.returnStatus === 'inspected'
                ? 'Retur sudah diinspeksi'
                : deal.returnStatus === 'pending_inspection'
                  ? 'Menunggu inspeksi vendor'
                  : 'Proses retur berjalan'
          };
        })
        .sort((a, b) => new Date(b.actualReturnDate || b.agreedAt || b.createdAt || 0) - new Date(a.actualReturnDate || a.agreedAt || a.createdAt || 0));

      return NextResponse.json({
        success: true,
        data: enrichedReturns,
        message: enrichedReturns.length === 0 ? 'Tidak ada barang yang direturkan' : 'Data retur ditemukan'
      }, { status: 200 });
    }

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
    // Support both JSON body (existing clients) and multipart/form-data (file uploads)
    let dealId, customerId, itemCondition, damageDescription, returnPhotos = [];
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      dealId = form.get('dealId');
      customerId = form.get('customerId');
      itemCondition = form.get('itemCondition');
      damageDescription = form.get('damageDescription') || '';

      // Handle uploaded files under field name 'photos' (multiple)
      const files = form.getAll('photos') || [];
      if (files.length > 0) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'returns');
        await fs.mkdir(uploadsDir, { recursive: true });

        for (const f of files) {
          try {
            // 'f' is a File-like object provided by Web platform in Next.js route handlers
            const arrayBuffer = await f.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const safeName = (f.name || 'photo').replace(/[^a-zA-Z0-9_.-]/g, '_');
            const filename = `${Date.now()}-${safeName}`;
            const dest = path.join(uploadsDir, filename);
            await fs.writeFile(dest, buffer);
            const url = `/uploads/returns/${filename}`;
            returnPhotos.push({ url, filename, uploadedAt: new Date().toISOString() });
          } catch (fileErr) {
            console.warn('Could not save uploaded file:', fileErr?.message || fileErr);
          }
        }
      }
    } else {
      const body = await request.json();
      ({ dealId, customerId, itemCondition, damageDescription, returnPhotos = [] } = body || {});
    }

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

    // Set return date to today (date-only) and calculate days late using UTC date-only math
    const actualReturnDate = todayDateString();
    deal.actualReturnDate = actualReturnDate;
    const daysLate = daysBetweenDates(actualReturnDate, deal.expectedReturnDate);
    deal.daysLate = daysLate;

    // Store item condition and damage info
    deal.itemCondition = itemCondition; // 'good', 'minor_damage', 'major_damage', 'lost'
    // Merge any newly uploaded photos with existing array
    deal.returnPhotos = Array.isArray(deal.returnPhotos) ? deal.returnPhotos.concat(returnPhotos || []) : (returnPhotos || []);
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
    let rentalDays = deal.rentalDays || deal.durationDays || 0;
    if (!rentalDays && deal.borrowDate && deal.expectedReturnDate) {
      rentalDays = daysBetweenDates(deal.expectedReturnDate, deal.borrowDate) || 1;
    }
    rentalDays = Math.max(1, rentalDays);
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

    // If no issues and on-time, auto-complete. Ensure we mark refund processed and settlement date.
    if (damageStatus === 'none' && deal.daysLate === 0 && deal.customerConfirmed) {
      deal.status = 'completed';
      deal.returnStatus = 'completed';
      deal.refundStatus = 'processed';
      deal.settlementDate = todayDateString();
      if (deal.totalRefund === undefined || deal.totalRefund === null) {
        const basePrice = deal.totalPrice || 0;
        const totalDeductions = (deal.damageCharge || 0) + (deal.lateCharge || 0);
        deal.totalRefund = Math.max(0, basePrice - totalDeductions);
      }
    }

    // If vendor confirms now and customer has already confirmed earlier, finalize the return
    if (deal.vendorConfirmed && deal.customerConfirmed) {
      deal.status = 'completed';
      deal.returnStatus = 'completed';
      deal.settlementDate = todayDateString();
      if (!deal.refundStatus || deal.refundStatus === 'pending_payment' || deal.refundStatus === 'pending') {
        deal.refundStatus = 'processed';
      }
      if (deal.totalRefund === undefined || deal.totalRefund === null) {
        const basePrice = deal.totalPrice || 0;
        const totalDeductions = (deal.damageCharge || 0) + (deal.lateCharge || 0);
        deal.totalRefund = Math.max(0, basePrice - totalDeductions);
      }
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

    // If vendor also confirmed, mark as completed and ensure refund processed
    if (deal.vendorConfirmed) {
      deal.status = 'completed';
      deal.returnStatus = 'completed';
      deal.settlementDate = todayDateString();
      // Ensure totalRefund calculated
      if (deal.totalRefund === undefined || deal.totalRefund === null) {
        const basePrice = deal.totalPrice || 0;
        const totalDeductions = (deal.damageCharge || 0) + (deal.lateCharge || 0);
        deal.totalRefund = Math.max(0, basePrice - totalDeductions);
      }
      // Mark refund as processed if it was pending
      if (!deal.refundStatus || deal.refundStatus === 'pending_payment' || deal.refundStatus === 'pending') {
        deal.refundStatus = 'processed';
      }
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
