import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Helper: Normalize ID for consistent comparison
const normalizeId = (id) => String(id || '').trim();

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

      const deal = deals.find(d => d.chatId === chatId);
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
        deal.originalPrice = Number(svc?.price ?? svc?.harga ?? 0);
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

    // Handle cancel
    if (action === 'cancel') {
      const { chatId, customerId, vendorId, serviceId } = body;
      if (!chatId || !customerId || !vendorId || !serviceId) {
        return NextResponse.json({ success: false, message: 'Semua field wajib diisi!' }, { status: 400 });
      }

      const chatRoom = chats.find(c => c.id === chatId);
      if (!chatRoom) {
        return NextResponse.json({ success: false, message: 'Chat room tidak ditemukan' }, { status: 404 });
      }

      chatRoom.dealStatus = 'cancelled';
      await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

      // Find and update deal status if exists
      const existingDeal = deals.find(d => d.chatId === chatId);
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

      // Check if deal sudah ada dari pihak lain
      const existingDeal = deals.find(d => d.chatId === chatId);

      if (!existingDeal) {
        // Buat deal baru (dari pihak customer)
        // load service price if available
        let originalPrice = null;
        try {
          const servicesData = await fs.readFile(servicesPath, 'utf-8');
          const services = JSON.parse(servicesData);
          const svc = services.find(s => s.id === serviceId);
          originalPrice = svc ? svc.price || null : null;
        } catch (e) {
          originalPrice = null;
        }

        const newDeal = {
          id: Date.now().toString(),
          chatId,
          customerId,
          vendorId,
          serviceId,
          customerAccepted: true,
          vendorAccepted: false,
          status: 'pending',
          createdAt: new Date().toISOString(),
          agreedAt: null,
          discountGiven: false,
          discount: { type: null, value: 0, amount: 0 },
          originalPrice: originalPrice,
          finalPrice: originalPrice
        };

        deals.push(newDeal);
        chatRoom.dealStatus = 'pending';
        await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
        await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

        // Create notification untuk vendor
        await createNotification(vendorId, 'deal_pending', 'Ada penawaran baru dari customer', chatId, { customerId, serviceId });

        return NextResponse.json({ success: true, message: 'Penawaran dikirim, menunggu vendor menerima', data: { deal: newDeal, chat: chatRoom } }, { status: 201 });
      } else {
        // Vendor menerima deal dari customer
        existingDeal.vendorAccepted = true;
        existingDeal.status = 'agreed';
        existingDeal.agreedAt = new Date().toISOString();

        // ensure discount fields exist
        if (typeof existingDeal.discountGiven === 'undefined') existingDeal.discountGiven = false;
        if (!existingDeal.discount) existingDeal.discount = { type: null, value: 0, amount: 0 };
        // load original price if missing
        if (typeof existingDeal.originalPrice === 'undefined' || existingDeal.originalPrice === null) {
          try {
            const servicesData = await fs.readFile(servicesPath, 'utf-8');
            const services = JSON.parse(servicesData);
            const svc = services.find(s => s.id === existingDeal.serviceId);
            existingDeal.originalPrice = svc ? svc.price || null : null;
            existingDeal.finalPrice = existingDeal.originalPrice;
          } catch (e) {
            // ignore
          }
        }

        chatRoom.dealStatus = 'agreed';
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
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    const deals = JSON.parse(dealsData);

    const deal = deals.find(d => d.chatId === chatId);

    return NextResponse.json({
      success: true,
      data: deal || null
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting deal:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
