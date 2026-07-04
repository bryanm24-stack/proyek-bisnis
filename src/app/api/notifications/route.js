import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

async function readNotifications() {
  try {
    return await readData('notifications');
  } catch (error) {
    return [];
  }
}

// Write notifications file
async function writeNotifications(notifications) {
  await writeData('notification', notifications);
}

// GET - Retrieve notifications for user
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'userId diperlukan' },
        { status: 400 }
      );
    }

    const notifications = await readNotifications();
    const userNotifications = notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json(userNotifications, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Gagal mengambil notifikasi' },
      { status: 500 }
    );
  }
}

// POST - Create notification
export async function POST(req) {
  try {
    const { userId, type, message, relatedId, relatedData } = await req.json();

    if (!userId || !type || !message) {
      return NextResponse.json(
        { message: 'userId, type, dan message diperlukan' },
        { status: 400 }
      );
    }

    const notifications = await readNotifications();

    const newNotification = {
      id: `notif_${Date.now()}`,
      userId,
      type, // 'deal_accepted', 'deal_cancelled', 'new_message', 'service_approved'
      message,
      relatedId, // chatId, dealId, serviceId
      relatedData: relatedData || {},
      read: false,
      createdAt: new Date().toISOString()
    };

    notifications.push(newNotification);
    await writeNotifications(notifications);

    return NextResponse.json(newNotification, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Gagal membuat notifikasi' },
      { status: 500 }
    );
  }
}

// PUT - Mark notification as read
export async function PUT(req) {
  try {
    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { message: 'notificationId diperlukan' },
        { status: 400 }
      );
    }

    const notifications = await readNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) {
      return NextResponse.json(
        { message: 'Notifikasi tidak ditemukan' },
        { status: 404 }
      );
    }

    notification.read = true;
    await writeNotifications(notifications);

    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Gagal update notifikasi' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { message: 'id diperlukan' },
        { status: 400 }
      );
    }

    const notifications = await readNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    await writeNotifications(filtered);

    return NextResponse.json(
      { message: 'Notifikasi dihapus' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Gagal menghapus notifikasi' },
      { status: 500 }
    );
  }
}
