import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

function getServiceCapacity(service) {
  return Number(service?.availableQuantity ?? service?.availability ?? service?.quantity ?? 0) || 0;
}

// POST - Reserve items untuk booking tertentu
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, transactionId, dealId, quantity, startDate, endDate, status = 'confirmed' } = body;

    if (!serviceId || !quantity || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        message: 'Data tidak lengkap (serviceId, quantity, startDate, endDate diperlukan)'
      }, { status: 400 });
    }

    const servicesPath = path.join(process.cwd(), 'services.json');

    // Read services
    let servicesData = await fs.readFile(servicesPath, 'utf-8');
    servicesData = servicesData.replace(/^\uFEFF/, '').trim();
    const services = JSON.parse(servicesData);

    // Find service
    const serviceIndex = services.findIndex(s => String(s.id) === String(serviceId));
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    const service = services[serviceIndex];

    // Initialize bookings array if not exists
    if (!service.bookings) {
      service.bookings = [];
    }

    // Create booking record
    const newBooking = {
      id: `BOOKING-${Date.now()}`,
      transactionId: transactionId || null,
      dealId: dealId || null,
      quantity: Number(quantity),
      startDate: startDate,
      endDate: endDate,
      status: status, // 'pending', 'confirmed', 'cancelled', 'completed'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Reserve/decrement actual stock at reservation time and mark booking.stockReserved
    if (service.type !== 'jasa') {
      let remaining = Number(quantity);
      for (const item of service.items || []) {
        if (remaining <= 0) break;
        const dec = Math.min(Number(item.stok) || 0, remaining);
        item.stok = (Number(item.stok) || 0) - dec;
        remaining -= dec;
      }
    } else {
      service.quantity = Math.max(0, (service.quantity || 0) - Number(quantity));
    }

    newBooking.stockReserved = true;

    // Add booking to service
    service.bookings.push(newBooking);

    // Update availableQuantity (recalculate) based on service type
    let totalQuantity = 0;
    const serviceType = service.type || 'barang';
    
    if (serviceType === 'jasa') {
      // JASA: prefer availableQuantity, fallback to availability/quantity for backward compatibility
      totalQuantity = getServiceCapacity(service);
    } else {
      // BARANG: Sum of all items stok
      totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }
    
    let bookedQuantity = 0;
    for (const booking of service.bookings) {
      if (booking.status !== 'cancelled' && booking.status !== 'completed') {
        bookedQuantity += booking.quantity || 0;
      }
    }
    service.availableQuantity = Math.max(0, totalQuantity - bookedQuantity);
    if (serviceType === 'jasa') {
      service.availability = service.availableQuantity;
      service.quantity = service.availableQuantity;
    }

    // Save updated services
    await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));

    // Calculate bookedQuantity for response
    let responseBookedQty = 0;
    for (const booking of service.bookings) {
      if (booking.status !== 'cancelled' && booking.status !== 'completed') {
        responseBookedQty += booking.quantity || 0;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking berhasil dibuat dan diresevasi',
      booking: newBooking,
      service: {
        id: service.id,
        title: service.title,
        totalQuantity: totalQuantity,
        bookedQuantity: responseBookedQty,
        availableQuantity: service.availableQuantity
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat membuat reservasi: ' + error.message
    }, { status: 500 });
  }
}

// GET - List semua bookings untuk service
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json({
        message: 'Query param "serviceId" diperlukan'
      }, { status: 400 });
    }

    const servicesPath = path.join(process.cwd(), 'services.json');

    // Read services
    let servicesData = await fs.readFile(servicesPath, 'utf-8');
    servicesData = servicesData.replace(/^\uFEFF/, '').trim();
    const services = JSON.parse(servicesData);

    const service = services.find(s => String(s.id) === String(serviceId));
    if (!service) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    const bookings = service.bookings || [];
    
    // Filter by status if provided
    const statusFilter = searchParams.get('status');
    let filteredBookings = bookings;
    if (statusFilter) {
      filteredBookings = bookings.filter(b => b.status === statusFilter);
    }

    // Calculate total quantity based on service type
    let totalQty = 0;
    const svcType = service.type || 'barang';
    
    if (svcType === 'jasa') {
      // JASA: prefer availableQuantity, fallback to availability/quantity for backward compatibility
      totalQty = getServiceCapacity(service);
    } else {
      // BARANG: Sum of all items stok
      totalQty = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }
    
    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        title: service.title,
        quantity: totalQty,
        availableQuantity: service.availableQuantity
      },
      bookings: filteredBookings,
      total: filteredBookings.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan: ' + error.message
    }, { status: 500 });
  }
}

// PUT - Update booking status (untuk cancel, complete, etc)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { serviceId, bookingId, newStatus } = body;

    if (!serviceId || !bookingId || !newStatus) {
      return NextResponse.json({
        success: false,
        message: 'Data tidak lengkap (serviceId, bookingId, newStatus diperlukan)'
      }, { status: 400 });
    }

    const servicesPath = path.join(process.cwd(), 'services.json');

    // Read services
    let servicesData = await fs.readFile(servicesPath, 'utf-8');
    servicesData = servicesData.replace(/^\uFEFF/, '').trim();
    const services = JSON.parse(servicesData);

    // Find service
    const serviceIndex = services.findIndex(s => String(s.id) === String(serviceId));
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    const service = services[serviceIndex];
    const bookingIndex = (service.bookings || []).findIndex(b => b.id === bookingId);
    
    if (bookingIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Booking tidak ditemukan'
      }, { status: 404 });
    }

    // Update booking
    const oldStatus = service.bookings[bookingIndex].status;
    service.bookings[bookingIndex].status = newStatus;
    service.bookings[bookingIndex].updatedAt = new Date().toISOString();

    // Recalculate availableQuantity based on service type
    let totalQuantity = 0;
    const putServiceType = service.type || 'barang';
    
    if (putServiceType === 'jasa') {
      // JASA: prefer availability, fallback to quantity for backward compatibility
      totalQuantity = Number(service.availability ?? service.quantity) || 0;
    } else {
      // BARANG: Sum of all items stok
      totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }
    
    let bookedQuantity = 0;
    for (const booking of service.bookings) {
      if (booking.status !== 'cancelled' && booking.status !== 'completed') {
        bookedQuantity += booking.quantity || 0;
      }
    }
    service.availableQuantity = Math.max(0, totalQuantity - bookedQuantity);

    // Save updated services
    await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));

    return NextResponse.json({
      success: true,
      message: `Status booking berhasil diubah dari ${oldStatus} ke ${newStatus}`,
      booking: service.bookings[bookingIndex],
      availableQuantity: service.availableQuantity
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat update booking: ' + error.message
    }, { status: 500 });
  }
}
