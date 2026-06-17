import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Check if two date ranges overlap
 */
function dateRangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

/**
 * Parse JSON safely
 */
const parseJsonSafe = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/**
 * Validate availability for a service on a specific date range
 * GET: Check if service is available
 * POST: Same as GET but also returns booking history
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, itemId, quantity, startDate, endDate } = body;

    if (!serviceId || !quantity || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        message: 'Data tidak lengkap (serviceId, quantity, startDate, endDate diperlukan)',
        available: false
      }, { status: 400 });
    }

    const requestedQuantity = Number(quantity);
    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Quantity harus lebih dari 0',
        available: false
      }, { status: 400 });
    }

    // Fetch service from database
    const services = await query(
      'SELECT id, quantity FROM services WHERE id = ? LIMIT 1',
      [serviceId]
    );

    if (services.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan',
        available: false
      }, { status: 404 });
    }

    const service = services[0];
    const serviceType = 'barang'; // Default to barang if not stored in DB
    const totalQuantity = Number(service.quantity ?? 0);

    if (totalQuantity === 0) {
      return NextResponse.json({
        success: false,
        message: serviceType === 'jasa' 
          ? 'Provider/Tim tidak memiliki availability' 
          : 'Barang tidak memiliki stok',
        available: false,
        availableQuantity: 0,
        requestedQuantity,
        totalQuantity,
        periodStart: startDate,
        periodEnd: endDate
      }, { status: 400 });
    }

    // Parse dates
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (startDateTime >= endDateTime) {
      return NextResponse.json({
        success: false,
        message: 'Tanggal berakhir harus setelah tanggal mulai',
        available: false
      }, { status: 400 });
    }

    // Fetch successful transactions that overlap with requested period
    // We're checking for transactions where the rental dates overlap
    const transactions = await query(
      `SELECT id, service_id, quantity, start_date, duration_days, status
       FROM transactions 
       WHERE service_id = ? AND status = 'success'
       ORDER BY start_date ASC`,
      [serviceId]
    );

    // Calculate booked quantity for overlapping periods
    let bookedQuantity = 0;

    for (const transaction of transactions) {
      if (!transaction.start_date || !transaction.duration_days) continue;

      const txStart = new Date(transaction.start_date);
      const txEnd = new Date(txStart);
      txEnd.setDate(txEnd.getDate() + Number(transaction.duration_days));

      // Check if this transaction's dates overlap with the requested dates
      if (dateRangesOverlap(startDateTime, endDateTime, txStart, txEnd)) {
        bookedQuantity += Number(transaction.quantity || 0);
      }
    }

    const availableQuantity = totalQuantity - bookedQuantity;

    // Response object
    const response = {
      success: availableQuantity >= requestedQuantity,
      message: '',
      available: availableQuantity >= requestedQuantity,
      availableQuantity,
      requestedQuantity,
      totalQuantity,
      bookedQuantity,
      periodStart: startDate,
      periodEnd: endDate,
      service: {
        id: service.id
      }
    };

    if (availableQuantity < requestedQuantity) {
      response.message = serviceType === 'jasa'
        ? `❌ Availability tidak mencukupi. Tersedia: ${availableQuantity}, diminta: ${requestedQuantity}`
        : `❌ Stok tidak mencukupi. Tersedia: ${availableQuantity}, diminta: ${requestedQuantity}`;
      return NextResponse.json(response, { status: 400 });
    }

    // Check for full booking days
    const daysByStatus = {};
    const requestDays = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));

    for (const transaction of transactions) {
      if (!transaction.start_date || !transaction.duration_days) continue;

      const txStart = new Date(transaction.start_date);
      const txEnd = new Date(txStart);
      txEnd.setDate(txEnd.getDate() + Number(transaction.duration_days));

      if (dateRangesOverlap(startDateTime, endDateTime, txStart, txEnd)) {
        // Mark days that have full booking
        let current = new Date(txStart);
        while (current < txEnd && current < endDateTime) {
          if (current >= startDateTime) {
            const dayKey = current.toISOString().split('T')[0];
            daysByStatus[dayKey] = (daysByStatus[dayKey] || 0) + Number(transaction.quantity);
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }

    // Find full booking days
    const fullBookingDays = Object.keys(daysByStatus).filter(
      day => daysByStatus[day] >= totalQuantity
    );

    response.message = serviceType === 'jasa' 
      ? `✓ Availability tersedia (${availableQuantity} slot tersisa)`
      : `✓ Stok tersedia (${availableQuantity} unit tersisa)`;
    
    if (fullBookingDays.length > 0) {
      response.fullBookingDates = fullBookingDays;
      response.warningMessage = `Tanggal berikut sudah FULL BOOKING: ${fullBookingDays.join(', ')}`;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error validating availability:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message,
      available: false
    }, { status: 500 });
  }
}

/**
 * GET - Simple check if available
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const quantity = searchParams.get('quantity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!serviceId || !quantity || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        message: 'Query parameters required: serviceId, quantity, startDate, endDate',
        available: false
      }, { status: 400 });
    }

    // Reuse POST logic via calling it with a mock request body
    const mockRequest = {
      json: async () => ({ serviceId, quantity: Number(quantity), startDate, endDate })
    };

    return POST(mockRequest);

  } catch (error) {
    console.error('Error in GET availability:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server',
      available: false
    }, { status: 500 });
  }
}
