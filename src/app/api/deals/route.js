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

// POST - Accept or cancel deal
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, chatId, customerId, vendorId, serviceId } = body;

    if (!action || !chatId || !customerId || !vendorId || !serviceId) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi!'
      }, { status: 400 });
    }

    if (!['accept', 'cancel', 'apply-discount'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Action harus berisi accept, cancel, atau apply-discount'
      }, { status: 400 });
    }

    const chatsPath = path.join(process.cwd(), 'chats.json');
    const dealsPath = path.join(process.cwd(), 'deals.json');

    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    const deals = JSON.parse(dealsData);

    // Update chat dealStatus
    const chatRoom = chats.find(c => c.id === chatId);
    if (!chatRoom) {
      return NextResponse.json({
        success: false,
        message: 'Chat room tidak ditemukan'
      }, { status: 404 });
    }

    if (action === 'cancel') {
      // Update chat status menjadi cancelled
      chatRoom.dealStatus = 'cancelled';
      await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

      // Create notification untuk vendor
      await createNotification(
        vendorId,
        'deal_cancelled',
        'Deal dibatalkan oleh customer',
        chatId,
        { customerId, serviceId }
      );

      return NextResponse.json({
        success: true,
        message: 'Deal dibatalkan',
        data: chatRoom
      }, { status: 200 });
    }

    if (action === 'accept') {
      // Check if deal sudah ada dari pihak lain
      const existingDeal = deals.find(d => d.chatId === chatId);

      if (!existingDeal) {
        // Buat deal baru (dari pihak customer)
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
          agreedAt: null
        };

        deals.push(newDeal);
        chatRoom.dealStatus = 'pending';
        await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
        await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

        // Create notification untuk vendor
        await createNotification(
          vendorId,
          'deal_pending',
          'Ada penawaran baru dari customer',
          chatId,
          { customerId, serviceId }
        );

        return NextResponse.json({
          success: true,
          message: 'Penawaran dikirim, menunggu vendor menerima',
          data: { deal: newDeal, chat: chatRoom }
        }, { status: 201 });
      } else {
        // Vendor menerima deal dari customer
        existingDeal.vendorAccepted = true;
        existingDeal.status = 'agreed';
        existingDeal.agreedAt = new Date().toISOString();

        chatRoom.dealStatus = 'agreed';
        await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
        await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

        // Create notification untuk customer
        await createNotification(
          customerId,
          'deal_accepted',
          'Vendor menerima penawaran Anda!',
          chatId,
          { vendorId, serviceId }
        );

        return NextResponse.json({
          success: true,
          message: 'Deal diterima! Lanjutkan ke proses transaksi.',
          data: { deal: existingDeal, chat: chatRoom, readyForRating: false }
        }, { status: 200 });
      }
    }

    if (action === 'apply-discount') {
      // Read services to get original price
      const servicesPath = path.join(process.cwd(), 'services.json');
      const servicesData = await fs.readFile(servicesPath, 'utf-8');
      const services = JSON.parse(servicesData);

      // Find deal
      const deal = deals.find(d => d.chatId === chatId);
      if (!deal) {
        return NextResponse.json({
          success: false,
          message: 'Deal tidak ditemukan'
        }, { status: 404 });
      }

      // Get service price
      const service = services[deal.serviceId];
      if (!service) {
        return NextResponse.json({
          success: false,
          message: 'Service tidak ditemukan'
        }, { status: 404 });
      }

      const { discountType, discountValue } = body;
      const originalPrice = service.price || 0;

      // Calculate final price
      let discountAmount = 0;
      if (discountType === 'percent') {
        discountAmount = Math.round((discountValue / 100) * originalPrice);
      } else if (discountType === 'fixed') {
        discountAmount = discountValue;
      }

      const finalPrice = Math.max(0, originalPrice - discountAmount);

      // Update deal with discount info
      deal.originalPrice = originalPrice;
      deal.discountType = discountType;
      deal.discountValue = discountValue;
      deal.discountAmount = discountAmount;
      deal.finalPrice = finalPrice;
      deal.discountAppliedAt = new Date().toISOString();

      await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

      // Create notification untuk customer
      await createNotification(
        deal.customerId,
        'discount_applied',
        `Vendor memberikan diskon ${discountValue}${discountType === 'percent' ? '%' : 'Rp'}!`,
        chatId,
        { discountAmount, finalPrice }
      );

      return NextResponse.json({
        success: true,
        message: 'Diskon berhasil diterapkan',
        data: { deal }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error processing deal:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
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
