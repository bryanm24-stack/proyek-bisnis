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
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json(notifications, { status: 200 });
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
    
    const { userId, type, message, relatedId, relatedData } = await req.json();

    if (!userId || !type || !message) {
      return NextResponse.json(
        { message: 'userId, type, dan message diperlukan' },
        { status: 400 }
      );
    }

    const notificationId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO notifications (id, user_id, type, message, related_id, related_data, is_read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        notificationId,
        String(userId),
        String(type),
        String(message),
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
    
    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { message: 'notificationId diperlukan' },
        { status: 400 }
      );
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
