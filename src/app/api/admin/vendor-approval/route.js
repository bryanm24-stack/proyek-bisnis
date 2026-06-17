import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function normalizeRegistration(reg) {
  if (!reg) return null;
  return {
    id: reg.id,
    userId: reg.user_id,
    userName: reg.user_name,
    userEmail: reg.user_email,
    vendorName: reg.vendor_name,
    phoneNumber: reg.phone_number,
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
