import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

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

    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    const deals = JSON.parse(dealsData);

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

      await createNotification(vendorId, 'deal_cancelled', 'Deal dibatalkan oleh customer', chatId, { customerId, serviceId });

      return NextResponse.json({ success: true, message: 'Deal dibatalkan', data: chatRoom }, { status: 200 });
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
          customerAccepted: customerId === customerId ? true : false,
          vendorAccepted: false,
          status: 'pending', // pending, agreed, cancelled
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

    // Handle apply-discount (vendor)
    if (action === 'apply-discount') {
      const { chatId, vendorId, discountType, discountValue } = body;
      if (!chatId || !vendorId || (typeof discountType === 'undefined') || (typeof discountValue === 'undefined')) {
        return NextResponse.json({ success: false, message: 'chatId, vendorId, discountType dan discountValue diperlukan' }, { status: 400 });
      }

      const deal = deals.find(d => d.chatId === chatId);
      if (!deal) return NextResponse.json({ success: false, message: 'Deal tidak ditemukan' }, { status: 404 });
      if (deal.vendorId !== vendorId) return NextResponse.json({ success: false, message: 'Hanya vendor terkait yang dapat memberikan diskon' }, { status: 403 });
      if (deal.status !== 'agreed') return NextResponse.json({ success: false, message: 'Diskon hanya dapat diberikan setelah deal disetujui' }, { status: 400 });

      // load original price if missing
      let originalPrice = deal.originalPrice;
      if (typeof originalPrice === 'undefined' || originalPrice === null) {
        try {
          const servicesData = await fs.readFile(servicesPath, 'utf-8');
          const services = JSON.parse(servicesData);
          const svc = services.find(s => s.id === deal.serviceId);
          originalPrice = svc ? svc.price || 0 : 0;
        } catch (e) {
          originalPrice = 0;
        }
      }

      let discountAmount = 0;
      if (discountType === 'percent') {
        const pct = Number(discountValue) || 0;
        discountAmount = Math.round((pct / 100) * originalPrice);
      } else {
        discountAmount = Number(discountValue) || 0;
      }
      if (discountAmount < 0) discountAmount = 0;
      let finalPrice = originalPrice - discountAmount;
      if (finalPrice < 0) finalPrice = 0;

      deal.discountGiven = true;
      deal.discount = { type: discountType || null, value: Number(discountValue) || 0, amount: discountAmount };
      deal.originalPrice = originalPrice;
      deal.finalPrice = finalPrice;

      await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

      // Update chat dealStatus if needed
      const chatRoomIdx = chats.findIndex(c => c.id === chatId);
      if (chatRoomIdx !== -1) {
        chats[chatRoomIdx].dealStatus = 'agreed';
        await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));
      }

      // notify customer
      await createNotification(deal.customerId, 'deal_discounted', `Vendor memberikan diskon. Harga akhir: Rp ${finalPrice}`, chatId, { finalPrice });

      return NextResponse.json({ success: true, message: 'Diskon diterapkan', data: { deal } }, { status: 200 });
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
