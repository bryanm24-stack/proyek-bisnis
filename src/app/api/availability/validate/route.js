import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

function getServiceCapacity(service) {
  return Number(service?.availableQuantity ?? service?.availability ?? service?.quantity ?? 0) || 0;
}

// Validasi ketersediaan barang untuk periode tertentu
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, quantity, startDate, endDate } = body;

    if (!serviceId || !quantity || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        message: 'Data tidak lengkap (serviceId, quantity, startDate, endDate diperlukan)',
        available: false
      }, { status: 400 });
    }

    const servicesPath = path.join(process.cwd(), 'services.json');
    const dealsPath = path.join(process.cwd(), 'deals.json');

    // Read services
    let servicesData = await fs.readFile(servicesPath, 'utf-8');
    servicesData = servicesData.replace(/^\uFEFF/, '').trim();
    const services = JSON.parse(servicesData);

    // Find service
    const service = services.find(s => String(s.id) === String(serviceId));
    if (!service) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan',
        available: false
      }, { status: 404 });
    }

    // Get available quantity based on service type
    let totalQuantity = 0;
    const serviceType = service.type || 'barang';
    
    if (serviceType === 'jasa') {
      // JASA: prefer availableQuantity, fallback to availability/quantity for backward compatibility
      totalQuantity = getServiceCapacity(service);
    } else {
      // BARANG: Sum of all items stok
      totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }
    
    if (totalQuantity === 0) {
      return NextResponse.json({
        success: false,
        message: serviceType === 'jasa' ? 'Provider/Tim tidak memiliki availability' : 'Barang tidak memiliki stok',
        available: false,
        availableQuantity: 0,
        requestedQuantity: quantity
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

    // Read deals to get active bookings
    let dealsData = await fs.readFile(dealsPath, 'utf-8');
    dealsData = dealsData.replace(/^\uFEFF/, '').trim();
    const deals = JSON.parse(dealsData);

    // Find overlapping bookings for this service
    // Get bookings from service's bookings array or reconstruct from completed deals
    const service_bookings = service.bookings || [];

    // Check for confirmed bookings that overlap with requested period
    let bookedQuantity = 0;
    
    for (const booking of service_bookings) {
      // Only count confirmed/pending bookings, skip cancelled
      if (booking.status === 'cancelled') continue;

      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);

      // Check if booking overlaps with requested period
      if (bookingStart < endDateTime && bookingEnd > startDateTime) {
        bookedQuantity += booking.quantity || 0;
      }
    }

    const availableQuantity = totalQuantity - bookedQuantity;
    const requestedQuantity = Number(quantity);

    if (availableQuantity < requestedQuantity) {
      return NextResponse.json({
        success: false,
        message: serviceType === 'jasa'
          ? `Availability tidak mencukupi. Tersedia: ${availableQuantity}, diminta: ${requestedQuantity}`
          : `Stok tidak mencukupi. Tersedia: ${availableQuantity}, diminta: ${requestedQuantity}`,
        available: false,
        availableQuantity,
        requestedQuantity,
        totalQuantity,
        bookedQuantity,
        periodStart: startDate,
        periodEnd: endDate
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: serviceType === 'jasa' ? 'Availability tersedia' : 'Stok tersedia',
      available: true,
      availableQuantity,
      requestedQuantity,
      totalQuantity,
      bookedQuantity,
      periodStart: startDate,
      periodEnd: endDate
    }, { status: 200 });

  } catch (error) {
    console.error('Error validating availability:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat validasi: ' + error.message,
      available: false
    }, { status: 500 });
  }
}

// GET - untuk testing, tambahkan query params
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const quantity = searchParams.get('quantity');

    if (!serviceId || !startDate || !endDate || !quantity) {
      return NextResponse.json({
        message: 'Query params diperlukan: serviceId, startDate, endDate, quantity'
      }, { status: 400 });
    }

    // Convert GET to POST-like request
    const body = JSON.stringify({ serviceId, startDate, endDate, quantity: Number(quantity) });
    const postRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    return POST(postRequest);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan',
      error: error.message
    }, { status: 500 });
  }
}
