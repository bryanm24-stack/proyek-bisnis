import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

/**
 * POST /api/bookings/cancel
 * Cancel a booking and process refund
 * Updates booking status: any → cancelled
 * Recalculates availableQuantity
 * Processes refund (if applicable)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, bookingId, reason = '' } = body;

    if (!serviceId || !bookingId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId dan bookingId diperlukan'
      }, { status: 400 });
    }

    const services = await readData('services');
    const transactions = await readData('transactions');

    const serviceIndex = services.findIndex(s => String(s.id) === String(serviceId));
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    const service = services[serviceIndex];
    if (!service.bookings) service.bookings = [];

    const bookingIndex = service.bookings.findIndex(b => String(b.id) === String(bookingId));
    if (bookingIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Booking tidak ditemukan'
      }, { status: 404 });
    }

    const booking = service.bookings[bookingIndex];
    if (booking.status === 'completed') {
      return NextResponse.json({
        success: false,
        message: 'Booking yang sudah selesai tidak bisa dibatalkan'
      }, { status: 400 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        message: 'Booking sudah dibatalkan sebelumnya'
      }, { status: 400 });
    }

    const previousStatus = booking.status;
    const serviceType = service.type || 'barang';

    if (previousStatus === 'active' || previousStatus === 'pending_return') {
      if (serviceType === 'jasa') {
        service.quantity = (service.quantity || 0) + (booking.quantity || 0);
      } else {
        let remaining = booking.quantity || 0;
        for (const item of service.items || []) {
          if (remaining <= 0) break;
          const add = Math.min(remaining, booking.quantity || 0);
          item.stok = (item.stok || 0) + add;
          remaining -= add;
        }
      }
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date().toISOString();
    booking.cancellationReason = reason || '';

    let currentStock = 0;
    if (serviceType === 'jasa') {
      currentStock = service.quantity || 0;
    } else {
      currentStock = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }

    const bookedQuantity = service.bookings.reduce((sum, b) => {
      if (['confirmed', 'active', 'pending_return'].includes(b.status)) {
        return sum + (Number(b.quantity) || 0);
      }
      return sum;
    }, 0);

    service.availableQuantity = Math.max(0, currentStock - bookedQuantity);

    let refundProcessed = false;
    let refundAmount = 0;

    if (booking.transactionId) {
      const transactionIndex = transactions.findIndex(t => String(t.id) === String(booking.transactionId));
      if (transactionIndex !== -1) {
        const transaction = transactions[transactionIndex];
        if (!['refunded', 'cancelled'].includes(transaction.status)) {
          transaction.status = 'refunded';
          transaction.refundedAt = new Date().toISOString();
          transaction.refundReason = reason || 'Booking dibatalkan customer';
          refundAmount = Number(transaction.totalPrice || 0);
          refundProcessed = true;
          await writeData('transactions', transactions);
        }
      }
    }

    await writeData('services', services);

    return NextResponse.json({
      success: true,
      message: `Booking berhasil dibatalkan${refundProcessed ? ` dan refund Rp${refundAmount} diproses.` : '.'}`,
      booking: {
        id: booking.id,
        previousStatus,
        newStatus: booking.status,
        quantity: booking.quantity,
        cancelledAt: booking.cancelledAt,
        cancellationReason: booking.cancellationReason
      },
      refund: {
        processed: refundProcessed,
        amount: refundAmount
      },
      service: {
        id: service.id,
        currentStock,
        bookedQuantity,
        availableQuantity: service.availableQuantity
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error in booking cancel endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({
    message: 'POST /api/bookings/cancel - Cancel a booking and process refund',
    body: {
      serviceId: 'required - service ID',
      bookingId: 'required - booking ID to cancel',
      reason: 'optional - cancellation reason'
    }
  }, { status: 200 });
}
