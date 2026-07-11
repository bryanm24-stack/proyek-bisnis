import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function ensureVendorRegistrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_registrations (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      vendor_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(255),
      identity_type VARCHAR(255),
      identity_number VARCHAR(255),
      identity_file LONGTEXT,
      identity_file_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      rejection_reason TEXT,
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      submitted_at DATETIME(3),
      approved_at DATETIME(3),
      INDEX idx_status (status),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    )
  `);

  // Ensure columns exist (use individual ALTER statements and ignore duplicate-column errors)
  try {
    await query(`ALTER TABLE vendor_registrations ADD COLUMN identity_type VARCHAR(255)`);
  } catch (e) {
    // ignore if column exists
  }
  try {
    await query(`ALTER TABLE vendor_registrations ADD COLUMN identity_number VARCHAR(255)`);
  } catch (e) {
  }
  try {
    await query(`ALTER TABLE vendor_registrations ADD COLUMN selfie_file LONGTEXT`);
  } catch (e) {
  }
  try {
    await query(`ALTER TABLE vendor_registrations ADD COLUMN selfie_file_name VARCHAR(255)`);
  } catch (e) {
  }
}

function normalizeRegistration(reg) {
  if (!reg) return null;
  return {
    id: reg.id,
    userId: reg.user_id,
    userName: reg.user_name,
    userEmail: reg.user_email,
    vendorName: reg.vendor_name,
    phoneNumber: reg.phone_number,
    identityType: reg.identity_type,
    identityNumber: reg.identity_number,
    selfieFile: reg.selfie_file,
    selfieFileName: reg.selfie_file_name,
    identityFile: reg.identity_file,
    identityFileName: reg.identity_file_name,
    status: reg.status,
    rejectionReason: reg.rejection_reason,
    createdAt: reg.created_at,
    submittedAt: reg.submitted_at,
    approvedAt: reg.approved_at
  };
}

// GET - Get all vendor registrations (admin only)
export async function GET(request) {
  try {
    await ensureVendorRegistrationsTable();

    const registrations = await query(
      'SELECT * FROM vendor_registrations ORDER BY created_at DESC'
    );

    return NextResponse.json({
      success: true,
      data: registrations.map(normalizeRegistration)
    }, { status: 200 });
  } catch (error) {
    console.error('Error di API Admin Vendor Approval GET:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// POST - Approve or reject vendor registration
export async function POST(request) {
  try {
    await ensureVendorRegistrationsTable();

    const body = await request.json();
    const { registrationId, action, rejectionReason } = body;

    if (!registrationId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'registrationId dan action (approve/reject) wajib diisi!'
      }, { status: 400 });
    }

    // Get registration
    const registrations = await query(
      'SELECT * FROM vendor_registrations WHERE id = ?',
      [registrationId]
    );

    if (registrations.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Registrasi tidak ditemukan'
      }, { status: 404 });
    }

    const registration = registrations[0];

    if (registration.status !== 'pending') {
      return NextResponse.json({
        success: false,
        message: `Registrasi sudah ${registration.status === 'approved' ? 'disetujui' : 'ditolak'}`
      }, { status: 400 });
    }

    if (action === 'approve') {
      // Check if user exists
      const users = await query(
        'SELECT id FROM users WHERE id = ?',
        [registration.user_id]
      );

      if (users.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'User tidak ditemukan'
        }, { status: 404 });
      }

      // Update user role to vendor
      await query(
        `UPDATE users SET role = 'vendor', role_id = 2, name = ?, phone = ?
         WHERE id = ?`,
        [registration.vendor_name, registration.phone_number, registration.user_id]
      );

      // Update registration status to approved
      const now = new Date().toISOString();
      await query(
        `UPDATE vendor_registrations SET status = 'approved', approved_at = ?
         WHERE id = ?`,
        [now, registrationId]
      );

      // Create notification for user
      const notificationId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      try {
        await query(
          `INSERT INTO notifications (id, user_id, type, message, sender_name, related_id, related_data, is_read, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            notificationId,
            registration.user_id,
            'vendor_approved',
            `✓ Registrasi vendor Anda telah disetujui! Selamat datang sebagai vendor di RentGuard. Anda sekarang bisa menambahkan produk/jasa.`,
            'Admin RentGuard',
            registrationId,
            JSON.stringify({ vendor_name: registration.vendor_name, status: 'approved' }),
            now,
            now
          ]
        );
      } catch (notifErr) {
        console.warn('Warning creating approval notification:', notifErr?.message);
      }

      const updated = await query('SELECT * FROM vendor_registrations WHERE id = ?', [registrationId]);

      return NextResponse.json({
        success: true,
        message: `Vendor ${registration.vendor_name} berhasil disetujui!`,
        data: normalizeRegistration(updated[0])
      }, { status: 200 });
    } else {
      // Reject registration
      if (!rejectionReason) {
        return NextResponse.json({
          success: false,
          message: 'Alasan penolakan wajib diisi!'
        }, { status: 400 });
      }

      // Update registration status to rejected
      const now = new Date().toISOString();
      await query(
        `UPDATE vendor_registrations 
         SET status = 'rejected', rejection_reason = ?, approved_at = ?
         WHERE id = ?`,
        [rejectionReason, now, registrationId]
      );

      // Create notification for user
      const notificationId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      try {
        await query(
          `INSERT INTO notifications (id, user_id, type, message, sender_name, related_id, related_data, is_read, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            notificationId,
            registration.user_id,
            'vendor_rejected',
            `✕ Registrasi vendor Anda ditolak. Alasan: ${rejectionReason}. Anda dapat melakukan perbaikan data dan submit ulang untuk direview kembali.`,
            'Admin RentGuard',
            registrationId,
            JSON.stringify({ vendor_name: registration.vendor_name, status: 'rejected', reason: rejectionReason }),
            now,
            now
          ]
        );
      } catch (notifErr) {
        console.warn('Warning creating rejection notification:', notifErr?.message);
      }

      const updated = await query('SELECT * FROM vendor_registrations WHERE id = ?', [registrationId]);

      return NextResponse.json({
        success: true,
        message: `Registrasi ${registration.vendor_name} ditolak.`,
        data: normalizeRegistration(updated[0])
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error di API Admin Vendor Approval POST:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
