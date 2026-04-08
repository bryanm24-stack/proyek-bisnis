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

    if (!['accept', 'cancel'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Action harus berisi accept atau cancel'
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
          customerAccepted: customerId === customerId ? true : false,
          vendorAccepted: false,
          status: 'pending', // pending, agreed, cancelled
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
          message: 'Deal diterima! Silakan lakukan rating.',
          data: { deal: existingDeal, chat: chatRoom, readyForRating: true }
        }, { status: 200 });
      }
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
