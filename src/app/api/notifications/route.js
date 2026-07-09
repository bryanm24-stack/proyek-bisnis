import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Ensure notifications table exists
async function ensureNotificationsTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      sender_name VARCHAR(255),
      message_count INT DEFAULT 1,
      related_id VARCHAR(255),
      related_data JSON,
      is_read TINYINT DEFAULT 0,
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_user_id (user_id),
      INDEX idx_is_read (is_read),
      INDEX idx_created_at (created_at)
    )`
  );

  // Check if updated_at column exists, if not add it
  try {
    const columns = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'`
    );
    const columnNames = new Set(columns.map(c => c.COLUMN_NAME.toLowerCase()));
    
    if (!columnNames.has('updated_at')) {
      await query(
        `ALTER TABLE notifications ADD COLUMN updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER created_at`
      );
    }

    if (!columnNames.has('sender_name')) {
      await query(
        `ALTER TABLE notifications ADD COLUMN sender_name VARCHAR(255) AFTER message`
      );
    }

    if (!columnNames.has('message_count')) {
      await query(
        `ALTER TABLE notifications ADD COLUMN message_count INT DEFAULT 1 AFTER sender_name`
      );
    }
  } catch (err) {
    console.warn('Warning checking notification columns:', err?.message);
  }
}

// GET - Retrieve notifications for user
export async function GET(req) {
  try {
    await ensureNotificationsTable();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'userId diperlukan' },
        { status: 400 }
      );
    }

    const notifications = await query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY COALESCE(updated_at, created_at) DESC`,
      [userId]
    );

    const dedupedNotifications = [];
    const chatNotificationMap = new Map();

    for (const notification of notifications) {
      const isChatNotification = String(notification.type).toLowerCase() === 'chat_message' && notification.related_id;

      if (!isChatNotification) {
        dedupedNotifications.push(notification);
        continue;
      }

      const existing = chatNotificationMap.get(notification.related_id);
      if (!existing) {
        chatNotificationMap.set(notification.related_id, {
          ...notification,
          message_count: Number(notification.message_count || 1)
        });
        continue;
      }

      const existingIsUnread = !existing.is_read;
      const currentIsUnread = !notification.is_read;

      if (!existingIsUnread && currentIsUnread) {
        chatNotificationMap.set(notification.related_id, {
          ...notification,
          message_count: Number(notification.message_count || 1)
        });
        continue;
      }

      if (existingIsUnread && !currentIsUnread) {
        continue;
      }

      if (existingIsUnread && currentIsUnread) {
        chatNotificationMap.set(notification.related_id, {
          ...notification,
          message_count: Number(existing.message_count || 1) + Number(notification.message_count || 1)
        });
        continue;
      }

      chatNotificationMap.set(notification.related_id, {
        ...notification,
        message_count: Number(notification.message_count || 1)
      });
    }

    dedupedNotifications.push(...chatNotificationMap.values());
    dedupedNotifications.sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });

    return NextResponse.json(dedupedNotifications, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { message: 'Gagal mengambil notifikasi' },
      { status: 500 }
    );
  }
}

// POST - Create notification
export async function POST(req) {
  try {
    await ensureNotificationsTable();
    
    const { userId, type, message, senderName, relatedId, relatedData } = await req.json();

    if (!userId || !type || !message) {
      return NextResponse.json(
        { message: 'userId, type, dan message diperlukan' },
        { status: 400 }
      );
    }

    const notificationId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    if (String(type).toLowerCase() === 'chat_message' && relatedId) {
      const [existingNotification] = await query(
        `SELECT * FROM notifications
         WHERE user_id = ?
           AND type = ?
           AND related_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [String(userId), String(type), String(relatedId)]
      );

      if (existingNotification) {
        if (!Number(existingNotification.is_read)) {
          const nextCount = Number(existingNotification.message_count || 1) + 1;
          await query(
            `UPDATE notifications
             SET message = ?, sender_name = ?, message_count = ?, related_data = ?, is_read = 0, updated_at = ?
             WHERE id = ?`,
            [
              String(message),
              senderName ? String(senderName) : null,
              nextCount,
              relatedData ? JSON.stringify(relatedData) : existingNotification.related_data,
              now,
              existingNotification.id
            ]
          );

          const [updatedNotification] = await query(
            `SELECT * FROM notifications WHERE id = ?`,
            [existingNotification.id]
          );

          return NextResponse.json(updatedNotification, { status: 200 });
        }
      }
    }

    await query(
      `INSERT INTO notifications (id, user_id, type, message, sender_name, message_count, related_id, related_data, is_read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, ?, ?)`,
      [
        notificationId,
        String(userId),
        String(type),
        String(message),
        senderName ? String(senderName) : null,
        relatedId ? String(relatedId) : null,
        relatedData ? JSON.stringify(relatedData) : null,
        now,
        now
      ]
    );

    const [notification] = await query(
      `SELECT * FROM notifications WHERE id = ?`,
      [notificationId]
    );

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { message: 'Gagal membuat notifikasi' },
      { status: 500 }
    );
  }
}

// PUT - Mark notification as read
export async function PUT(req) {
  try {
    await ensureNotificationsTable();
    
    const { notificationId, relatedId } = await req.json();

    if (!notificationId && !relatedId) {
      return NextResponse.json(
        { message: 'notificationId atau relatedId diperlukan' },
        { status: 400 }
      );
    }

    if (relatedId) {
      await query(
        `UPDATE notifications
         SET is_read = 1
         WHERE related_id = ? AND type = 'chat_message'`,
        [relatedId]
      );

      const [notification] = await query(
        `SELECT * FROM notifications
         WHERE related_id = ? AND type = 'chat_message'
         ORDER BY COALESCE(updated_at, created_at) DESC
         LIMIT 1`,
        [relatedId]
      );

      if (!notification) {
        return NextResponse.json(
          { message: 'Notifikasi tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json(notification, { status: 200 });
    }

    await query(
      `UPDATE notifications 
       SET is_read = 1 
       WHERE id = ?`,
      [notificationId]
    );

    const [notification] = await query(
      `SELECT * FROM notifications WHERE id = ?`,
      [notificationId]
    );

    if (!notification) {
      return NextResponse.json(
        { message: 'Notifikasi tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { message: 'Gagal update notifikasi' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(req) {
  try {
    await ensureNotificationsTable();
    
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { message: 'id diperlukan' },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM notifications WHERE id = ?`,
      [notificationId]
    );

    return NextResponse.json(
      { message: 'Notifikasi dihapus' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { message: 'Gagal menghapus notifikasi' },
      { status: 500 }
    );
  }
}
