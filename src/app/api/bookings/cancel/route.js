import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

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

    const servicesPath = path.join(process.cwd(), 'services.json');
    const transactionsPath = path.join(process.cwd(), 'transactions.json');
    
    let servicesData = await fs.readFile(servicesPath, 'utf-8');
    servicesData = servicesData.replace(/^\uFEFF/, '').trim();
    const services = JSON.parse(servicesData);

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

    // Cannot cancel completed or already cancelled bookings
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

    // ✅ CRITICAL: If booking is 'active' or 'pending_return', we need to return stock!
    const previousStatus = booking.status;
    
    if (previousStatus === 'active' || previousStatus === 'pending_return') {
      console.log(`⚠️ Cancelling active/pending_return booking ${bookingId}. Stock will be returned.`);
      
      // Return stock to inventory
      const serviceType = service.type || 'barang';
      
      if (serviceType === 'jasa') {
        service.quantity = (service.quantity || 0) + booking.quantity;
      } else {
        let toAdd = booking.quantity;
        for (const item of service.items || []) {
          if (toAdd <= 0) break;
          const add = Math.min(toAdd, booking.quantity);
          item.stok = (item.stok || 0) + add;
          toAdd -= add;
        }
      }
    }

    // Update booking status to 'cancelled'
    booking.status = 'cancelled';
    booking.cancelledAt = new Date().toISOString();
    booking.cancellationReason = reason || '';

    // ✅ Recalculate availableQuantity
    const serviceType = service.type || 'barang';
    let currentStock = 0;
    
    if (serviceType === 'jasa') {
      currentStock = service.quantity;
    } else {
      currentStock = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    }
    
    let bookedQuantity = 0;
    for (const b of service.bookings) {
      // Count: confirmed, active, pending_return (items still not returned)
      // DO NOT count cancelled or completed
      if (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending_return') {
        bookedQuantity += b.quantity || 0;
      }
    }
    
    service.availableQuantity = Math.max(0, currentStock - bookedQuantity);

    // ✅ Process refund if transaction exists
    let refundProcessed = false;
    let refundAmount = 0;
    
    if (booking.transactionId) {
      try {
        let transactionsData = await fs.readFile(transactionsPath, 'utf-8');
        transactionsData = transactionsData.replace(/^\uFEFF/, '').trim();
        const transactions = JSON.parse(transactionsData);

        // Find transaction
        const transactionIndex = transactions.findIndex(t => String(t.id) === String(booking.transactionId));
        if (transactionIndex !== -1) {
          const transaction = transactions[transactionIndex];
          
          // Mark transaction as refunded (if not already)
          if (transaction.status !== 'refunded' && transaction.status !== 'cancelled') {
            transaction.status = 'refunded';
            transaction.refundedAt = new Date().toISOString();
            transaction.refundReason = reason || 'Booking dibatalkan customer';
            refundAmount = transaction.totalPrice || 0;
            refundProcessed = true;

            // Save transactions
            await fs.writeFile(transactionsPath, JSON.stringify(transactions, null, 2));
            console.log(`✅ Refund processed for transaction ${booking.transactionId}: Rp${refundAmount}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error processing refund: ${error.message}. Booking still cancelled.`);
      }
    }

    // Save updated services
    await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));

    console.log(`✅ Booking ${bookingId} cancelled. Stock recalculated. Refund: ${refundProcessed ? 'Yes' : 'No'}`);

    return NextResponse.json({
      success: true,
      message: 'Booking berhasil dibatalkan' + (refundProcessed ? ` dan refund Rp${refundAmount} diproses.` : '.'),
      booking: {
        id: booking.id,
        previousStatus: previousStatus,
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
        currentStock: currentStock,
        bookedQuantity: bookedQuantity,
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

// GET - untuk testing/info
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
