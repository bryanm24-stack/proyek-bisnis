import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Helper: Normalize ID for consistent comparison
const normalizeId = (id) => String(id || '').trim();

const findLatestDealByChatId = (deals, chatId) => {
  const normalizedChatId = normalizeId(chatId);
  for (let index = deals.length - 1; index >= 0; index -= 1) {
    if (normalizeId(deals[index]?.chatId) === normalizedChatId) {
      return deals[index];
    }
  }
  return null;
};

const resolveItemPrice = (service, itemId) => {
  if (!service || !itemId || !Array.isArray(service.items)) return null;

  const item = service.items.find((entry) => normalizeId(entry?.id) === normalizeId(itemId));
  if (!item) return null;

  const priceField = service.type === 'barang' ? 'hargaPcs' : 'hargaSesi';
  return Number(item[priceField] ?? item.price ?? null);
};

const resolveDealPrice = (service, itemId) => {
  const itemPrice = resolveItemPrice(service, itemId);
  if (Number.isFinite(itemPrice) && itemPrice > 0) return itemPrice;

  return Number(service?.price ?? service?.harga ?? 0) || 0;
};

const enrichDealWithItemContext = (deal, chatRoom, service) => {
  if (!deal) return null;

  const resolvedItemId = deal.itemId || chatRoom?.itemId || null;
  const resolvedItemName = deal.itemName || chatRoom?.itemName || null;
  const resolvedOriginalPrice = resolveDealPrice(service, resolvedItemId);
  const originalPrice = Number.isFinite(resolvedOriginalPrice) && resolvedOriginalPrice > 0
    ? resolvedOriginalPrice
    : Number(deal.originalPrice || 0);
  const finalPrice = deal.discountGiven
    ? Number(deal.finalPrice ?? Math.max(originalPrice - Number(deal.discount?.amount || 0), 0))
    : Number(deal.finalPrice ?? originalPrice);

  return {
    ...deal,
    itemId: resolvedItemId,
    itemName: resolvedItemName,
    itemPrice: originalPrice,
    originalPrice,
    finalPrice
  };
};

// Helper function to create notification
async function createNotification(userId, type, message, relatedId, relatedData = {}) {
  try {
    const notificationsPath = path.join(process.cwd(), 'notifications.json');
    const data = await fs.readFile(notificationsPath, 'utf-8');
    const notifications = JSON.parse(data);

    const newNotification = {
      id: `notif_${Date.now()}`,
      userId,
      type,
      message,
      relatedId,
      relatedData,
      read: false,
      createdAt: new Date().toISOString()
    };

    notifications.push(newNotification);
    await fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2));

    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// POST - Accept, cancel, or apply-discount for a deal
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: 'Action diperlukan' }, { status: 400 });
    }

    const chatsPath = path.join(process.cwd(), 'chats.json');
    const dealsPath = path.join(process.cwd(), 'deals.json');
    const servicesPath = path.join(process.cwd(), 'services.json');
    const invoicesPath = path.join(process.cwd(), 'invoices.json');

    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    const deals = JSON.parse(dealsData);

    // Handle vendor discount after deal is agreed
    if (action === 'apply-discount') {
      const { chatId, vendorId, discountType, discountValue } = body;
      if (!chatId || !vendorId || !discountType || typeof discountValue !== 'number') {
        return NextResponse.json({ success: false, message: 'Data diskon tidak lengkap' }, { status: 400 });
      }

      const chatRoom = chats.find(c => c.id === chatId);
      if (!chatRoom) {
        return NextResponse.json({ success: false, message: 'Chat room tidak ditemukan' }, { status: 404 });
      }

      if (normalizeId(chatRoom.vendorId) !== normalizeId(vendorId)) {
        return NextResponse.json({ success: false, message: 'Vendor tidak sesuai dengan chat ini' }, { status: 403 });
      }

      const deal = findLatestDealByChatId(deals, chatId);
      if (!deal) {
        return NextResponse.json({ success: false, message: 'Deal belum dibuat' }, { status: 404 });
      }

      if (normalizeId(deal.vendorId) !== normalizeId(vendorId)) {
        return NextResponse.json({ success: false, message: 'Hanya vendor pemilik deal yang bisa memberi diskon' }, { status: 403 });
      }

      if (deal.status !== 'agreed') {
        return NextResponse.json({ success: false, message: 'Diskon hanya bisa diterapkan setelah deal disetujui' }, { status: 400 });
      }

      if (typeof deal.originalPrice === 'undefined' || deal.originalPrice === null) {
        const servicesData = await fs.readFile(servicesPath, 'utf-8');
        const services = JSON.parse(servicesData);
        const svc = services.find(s => normalizeId(s.id) === normalizeId(deal.serviceId));
        const chatRoom = chats.find(c => normalizeId(c.id) === normalizeId(chatId));
        deal.originalPrice = resolveDealPrice(svc, deal.itemId || chatRoom?.itemId || null);
      }

      const originalPrice = Number(deal.originalPrice || 0);
      if (originalPrice < 0) {
        return NextResponse.json({ success: false, message: 'Harga asli tidak valid' }, { status: 400 });
      }

      let normalizedValue = Number(discountValue);
      if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
        return NextResponse.json({ success: false, message: 'Nilai diskon tidak valid' }, { status: 400 });
      }

      let amount = 0;
      if (discountType === 'percent') {
        if (normalizedValue > 100) normalizedValue = 100;
        amount = Math.round((normalizedValue / 100) * originalPrice);
      } else if (discountType === 'amount') {
        amount = Math.round(normalizedValue);
      } else {
        return NextResponse.json({ success: false, message: 'Tipe diskon tidak valid' }, { status: 400 });
      }

      if (amount > originalPrice) amount = originalPrice;
      const finalPrice = Math.max(originalPrice - amount, 0);

      deal.discountGiven = amount > 0;
      deal.discount = {
        type: discountType,
        value: normalizedValue,
        amount
      };
      deal.finalPrice = finalPrice;
      deal.discountUpdatedAt = new Date().toISOString();

      await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

      // Ensure invoice pending exists right after deal + discount so vendor can track waiting payment.
      try {
        let invoices = [];
        try {
          const invoicesData = await fs.readFile(invoicesPath, 'utf-8');
          invoices = JSON.parse(invoicesData);
        } catch {
          invoices = [];
        }

        const now = new Date();
        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + 2);

        const existingPendingInvoice = invoices.find(
          (item) => normalizeId(item.dealId) === normalizeId(deal.id) && item.status !== 'paid'
        );

        if (existingPendingInvoice) {
          existingPendingInvoice.customerId = existingPendingInvoice.customerId || deal.customerId;
          existingPendingInvoice.vendorId = existingPendingInvoice.vendorId || deal.vendorId;
          existingPendingInvoice.serviceId = existingPendingInvoice.serviceId || deal.serviceId;
          existingPendingInvoice.remainingPayment = Number(finalPrice || 0);
          existingPendingInvoice.paymentDeadline = existingPendingInvoice.paymentDeadline || deadline.toISOString();
          existingPendingInvoice.paymentType = existingPendingInvoice.paymentType || 'deal_pending';
          existingPendingInvoice.status = 'pending';
          existingPendingInvoice.notes = existingPendingInvoice.notes || 'Menunggu pembayaran setelah deal disepakati dan diskon diterapkan.';
        } else {
          invoices.push({
            id: `INV-${Date.now()}`,
            dealId: deal.id,
            customerId: deal.customerId,
            vendorId: deal.vendorId,
            serviceId: deal.serviceId,
            transactionId: null,
            remainingPayment: Number(finalPrice || 0),
            paymentDeadline: deadline.toISOString(),
            paymentMethod: null,
            paymentType: 'deal_pending',
            status: 'pending',
            createdAt: now.toISOString(),
            paidAt: null,
            paymentTransactionId: null,
            notes: 'Menunggu pembayaran setelah deal disepakati dan diskon diterapkan.'
          });
        }

        await fs.writeFile(invoicesPath, JSON.stringify(invoices, null, 2));
      } catch (invoiceError) {
        console.warn('Could not create pending invoice after discount:', invoiceError);
      }

      await createNotification(
        deal.customerId,
        'deal_discount_applied',
        `Vendor memberikan diskon. Harga akhir: Rp ${finalPrice.toLocaleString('id-ID')}`,
        chatId,
        { vendorId: deal.vendorId, serviceId: deal.serviceId, finalPrice, amount }
      );

      return NextResponse.json({
        success: true,
        message: 'Diskon berhasil diterapkan',
        data: { deal, chat: chatRoom }
      }, { status: 200 });
    }

    // Handle cancel/reset
    if (action === 'cancel') {
      const { chatId, customerId, vendorId, serviceId, resetDeadline } = body;
      if (!chatId || !customerId || !vendorId || !serviceId) {
        return NextResponse.json({ success: false, message: 'Semua field wajib diisi!' }, { status: 400 });
      }

      const chatRoom = chats.find(c => c.id === chatId);
      if (!chatRoom) {
        return NextResponse.json({ success: false, message: 'Chat room tidak ditemukan' }, { status: 404 });
      }

      if (normalizeId(chatRoom.vendorId) !== normalizeId(vendorId) || normalizeId(chatRoom.customerId) !== normalizeId(customerId)) {
        return NextResponse.json({ success: false, message: 'Data pihak chat tidak valid' }, { status: 403 });
      }

      // Find existing deal
      const existingDeal = findLatestDealByChatId(deals, chatId);
      
      // If resetDeadline is true and deal is completed, reset it to pending for new cycle
      if (resetDeadline && existingDeal && (existingDeal.status === 'completed' || existingDeal.status === 'cancelled')) {
        // Reset deal to pending for new cycle
        existingDeal.status = 'pending';
        existingDeal.customerAccepted = true;
        existingDeal.vendorAccepted = false;
        existingDeal.ratingCompleted = false;
        chatRoom.dealStatus = 'pending';
        await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
        await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

        await createNotification(vendorId, 'deal_pending', 'Ada penawaran baru dari customer', chatId, { customerId, serviceId });

        return NextResponse.json({ success: true, message: 'Deal direset untuk siklus baru', data: { deal: existingDeal, chat: chatRoom } }, { status: 200 });
      }

      // Otherwise, cancel the deal normally
      chatRoom.dealStatus = 'cancelled';
      await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

      // Find and update deal status if exists
      if (existingDeal) {
        existingDeal.status = 'cancelled';
      }
      await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

      await createNotification(vendorId, 'deal_cancelled', 'Deal dibatalkan oleh customer', chatId, { customerId, serviceId });

      return NextResponse.json({ success: true, message: 'Deal dibatalkan', data: { deal: existingDeal || null, chat: chatRoom } }, { status: 200 });
    }

    // Handle accept
    if (action === 'accept') {
      const { chatId, customerId, vendorId, serviceId } = body;
      if (!chatId || !customerId || !vendorId || !serviceId) {
        return NextResponse.json({ success: false, message: 'Semua field wajib diisi!' }, { status: 400 });
      }

      const chatRoom = chats.find(c => c.id === chatId);
      if (!chatRoom) {
        return NextResponse.json({ success: false, message: 'Chat room tidak ditemukan' }, { status: 404 });
      }

      if (normalizeId(chatRoom.vendorId) !== normalizeId(vendorId) || normalizeId(chatRoom.customerId) !== normalizeId(customerId)) {
        return NextResponse.json({ success: false, message: 'Data pihak chat tidak valid' }, { status: 403 });
      }

      // Check if deal sudah ada dari pihak lain
      const existingDeal = findLatestDealByChatId(deals, chatId);

      if (!existingDeal) {
        // Buat deal baru (dari pihak customer)
        // load service price if available
        let originalPrice = null;
        try {
          const servicesData = await fs.readFile(servicesPath, 'utf-8');
          const services = JSON.parse(servicesData);
          const svc = services.find(s => s.id === serviceId);
          originalPrice = resolveDealPrice(svc, chatRoom.itemId || null) || null;
        } catch (e) {
          originalPrice = null;
        }

        const initialItemId = chatRoom.itemId || null;
        const initialItemName = chatRoom.itemName || null;
        const initialItemPrice = originalPrice;

        const newDeal = {
          id: Date.now().toString(),
          chatId,
          customerId,
          vendorId,
          serviceId,
          itemId: initialItemId,
          itemName: initialItemName,
          itemPrice: initialItemPrice,
          customerAccepted: true,
          vendorAccepted: false,
          status: 'pending',
          createdAt: new Date().toISOString(),
          agreedAt: null,
          discountGiven: false,
          discount: { type: null, value: 0, amount: 0 },
          originalPrice: originalPrice,
          finalPrice: originalPrice,
          borrowDate: null,
          expectedReturnDate: null,
          actualReturnDate: null,
          returnDeadline: null,
          returnStatus: 'pending',
          daysLate: 0,
          lateCharge: 0,
          returnCondition: null,
          returnNotes: '',
          lastReminderSent: null,
          ratingCompleted: false
        };

        deals.push(newDeal);
        chatRoom.dealStatus = 'pending';
        chatRoom.closedAt = null;
        chatRoom.closedReason = null;
        await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
        await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

        // Create notification untuk vendor
        await createNotification(vendorId, 'deal_pending', 'Ada penawaran baru dari customer', chatId, { customerId, serviceId });

        return NextResponse.json({ success: true, message: 'Penawaran dikirim, menunggu vendor menerima', data: { deal: newDeal, chat: chatRoom } }, { status: 201 });
      } else {
        // Vendor menerima deal dari customer
        // If deal is completed/cancelled, create a fresh pending cycle first.
        if (existingDeal.status === 'completed' || existingDeal.status === 'cancelled') {
          console.log(`Deal ${existingDeal.id} is ${existingDeal.status}. Creating fresh pending deal for new rental cycle.`);
          
          // Create FRESH deal with reset dates
          let originalPrice = null;
          try {
            const servicesData = await fs.readFile(servicesPath, 'utf-8');
            const services = JSON.parse(servicesData);
            const svc = services.find(s => s.id === existingDeal.serviceId);
            originalPrice = resolveDealPrice(svc, existingDeal.itemId || chatRoom.itemId || null) || null;
          } catch (e) {
            originalPrice = null;
          }

          const freshItemId = existingDeal.itemId || chatRoom.itemId || null;
          const freshItemName = existingDeal.itemName || chatRoom.itemName || null;

          const freshDeal = {
            id: Date.now().toString(),
            chatId: chatId,
            customerId: customerId,
            vendorId: vendorId,
            serviceId: existingDeal.serviceId,
            itemId: freshItemId,
            itemName: freshItemName,
            itemPrice: originalPrice,
            customerAccepted: true,
            vendorAccepted: false,
            status: 'pending',
            createdAt: new Date().toISOString(),
            agreedAt: null,
            discountGiven: false,
            discount: { type: null, value: 0, amount: 0 },
            originalPrice: originalPrice,
            finalPrice: originalPrice,
            
            // ✅ FRESH/RESET: All date fields are null
            borrowDate: null,
            expectedReturnDate: null,
            actualReturnDate: null,
            returnDeadline: null,
            
            // ✅ FRESH/RESET: All return fields are reset
            returnStatus: 'pending',
            returnCondition: null,
            returnNotes: '',
            daysLate: 0,
            lateCharge: 0,
            
            // ✅ FRESH: No old data
            lastReminderSent: null,
            ratingCompleted: false,
            totalPrice: null,
            bookingId: null
          };

          deals.push(freshDeal);
          chatRoom.dealStatus = 'pending';
          chatRoom.closedAt = null;
          chatRoom.closedReason = null;
          await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
          await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

          // Notify vendor to accept this new cycle
          await createNotification(vendorId, 'deal_pending', 'Ada penawaran baru dari customer', chatId, { customerId, serviceId });

          return NextResponse.json({ success: true, message: 'Penawaran baru dikirim. Menunggu vendor menerima.', data: { deal: freshDeal, chat: chatRoom, readyForRating: false } }, { status: 200 });
        }

        // ❌ If deal is in other invalid states, reject
        if (existingDeal.status !== 'pending' && existingDeal.status !== 'agreed' && existingDeal.status !== 'returning' && existingDeal.status !== 'active' && existingDeal.status !== 'completed') {
          return NextResponse.json({ success: false, message: `Deal dengan status ${existingDeal.status} tidak bisa diproses` }, { status: 400 });
        }

        existingDeal.vendorAccepted = true;
        existingDeal.status = 'agreed';
        existingDeal.agreedAt = new Date().toISOString();

        // ensure discount fields exist
        if (typeof existingDeal.discountGiven === 'undefined') existingDeal.discountGiven = false;
        if (!existingDeal.discount) existingDeal.discount = { type: null, value: 0, amount: 0 };
        if (typeof existingDeal.borrowDate === 'undefined') existingDeal.borrowDate = null;
        if (typeof existingDeal.expectedReturnDate === 'undefined') existingDeal.expectedReturnDate = null;
        if (typeof existingDeal.actualReturnDate === 'undefined') existingDeal.actualReturnDate = null;
        if (typeof existingDeal.returnDeadline === 'undefined') existingDeal.returnDeadline = null;
        if (typeof existingDeal.returnStatus === 'undefined') existingDeal.returnStatus = 'pending';
        if (typeof existingDeal.daysLate === 'undefined') existingDeal.daysLate = 0;
        if (typeof existingDeal.lateCharge === 'undefined') existingDeal.lateCharge = 0;
        if (typeof existingDeal.returnCondition === 'undefined') existingDeal.returnCondition = null;
        if (typeof existingDeal.returnNotes === 'undefined') existingDeal.returnNotes = '';
        if (typeof existingDeal.lastReminderSent === 'undefined') existingDeal.lastReminderSent = null;
        // load original price if missing
        if (typeof existingDeal.originalPrice === 'undefined' || existingDeal.originalPrice === null) {
          try {
            const servicesData = await fs.readFile(servicesPath, 'utf-8');
            const services = JSON.parse(servicesData);
            const svc = services.find(s => s.id === existingDeal.serviceId);
            existingDeal.originalPrice = resolveDealPrice(svc, existingDeal.itemId || chatRoom.itemId || null) || null;
            existingDeal.finalPrice = existingDeal.originalPrice;
          } catch (e) {
            // ignore
          }
        }

        // ✅ FIX #2: Create booking record when deal is agreed (BEFORE payment)
        try {
          const servicesData = await fs.readFile(servicesPath, 'utf-8');
          let parsedServices = JSON.parse(servicesData);
          const serviceIndex = parsedServices.findIndex(s => String(s.id) === String(existingDeal.serviceId));
          
          if (serviceIndex !== -1) {
            const service = parsedServices[serviceIndex];
            if (!service.bookings) service.bookings = [];
            
            // Create new booking with status 'confirmed' (after payment)
            const newBooking = {
              id: `booking_${Date.now()}`,
              dealId: existingDeal.id,
              customerId: existingDeal.customerId,
              vendorId: existingDeal.vendorId,
              quantity: 1, // Will be updated during payment
              status: 'confirmed', // Ready for pickup
              createdAt: new Date().toISOString(),
              pickupConfirmedAt: null,
              returnRequestedAt: null,
              returnConfirmedAt: null
            };
            
            service.bookings.push(newBooking);
            await fs.writeFile(servicesPath, JSON.stringify(parsedServices, null, 2));
            
            // Store bookingId in deal for reference
            existingDeal.bookingId = newBooking.id;
          }
        } catch (e) {
          console.warn('Could not create booking record:', e.message);
          // Continue anyway - booking creation is enhancement, not blocking
        }

        chatRoom.dealStatus = 'agreed';
        chatRoom.closedAt = null;
        chatRoom.closedReason = null;
        await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
        await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

        // Create notification untuk customer
        await createNotification(customerId, 'deal_accepted', 'Vendor menerima penawaran Anda!', chatId, { vendorId, serviceId });

        // Note: rating prompt will be handled later in UI; keep message short
        return NextResponse.json({ success: true, message: 'Deal diterima.', data: { deal: existingDeal, chat: chatRoom, readyForRating: true } }, { status: 200 });
      }
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });
  } catch (error) {
    console.error('Error processing deal:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

// GET - Check deal status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({
        success: false,
        message: 'chatId diperlukan'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const chatsPath = path.join(process.cwd(), 'chats.json');
    const servicesPath = path.join(process.cwd(), 'services.json');
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    const deals = JSON.parse(dealsData);
    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    const services = JSON.parse(servicesData);

    const deal = findLatestDealByChatId(deals, chatId);
    const chatRoom = chats.find((chat) => normalizeId(chat.id) === normalizeId(chatId));
    const relatedService = deal
      ? services.find((service) => normalizeId(service.id) === normalizeId(deal.serviceId))
      : null;
    const resolvedDeal = enrichDealWithItemContext(deal, chatRoom, relatedService);

    return NextResponse.json({
      success: true,
      data: resolvedDeal
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting deal:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
