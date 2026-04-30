import fs from 'fs';
import path from 'path';

const transactionsFile = path.join(process.cwd(), 'transactions.json');
const invoicesFile = path.join(process.cwd(), 'invoices.json');
const dealsFile = path.join(process.cwd(), 'deals.json');

// Ensure JSON files exist
const ensureTransactionsFile = () => {
  if (!fs.existsSync(transactionsFile)) {
    fs.writeFileSync(transactionsFile, JSON.stringify([], null, 2));
  }
};

const ensureInvoicesFile = () => {
  if (!fs.existsSync(invoicesFile)) {
    fs.writeFileSync(invoicesFile, JSON.stringify([], null, 2));
  }
};

const ensureDealsFile = () => {
  if (!fs.existsSync(dealsFile)) {
    fs.writeFileSync(dealsFile, JSON.stringify([], null, 2));
  }
};

export async function GET(request) {
  try {
    ensureTransactionsFile();
    const data = fs.readFileSync(transactionsFile, 'utf-8');
    const transactions = JSON.parse(data);
    
    return Response.json(transactions);
  } catch (error) {
    console.error('Error reading transactions:', error);
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    ensureTransactionsFile();
    ensureInvoicesFile();
    ensureDealsFile();
    
    const transactionsData = fs.readFileSync(transactionsFile, 'utf-8');
    let transactions = JSON.parse(transactionsData);
    
    // AVAILABILITY CHECK - Validasi stok sebelum payment diproses
    if (body.serviceId && body.quantity && body.startDate) {
      try {
        const servicesFile = path.join(process.cwd(), 'services.json');
        let servicesData = fs.readFileSync(servicesFile, 'utf-8');
        servicesData = servicesData.replace(/^\uFEFF/, '').trim();
        const services = JSON.parse(servicesData);

        const service = services.find(s => String(s.id) === String(body.serviceId));
        if (service) {
          const totalQuantity = Number(service.quantity) || Number(service.jumlahBarang) || 0;
          
          // Calculate end date if not provided
          let endDate = body.endDate;
          if (!endDate && body.startDate && body.durationDays) {
            const start = new Date(body.startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + (Number(body.durationDays) || 1));
            endDate = end.toISOString().split('T')[0];
          }

          // Check for overlapping bookings
          const startDateTime = new Date(body.startDate);
          const endDateTime = new Date(endDate || body.startDate);
          
          let bookedQuantity = 0;
          const bookings = service.bookings || [];
          
          for (const booking of bookings) {
            if (booking.status === 'cancelled') continue;
            
            const bookingStart = new Date(booking.startDate);
            const bookingEnd = new Date(booking.endDate);
            
            // Check for overlap
            if (bookingStart < endDateTime && bookingEnd > startDateTime) {
              bookedQuantity += booking.quantity || 0;
            }
          }

          const availableQuantity = totalQuantity - bookedQuantity;
          
          if (availableQuantity < body.quantity) {
            console.warn(`AVAILABILITY CHECK FAILED: Service ${body.serviceId} - Available: ${availableQuantity}, Requested: ${body.quantity}`);
            return Response.json({
              success: false,
              error: 'Stok tidak mencukupi',
              message: `Stok barang tidak cukup untuk periode ini. Tersedia: ${availableQuantity} dari ${body.quantity} yang diminta`,
              availableQuantity,
              requestedQuantity: body.quantity,
              status: 'availability_check_failed'
            }, { status: 400 });
          }
        }
      } catch (availabilityError) {
        console.warn('Availability check warning:', availabilityError.message);
        // Don't fail on availability check errors, continue with transaction
      }
    }
    
    // Add new transaction
    const identityVerification = body.identityVerification
      ? {
          ...body.identityVerification,
          status: body.identityVerification.status || 'pending',
          reviewedAt: body.identityVerification.reviewedAt || null,
          reviewedBy: body.identityVerification.reviewedBy || null,
          adminNotes: body.identityVerification.adminNotes || ''
        }
      : null;

    const newTransaction = {
      ...body,
      identityVerification,
      createdAt: new Date().toISOString()
    };
    
    transactions.push(newTransaction);
    
    // Write transaction
    fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2));

    let currentDeal = null;
    try {
      const dealsData = fs.readFileSync(dealsFile, 'utf-8');
      const deals = JSON.parse(dealsData);
      currentDeal = deals.find((item) => item.id === body.dealId) || null;
    } catch (dealReadError) {
      console.warn('Could not read deal for invoice metadata:', dealReadError);
    }

    // Create invoice for deal payments (exclude invoice settlement transactions)
    if (body.dealId && body.paymentType !== 'invoice_payment') {
      const invoicesData = fs.readFileSync(invoicesFile, 'utf-8');
      let invoices = JSON.parse(invoicesData);

      const isPayAfter = body.paymentType === 'pay_after';
      const createdAt = new Date().toISOString();
      const paymentDeadlineDate = new Date();
      paymentDeadlineDate.setDate(paymentDeadlineDate.getDate() + 2);

      const existingInvoice = invoices.find(
        (item) =>
          item.transactionId === body.id ||
          (item.dealId === body.dealId && item.paymentType === body.paymentType) ||
          (item.dealId === body.dealId && item.paymentType === 'deal_pending' && item.status !== 'paid')
      );
      if (existingInvoice) {
        existingInvoice.customerId = existingInvoice.customerId || body.userId || currentDeal?.customerId || null;
        existingInvoice.vendorId = existingInvoice.vendorId || currentDeal?.vendorId || body.vendorId || null;
        existingInvoice.serviceId = existingInvoice.serviceId || currentDeal?.serviceId || null;
        existingInvoice.transactionId = body.id;
        existingInvoice.remainingPayment = isPayAfter
          ? Number(body.remainingPayment ?? 0)
          : Number(body.totalAmount ?? body.amount ?? 0);
        existingInvoice.paymentDeadline = isPayAfter ? paymentDeadlineDate.toISOString() : body.timestamp || createdAt;
        existingInvoice.paymentMethod = body.paymentMethod || existingInvoice.paymentMethod || null;
        existingInvoice.paymentType = body.paymentType || existingInvoice.paymentType || 'full';
        existingInvoice.status = isPayAfter ? 'pending' : 'paid';
        existingInvoice.createdAt = existingInvoice.createdAt || createdAt;
        existingInvoice.paidAt = isPayAfter ? null : (body.timestamp || createdAt);
        existingInvoice.paymentTransactionId = isPayAfter ? null : body.id;
        existingInvoice.notes = body.notes || existingInvoice.notes || '';
        fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2));
      } else {

      const newInvoice = {
        id: `INV-${Date.now()}`,
        dealId: body.dealId,
        customerId: body.userId || currentDeal?.customerId || null,
        vendorId: currentDeal?.vendorId || body.vendorId || null,
        serviceId: currentDeal?.serviceId || null,
        transactionId: body.id,
        remainingPayment: isPayAfter
          ? Number(body.remainingPayment ?? 0)
          : Number(body.totalAmount ?? body.amount ?? 0),
        paymentDeadline: isPayAfter ? paymentDeadlineDate.toISOString() : body.timestamp || createdAt,
        paymentMethod: body.paymentMethod || null,
        paymentType: body.paymentType || 'full',
        status: isPayAfter ? 'pending' : 'paid',
        createdAt,
        paidAt: isPayAfter ? null : (body.timestamp || createdAt),
        paymentTransactionId: isPayAfter ? null : body.id,
        notes: body.notes || ''
      };

      invoices.push(newInvoice);
      fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2));
      }

      // Update deal with payment info
      try {
        const dealsData = fs.readFileSync(dealsFile, 'utf-8');
        let deals = JSON.parse(dealsData);
        
        const dealIndex = deals.findIndex(d => d.id === body.dealId);
        if (dealIndex !== -1) {
          deals[dealIndex] = {
            ...deals[dealIndex],
            paymentType: body.paymentType,
            downPayment: isPayAfter ? body.downPayment : null,
            remainingPayment: isPayAfter ? body.remainingPayment : 0,
            invoiceStatus: isPayAfter ? 'pending' : 'paid',
            paymentDeadline: isPayAfter ? paymentDeadlineDate.toISOString() : null,
            invoiceId: newInvoice.id
          };
          fs.writeFileSync(dealsFile, JSON.stringify(deals, null, 2));
        }
      } catch (dealError) {
        console.warn('Could not update deal:', dealError);
      }
    }

    // RESERVE BOOKING - Buat booking record saat payment sukses (full payment atau down payment)
    if (body.status === 'success' && body.serviceId && body.quantity && body.startDate) {
      try {
        const servicesFile = path.join(process.cwd(), 'services.json');
        let servicesData = fs.readFileSync(servicesFile, 'utf-8');
        servicesData = servicesData.replace(/^\uFEFF/, '').trim();
        const services = JSON.parse(servicesData);

        const serviceIndex = services.findIndex(s => String(s.id) === String(body.serviceId));
        if (serviceIndex !== -1) {
          const service = services[serviceIndex];

          // Initialize bookings array if not exists
          if (!service.bookings) {
            service.bookings = [];
          }

          // Calculate end date
          let endDate = body.endDate;
          if (!endDate && body.durationDays) {
            const start = new Date(body.startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + Number(body.durationDays));
            endDate = end.toISOString().split('T')[0];
          }

          // Create booking record
          const newBooking = {
            id: `BOOKING-${Date.now()}`,
            transactionId: body.id,
            dealId: body.dealId,
            quantity: Number(body.quantity),
            startDate: body.startDate,
            endDate: endDate || body.startDate,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          service.bookings.push(newBooking);

          // Recalculate availableQuantity
          const totalQuantity = Number(service.quantity) || Number(service.jumlahBarang) || 0;
          let bookedQuantity = 0;
          for (const booking of service.bookings) {
            if (booking.status !== 'cancelled' && booking.status !== 'completed') {
              bookedQuantity += booking.quantity || 0;
            }
          }
          service.availableQuantity = Math.max(0, totalQuantity - bookedQuantity);

          fs.writeFileSync(servicesFile, JSON.stringify(services, null, 2));
          console.log(`Booking reserved: Transaction ${body.id}, Service ${body.serviceId}, Qty: ${body.quantity}`);
        }
      } catch (reservationError) {
        console.warn('Reservation creation warning:', reservationError.message);
        // Don't fail transaction if reservation fails
      }
    }
    
    return Response.json({ success: true, transaction: newTransaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
