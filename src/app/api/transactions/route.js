import { readData, writeData } from '@/lib/storage';

const buildRentalTimeline = (startDate, durationDays) => {
  const parsedStartDate = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
  const parsedDurationDays = Number(durationDays || 0);

  if (!parsedStartDate || Number.isNaN(parsedStartDate.getTime()) || parsedDurationDays <= 0) {
    return {
      borrowDate: startDate || null,
      expectedReturnDate: null,
      returnDeadline: null
    };
  }

  const expectedReturnDate = new Date(parsedStartDate);
  expectedReturnDate.setUTCDate(expectedReturnDate.getUTCDate() + parsedDurationDays);

  const returnDeadline = new Date(expectedReturnDate);
  returnDeadline.setUTCDate(returnDeadline.getUTCDate() - 1);

  return {
    borrowDate: parsedStartDate.toISOString(),
    expectedReturnDate: expectedReturnDate.toISOString(),
    returnDeadline: returnDeadline.toISOString()
  };
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizePromo = (promo) => {
  const startAt = parseDateOrNull(promo.startAt);
  const endAt = parseDateOrNull(promo.endAt);
  const claimedUserIds = Array.isArray(promo.claimedUserIds)
    ? promo.claimedUserIds.map((userId) => String(userId))
    : [];
  const maxApplicants = promo.maxApplicants === undefined || promo.maxApplicants === null || promo.maxApplicants === ''
    ? null
    : Number(promo.maxApplicants);
  const claimedCount = Number.isFinite(Number(promo.claimedCount))
    ? Number(promo.claimedCount)
    : claimedUserIds.length;

  return {
    ...promo,
    startAt: startAt ? startAt.toISOString() : (promo.startAt || null),
    endAt: endAt ? endAt.toISOString() : (promo.endAt || null),
    maxApplicants: Number.isFinite(maxApplicants) ? maxApplicants : null,
    claimedCount,
    claimedUserIds
  };
};

const validatePromoAvailability = (promo, userId, transactions) => {
  const now = Date.now();
  const normalizedPromo = normalizePromo(promo);

  if (normalizedPromo.active === false) {
    return 'Promo sedang tidak aktif.';
  }

  if (normalizedPromo.startAt && new Date(normalizedPromo.startAt).getTime() > now) {
    return 'Promo belum dimulai.';
  }

  if (normalizedPromo.endAt && new Date(normalizedPromo.endAt).getTime() <= now) {
    return 'Promo sudah berakhir.';
  }

  if (Number.isFinite(normalizedPromo.maxApplicants) && normalizedPromo.claimedCount >= normalizedPromo.maxApplicants) {
    return 'Kuota promo sudah habis.';
  }

  if (userId) {
    const userKey = String(userId);
    const hasClaimedBefore = normalizedPromo.claimedUserIds.includes(userKey) || transactions.some((transaction) =>
      String(transaction.promoId) === String(normalizedPromo.id) &&
      String(transaction.userId) === userKey &&
      transaction.status === 'success'
    );

    if (hasClaimedBefore) {
      return 'User hanya dapat menggunakan promo ini 1 kali.';
    }
  }

  return null;
};

async function markPromoClaimed(promoId, userId) {
  if (!promoId || !userId) return;

  const promos = await readData('promos');
  const promoIndex = promos.findIndex((item) => String(item.id) === String(promoId));

  if (promoIndex === -1) return;

  const promo = normalizePromo(promos[promoIndex]);
  const userKey = String(userId);
  const claimedUserIds = Array.from(new Set([...(promo.claimedUserIds || []), userKey]));

  promos[promoIndex] = {
    ...promos[promoIndex],
    claimedUserIds,
    claimedCount: claimedUserIds.length,
    updatedAt: new Date().toISOString()
  };

  await writeData('promos', promos);
}

// Storage setup helpers are no-ops when using database or storage abstraction.
const ensureTransactionsFile = async () => {};
const ensureInvoicesFile = async () => {};
const ensureDealsFile = async () => {};
const ensurePromosFile = async () => {};

export async function GET(request) {
  try {
    ensureTransactionsFile();
    const data = await readData('transactions');
    const transactions = data;
    
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
    ensurePromosFile();
    
    let transactions = await readData('transactions');

    // PROMO CHECK - Validate promo rules before writing the transaction
    if (body.promoId) {
      try {
        const promosData = await readData('promos');
        const promos = promosData;
        const promo = promos.find((item) => String(item.id) === String(body.promoId));

        if (!promo) {
          return Response.json({
            success: false,
            error: 'Promo tidak ditemukan',
            message: 'Promo tidak ditemukan atau sudah dihapus.'
          }, { status: 404 });
        }

        const promoError = validatePromoAvailability(promo, body.userId, transactions);
        if (promoError) {
          return Response.json({
            success: false,
            error: 'Promo tidak tersedia',
            message: promoError,
            status: 'promo_unavailable'
          }, { status: 400 });
        }
      } catch (promoError) {
        console.warn('Promo check warning:', promoError.message);
        return Response.json({
          success: false,
          error: 'Promo tidak tersedia',
          message: 'Gagal memvalidasi promo.',
          status: 'promo_validation_failed'
        }, { status: 400 });
      }
    }
    
    // AVAILABILITY CHECK - Validasi stok sebelum payment diproses
    if (body.serviceId && body.quantity && body.startDate) {
      try {
        const services = await readData('services');

        const service = services.find(s => String(s.id) === String(body.serviceId));
        if (service) {
          // Determine total quantity based on service type
          let totalQuantity = 0;
          const serviceType = service.type || 'barang'; // default to barang
          
          if (serviceType === 'jasa') {
            // JASA: prefer availability, fallback to quantity for backward compatibility
            totalQuantity = Number(service.availability ?? service.quantity) || 0;
          } else {
            // BARANG: Sum of all items stok (total inventory)
            totalQuantity = (service.items || []).reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
          }
          
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
              error: serviceType === 'jasa' ? 'Availability tidak mencukupi' : 'Stok tidak mencukupi',
              message: `${serviceType === 'jasa' ? 'Availability provider/tim' : 'Stok barang'} tidak cukup untuk periode ini. Tersedia: ${availableQuantity} dari ${body.quantity} yang diminta`,
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

    // ✅ NEW: ITEM PRICE VERIFICATION - Validate item price matches service data
    let verifiedItemPrice = body.basePrice || 0;
    let verifiedItemId = body.itemId || null;
    
    if (body.serviceId && body.itemId) {
      try {
        const services = await readData('services');
        
        const service = services.find(s => String(s.id) === String(body.serviceId));
        if (service && service.items && Array.isArray(service.items)) {
          const item = service.items.find(i => String(i.id) === String(body.itemId));
          
          if (item) {
            // Get price based on service type
            const priceField = service.type === 'barang' ? 'hargaPcs' : 'hargaSesi';
            const itemPrice = item[priceField] || item.price || body.basePrice;
            
            verifiedItemPrice = itemPrice;
            verifiedItemId = item.id;
            
            // Log price mismatch if significant difference (> 1000)
            if (Math.abs(body.basePrice - itemPrice) > 1000) {
              console.warn(`Price mismatch for item ${body.itemId}: payment sent ${body.basePrice}, but actual is ${itemPrice}`);
              // Don't fail, just log - customer might have applied discount
            }
          } else {
            console.warn(`Item ${body.itemId} not found in service ${body.serviceId}`);
          }
        }
      } catch (priceVerifyError) {
        console.warn('Item price verification warning:', priceVerifyError.message);
        // Continue with transaction using provided price
      }
    }
    
    // Add new transaction
    // ✅ NEW: If transaction is tied to a deal, verify the deal exists and is in correct state
    if (body.dealId) {
      try {
        const deals = await readData('deals');
        const deal = deals.find(d => String(d.id) === String(body.dealId));
        if (!deal) {
          return Response.json({ success: false, error: 'Deal tidak ditemukan', message: 'Deal tidak ditemukan untuk pembayaran ini' }, { status: 404 });
        }

        // Only allow payment when deal is in 'agreed' state (both sides accepted) or explicit vendor payment flow
        if (!['agreed', 'active', 'pending'].includes(deal.status)) {
          return Response.json({ success: false, error: 'Deal tidak siap untuk pembayaran', message: `Deal status '${deal.status}' tidak memperbolehkan pembayaran` }, { status: 400 });
        }

        // If UI removed pay_after option, enforce full payment server-side when configured
        if (body.paymentType === 'pay_after') {
          // reject pay_after by default to avoid unexpected credit flows
          return Response.json({ success: false, error: 'Pay after tidak diizinkan', message: 'Metode pembayaran "pay_after" tidak diizinkan. Gunakan pembayaran penuh.' }, { status: 400 });
        }
      } catch (dealVerifyError) {
        console.warn('Deal verification warning:', dealVerifyError.message);
        return Response.json({ success: false, error: 'Gagal memverifikasi deal', message: 'Gagal memverifikasi deal sebelum pembayaran' }, { status: 500 });
      }
    }

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
      createdAt: new Date().toISOString(),
      // ✅ ADD: Verified item price for audit trail
      verifiedItemPrice: verifiedItemPrice,
      verifiedItemId: verifiedItemId
    };

    const rentalTimeline = buildRentalTimeline(body.startDate, body.durationDays);
    newTransaction.borrowDate = rentalTimeline.borrowDate;
    newTransaction.expectedReturnDate = rentalTimeline.expectedReturnDate;
    newTransaction.returnDeadline = rentalTimeline.returnDeadline;
    newTransaction.returnStatus = 'pending';
    newTransaction.actualReturnDate = null;
    newTransaction.daysLate = 0;
    newTransaction.lateCharge = 0;
    newTransaction.returnCondition = null;
    newTransaction.returnNotes = '';
    newTransaction.lastReminderSent = null;
    
    transactions.push(newTransaction);
    
    // Write transaction
    await writeData('transactions', transactions);

    if (body.promoId && body.status === 'success') {
      try {
        markPromoClaimed(body.promoId, body.userId);
      } catch (promoWriteError) {
        console.warn('Could not update promo claim state:', promoWriteError);
      }
    }

    let currentDeal = null;
    try {
      const dealsData = await readData('deals');
      const deals = dealsData;
      currentDeal = deals.find((item) => item.id === body.dealId) || null;
    } catch (dealReadError) {
      console.warn('Could not read deal for invoice metadata:', dealReadError);
    }

    let currentPromo = null;
    if (body.promoId) {
      try {
        const promosData = await readData('promos');
        const promos = promosData;
        currentPromo = promos.find((item) => String(item.id) === String(body.promoId)) || null;
      } catch (promoReadError) {
        console.warn('Could not read promo for invoice metadata:', promoReadError);
      }
    }

    // Create invoice for deal/promo payments (exclude invoice settlement transactions)
    if ((body.dealId || body.promoId) && body.paymentType !== 'invoice_payment') {
      let invoices = await readData('invoices');

      const isPayAfter = body.paymentType === 'pay_after';
      const createdAt = new Date().toISOString();
      const paymentCompletedAt = body.timestamp || createdAt;
      const paymentDeadlineDate = new Date();
      paymentDeadlineDate.setDate(paymentDeadlineDate.getDate() + 2);
      let upsertedInvoiceId = null;

      const existingInvoice = invoices.find(
        (item) =>
          item.transactionId === body.id ||
          (body.dealId && item.dealId === body.dealId && item.paymentType === body.paymentType) ||
          (body.promoId && String(item.promoId) === String(body.promoId) && String(item.customerId) === String(body.userId) && item.status !== 'paid') ||
          (item.dealId === body.dealId && item.paymentType === 'deal_pending' && item.status !== 'paid')
      );
      if (existingInvoice) {
        existingInvoice.customerId = existingInvoice.customerId || body.userId || currentDeal?.customerId || null;
        existingInvoice.vendorId = existingInvoice.vendorId || currentDeal?.vendorId || currentPromo?.vendorId || body.vendorId || null;
        existingInvoice.serviceId = existingInvoice.serviceId || currentDeal?.serviceId || null;
        existingInvoice.promoId = existingInvoice.promoId || body.promoId || null;
        existingInvoice.transactionId = body.id;
        existingInvoice.remainingPayment = isPayAfter
          ? Number(body.remainingPayment ?? 0)
          : Number(body.totalAmount ?? body.amount ?? 0);
        existingInvoice.paymentDeadline = isPayAfter ? paymentDeadlineDate.toISOString() : body.timestamp || createdAt;
        existingInvoice.paymentMethod = body.paymentMethod || existingInvoice.paymentMethod || null;
        existingInvoice.paymentType = body.paymentType || existingInvoice.paymentType || 'full';
        existingInvoice.status = isPayAfter ? 'pending' : 'paid';
        existingInvoice.createdAt = existingInvoice.createdAt || createdAt;
        existingInvoice.paidAt = isPayAfter ? null : paymentCompletedAt;
        existingInvoice.paymentTransactionId = isPayAfter ? null : body.id;
        existingInvoice.notes = body.notes || existingInvoice.notes || '';
        existingInvoice.serviceTitle = existingInvoice.serviceTitle || currentPromo?.title || body.promo?.title || null;
        existingInvoice.promo = existingInvoice.promo || body.promo || (currentPromo ? {
          id: currentPromo.id,
          title: currentPromo.title,
          promoPrice: currentPromo.promoPrice,
          image: currentPromo.image,
          description: currentPromo.description
        } : null);
        upsertedInvoiceId = existingInvoice.id;
        await writeData('invoices', invoices);
      } else {

      const newInvoice = {
        id: `INV-${Date.now()}`,
        dealId: body.dealId || null,
        customerId: body.userId || currentDeal?.customerId || null,
        vendorId: currentDeal?.vendorId || currentPromo?.vendorId || body.vendorId || null,
        serviceId: currentDeal?.serviceId || null,
        promoId: body.promoId || null,
        transactionId: body.id,
        remainingPayment: isPayAfter
          ? Number(body.remainingPayment ?? 0)
          : Number(body.totalAmount ?? body.amount ?? 0),
        paymentDeadline: isPayAfter ? paymentDeadlineDate.toISOString() : body.timestamp || createdAt,
        paymentMethod: body.paymentMethod || null,
        paymentType: body.paymentType || 'full',
        status: isPayAfter ? 'pending' : 'paid',
        createdAt,
        paidAt: isPayAfter ? null : paymentCompletedAt,
        paymentTransactionId: isPayAfter ? null : body.id,
        notes: body.notes || '',
        serviceTitle: currentPromo?.title || body.promo?.title || null,
        promo: body.promo || (currentPromo ? {
          id: currentPromo.id,
          title: currentPromo.title,
          promoPrice: currentPromo.promoPrice,
          image: currentPromo.image,
          description: currentPromo.description
        } : null)
      };

      invoices.push(newInvoice);
      upsertedInvoiceId = newInvoice.id;
      await writeData('invoices', invoices);
      }

      // Update deal with payment info
      try {
        const deals = await readData('deals');

        const dealIndex = deals.findIndex(d => d.id === body.dealId);
        if (dealIndex !== -1) {
          deals[dealIndex] = {
            ...deals[dealIndex],
            paymentType: body.paymentType,
            downPayment: isPayAfter ? body.downPayment : null,
            remainingPayment: isPayAfter ? body.remainingPayment : 0,
            invoiceStatus: isPayAfter ? 'pending' : 'paid',
            status: isPayAfter ? (deals[dealIndex].status || 'agreed') : 'active',
            completedAt: isPayAfter ? (deals[dealIndex].completedAt || null) : paymentCompletedAt,
            paymentDeadline: isPayAfter ? paymentDeadlineDate.toISOString() : null,
            invoiceId: upsertedInvoiceId || deals[dealIndex].invoiceId || null,
            borrowDate: rentalTimeline.borrowDate || deals[dealIndex].borrowDate || null,
            expectedReturnDate: rentalTimeline.expectedReturnDate || deals[dealIndex].expectedReturnDate || null,
            returnDeadline: rentalTimeline.returnDeadline || deals[dealIndex].returnDeadline || null,
            returnStatus: deals[dealIndex].returnStatus || 'pending',
            actualReturnDate: deals[dealIndex].actualReturnDate || null,
            daysLate: deals[dealIndex].daysLate || 0,
            lateCharge: deals[dealIndex].lateCharge || 0,
            returnCondition: deals[dealIndex].returnCondition || null,
            returnNotes: deals[dealIndex].returnNotes || '',
            lastReminderSent: deals[dealIndex].lastReminderSent || null,
            durationDays: body.durationDays,
            startDate: body.startDate
          };
          await writeData('deals', deals);
        }
      } catch (dealError) {
        console.warn('Could not update deal:', dealError);
      }

        // Keep chat open after payment; only progress status so the flow can continue to rating/new cycle.
        try {
          if (body.dealId) {
            const chats = await readData('chats');
            const deals = await readData('deals');
            const relatedDeal = deals.find((item) => item.id === body.dealId);
            const chatIndex = chats.findIndex((item) => item.id === relatedDeal?.chatId);

            if (chatIndex !== -1) {
              chats[chatIndex] = {
                ...chats[chatIndex],
                dealStatus: isPayAfter ? 'agreed' : 'active',
                closedAt: null,
                closedReason: null
              };
              await writeData('chats', chats);
            }
          }
        } catch (chatError) {
          console.warn('Could not update chat status after payment:', chatError);
        }
    }

    // RESERVE BOOKING - Buat booking record saat payment sukses (full payment atau down payment)
    if (body.status === 'success' && body.serviceId && body.quantity && body.startDate) {
      try {
        const services = await readData('services');

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

          // Reserve/decrement actual stock immediately on successful payment
          // and mark booking.stockReserved to avoid double-decrement at pickup.
          // For goods (barang), decrement item.stok greedily by quantity.
          if (service.type !== 'jasa') {
            let remaining = Number(body.quantity);
            for (const item of service.items || []) {
              if (remaining <= 0) break;
              const dec = Math.min(Number(item.stok) || 0, remaining);
              item.stok = (Number(item.stok) || 0) - dec;
              remaining -= dec;
            }
          } else {
            // For jasa, decrement service.quantity
            service.quantity = Math.max(0, (service.quantity || 0) - Number(body.quantity));
          }

          // mark booking as having reserved stock
          newBooking.stockReserved = true;

          service.bookings.push(newBooking);

          // Recalculate availableQuantity based on service type
          let totalQuantity = 0;
          const serviceType = service.type || 'barang';
          
          if (serviceType === 'jasa') {
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

          await writeData('services', services);
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
