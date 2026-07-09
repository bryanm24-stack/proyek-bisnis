import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
/**
 * POST /api/bookings/pickup
 * Confirm that customer has picked up or received item
 * Updates booking status: confirmed → active
 *  CRITICAL: This is where STOCK GETS DECREMENTED!
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, bookingId, transactionId, action = 'confirm_pickup' } = body;

    if (!serviceId || !bookingId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId dan bookingId diperlukan'
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

    if (action === 'confirm_pickup') {
      // Validate booking is in "confirmed" state
      if (booking.status !== 'confirmed') {
        return NextResponse.json({
          success: false,
          message: `Hanya booking dengan status 'confirmed' yang bisa pickup. Status saat ini: ${booking.status}`
        }, { status: 400 });
      }

      // Update booking status to 'active' (customer punya item)
      booking.status = 'active';
      booking.pickupConfirmedAt = new Date().toISOString();

      //  CRITICAL: DECREMENT ACTUAL STOCK!
      const serviceType = service.type || 'barang';
      let totalQuantity = 0;
      
      // If stock was already reserved during payment/reservation, skip decrement here
      if (booking.stockReserved) {
        // stock already adjusted at reservation/transaction time
      } else {
        if (serviceType === 'jasa') {
          // For services (jasa), decrement service.quantity
          service.quantity = Math.max(0, (service.quantity || 0) - booking.quantity);
          totalQuantity = service.quantity;
        } else {
          // For goods (barang), decrement from items stok
          let remaining = booking.quantity;
          for (const item of service.items || []) {
            if (remaining <= 0) break;
            const decrement = Math.min(item.stok || 0, remaining);
            item.stok = (item.stok || 0) - decrement;
            remaining -= decrement;
          }
          totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
        }
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

      console.log(` Pickup confirmed for booking ${bookingId}. Stock decremented by ${booking.quantity}.`);

      return NextResponse.json({
        success: true,
        message: 'Pickup confirmed. Stok berhasil dikurangi.',
        booking: {
          id: booking.id,
          status: booking.status,
          quantity: booking.quantity,
          pickupConfirmedAt: booking.pickupConfirmedAt
        },
        service: {
          id: service.id,
          currentStock: currentStock,
          bookedQuantity: bookedQuantity,
          availableQuantity: service.availableQuantity
        }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: 'Action tidak dikenal'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in pickup endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    }, { status: 500 });
  }
}
