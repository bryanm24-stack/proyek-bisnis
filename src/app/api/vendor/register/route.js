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

// POST - Submit vendor registration
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, vendorName, phoneNumber, identityFile, identityFileName } = body;

    // Validasi input
    if (!userId || !vendorName || !phoneNumber || !identityFile) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi!'
      }, { status: 400 });
    }

    // Validasi format nomor telepon (minimal 10 digit)
    if (!/^\d{10,}$/.test(phoneNumber.replace(/\D/g, ''))) {
      return NextResponse.json({
        success: false,
        message: 'Nomor telepon tidak valid (minimal 10 digit)'
      }, { status: 400 });
    }

    // Check if user exists and is not already vendor
    const users = await query('SELECT id, name, email, role, role_id FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'User tidak ditemukan'
      }, { status: 404 });
    }

    const user = users[0];

    if (user.role === 'vendor' || user.role_id === 2) {
      return NextResponse.json({
        success: false,
        message: 'User sudah terdaftar sebagai vendor'
      }, { status: 400 });
    }

    // Check existing registration for this user
    const existing = await query(
      'SELECT id, status FROM vendor_registrations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      const existingReg = existing[0];
      
      // Jika status pending, tidak boleh submit lagi
      if (existingReg.status === 'pending') {
        return NextResponse.json({
          success: false,
          message: 'Anda sudah melakukan registrasi vendor. Silakan tunggu persetujuan admin.'
        }, { status: 400 });
      }

      // Jika status rejected, update dengan data baru (resubmit)
      if (existingReg.status === 'rejected') {
        await query(
          `UPDATE vendor_registrations 
           SET vendor_name = ?, phone_number = ?, identity_file = ?, 
               identity_file_name = ?, status = 'pending', submitted_at = ?, rejection_reason = NULL
           WHERE id = ?`,
          [vendorName, phoneNumber, identityFile, identityFileName, new Date().toISOString(), existingReg.id]
        );

        const updated = await query('SELECT * FROM vendor_registrations WHERE id = ?', [existingReg.id]);
        return NextResponse.json({
          success: true,
          message: 'Registrasi vendor disubmit ulang! Silakan tunggu persetujuan admin.',
          data: normalizeRegistration(updated[0])
        }, { status: 201 });
      }
    }

    // Create new registration
    const registrationId = Date.now().toString();
    const now = new Date().toISOString();

    await query(
      `INSERT INTO vendor_registrations 
       (id, user_id, user_name, user_email, vendor_name, phone_number, identity_file, 
        identity_file_name, status, created_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [registrationId, userId, user.name, user.email, vendorName, phoneNumber, 
       identityFile, identityFileName, now, now]
    );

    const newReg = await query('SELECT * FROM vendor_registrations WHERE id = ?', [registrationId]);

    return NextResponse.json({
      success: true,
      message: 'Registrasi vendor berhasil dikirim! Silakan tunggu persetujuan admin.',
      data: normalizeRegistration(newReg[0])
    }, { status: 201 });
  } catch (error) {
    console.error('Error di API Vendor Register:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// GET - Check registration status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId parameter required'
      }, { status: 400 });
    }

    const registrations = await query(
      'SELECT * FROM vendor_registrations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: registrations.length > 0 ? normalizeRegistration(registrations[0]) : null
    }, { status: 200 });
  } catch (error) {
    console.error('Error di API Vendor Register GET:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
