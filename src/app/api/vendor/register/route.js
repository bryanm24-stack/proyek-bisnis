import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

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
      selfie_file LONGTEXT,
      selfie_file_name VARCHAR(255),
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

// POST - Submit vendor registration
export async function POST(request) {
  try {
    await ensureVendorRegistrationsTable();
    const body = await request.json();
    console.log('Vendor register body keys:', Object.keys(body));
    if (body.selfieFile) {
      console.log('selfieFile length:', String(body.selfieFile).length);
    }
    const {
      userId,
      vendorName,
      phoneNumber,
      identityType,
      identityNumber,
      identityFile,
      identityFileName
      , selfieFile,
      selfieFileName
    } = body;

    const normalizedVendorName = normalizeOptionalString(vendorName);
    const normalizedPhoneNumber = normalizeOptionalString(phoneNumber);
    const normalizedIdentityType = normalizeOptionalString(identityType);
    const normalizedIdentityNumber = normalizeOptionalString(identityNumber);
    const normalizedIdentityFile = normalizeOptionalString(identityFile);
    const normalizedIdentityFileName = normalizeOptionalString(identityFileName);
    const normalizedSelfieFile = normalizeOptionalString(selfieFile);
    const normalizedSelfieFileName = normalizeOptionalString(selfieFileName);

    // Validasi input
    if (!userId || !normalizedVendorName || !normalizedPhoneNumber || !normalizedIdentityType || !normalizedIdentityNumber || !normalizedIdentityFile || !normalizedSelfieFile) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi!'
      }, { status: 400 });
    }

    // Validasi format nomor telepon (minimal 10 digit)
    if (!/^\d{10,}$/.test(normalizedPhoneNumber.replace(/\D/g, ''))) {
      return NextResponse.json({
        success: false,
        message: 'Nomor telepon tidak valid (minimal 10 digit)'
      }, { status: 400 });
    }

    // Check if user exists and is not already vendor
    const users = await query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'User tidak ditemukan'
      }, { status: 404 });
    }

    const user = users[0];

    if (String(user.role || '').toLowerCase() === 'vendor') {
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
           SET vendor_name = ?, phone_number = ?, identity_type = ?, identity_number = ?, identity_file = ?, 
               identity_file_name = ?, selfie_file = ?, selfie_file_name = ?, status = 'pending', submitted_at = ?, rejection_reason = NULL
           WHERE id = ?`,
          [
            normalizedVendorName,
            normalizedPhoneNumber,
            normalizedIdentityType,
            normalizedIdentityNumber,
            normalizedIdentityFile,
            normalizedIdentityFileName,
            normalizedSelfieFile,
            normalizedSelfieFileName,
            new Date().toISOString(),
            existingReg.id
          ]
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
       (id, user_id, user_name, user_email, vendor_name, phone_number, identity_type, identity_number, identity_file, identity_file_name, selfie_file, selfie_file_name, status, created_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        registrationId,
        userId,
        user.name,
        user.email,
        normalizedVendorName,
        normalizedPhoneNumber,
        normalizedIdentityType,
        normalizedIdentityNumber,
        normalizedIdentityFile,
        normalizedIdentityFileName,
        normalizedSelfieFile,
        normalizedSelfieFileName,
        now,
        now
      ]
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
      message: 'Terjadi kesalahan server.',
      error: String(error?.message || error)
    }, { status: 500 });
  }
}

// GET - Check registration status
export async function GET(request) {
  try {
    await ensureVendorRegistrationsTable();

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
