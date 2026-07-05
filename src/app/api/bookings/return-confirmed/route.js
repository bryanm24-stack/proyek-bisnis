import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
/**
 * POST /api/bookings/return-confirmed
 * Called by vendor after return is approved
 * Updates booking status: pending_return → completed
 *  CRITICAL: This is where STOCK GETS INCREMENTED BACK!
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, bookingId, vendorId } = body;

    if (!serviceId || !bookingId || !vendorId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId, bookingId, dan vendorId diperlukan'
      }, { status: 400 });
    }

    const services = await readData('services');

    // Find service
    const serviceIndex = services.findIndex(s => String(s.id) === String(serviceId));
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    const service = services[serviceIndex];

    // Find booking
    if (!service.bookings) service.bookings = [];
    const bookingIndex = service.bookings.findIndex(b => String(b.id) === String(bookingId));
    if (bookingIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Booking tidak ditemukan'
      }, { status: 404 });
    }

    const booking = service.bookings[bookingIndex];

    // Validate booking is in pending_return or returned state
    if (booking.status !== 'pending_return' && booking.status !== 'returned') {
      return NextResponse.json({
        success: false,
        message: `Hanya booking dengan status 'pending_return' atau 'returned' yang bisa di-confirm. Status saat ini: ${booking.status}`
      }, { status: 400 });
    }

    // Update booking status to 'completed'
    booking.status = 'completed';
    booking.returnConfirmedAt = new Date().toISOString();

    //  CRITICAL: INCREMENT ACTUAL STOCK BACK!
    const serviceType = service.type || 'barang';
    let totalQuantity = 0;
    
    if (serviceType === 'jasa') {
      // For services (jasa), increment service.quantity
      service.quantity = (service.quantity || 0) + booking.quantity;
      totalQuantity = service.quantity;
    } else {
      // For goods (barang), increment back to items
      let toAdd = booking.quantity;
      for (const item of service.items || []) {
        if (toAdd <= 0) break;
        // Add back evenly or to first available item
        const add = Math.min(toAdd, booking.quantity); // Add all to each item that has space
        item.stok = (item.stok || 0) + add;
        toAdd -= add;
      }
      totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }

    // Recalculate availableQuantity (stock - currently booked)
    let bookedQuantity = 0;
    for (const b of service.bookings) {
      // Count: confirmed, active, pending_return (items still not returned)
      if (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending_return') {
        bookedQuantity += b.quantity || 0;
      }
    }
    
    let currentStock = 0;
    if (serviceType === 'jasa') {
      currentStock = service.quantity;
    } else {
      currentStock = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }
    
    service.availableQuantity = Math.max(0, currentStock - bookedQuantity);

    // Save updated services
    await writeData('service', services);

    console.log(` Return confirmed for booking ${bookingId}. Stock incremented by ${booking.quantity}.`);

    return NextResponse.json({
      success: true,
      message: 'Return confirmed. Stok berhasil ditambah kembali.',
      booking: {
        id: booking.id,
        status: booking.status,
        quantity: booking.quantity,
        returnConfirmedAt: booking.returnConfirmedAt
      },
      service: {
        id: service.id,
        currentStock: currentStock,
        bookedQuantity: bookedQuantity,
        availableQuantity: service.availableQuantity
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in return-confirmed endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    }, { status: 500 });
  }
}
