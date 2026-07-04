import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: ?userId=...
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId wajib diisi.' }, { status: 400 });
    }

    const [user] = await query(
      'SELECT id, name, email, ktp_status, ktp_data, ktp_submitted_at, ktp_verified_by, ktp_verified_at, ktp_rejection_reason FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!user) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });
    }

    const ktpData = user.ktp_data || {};
    const verification = {
      status: user.ktp_status || 'not_submitted',
      submittedAt: user.ktp_submitted_at || null,
      verifiedAt: user.ktp_verified_at || null,
      verifiedBy: user.ktp_verified_by || null,
      rejectionReason: user.ktp_rejection_reason || null,
      name: ktpData.name || user.name || null,
      email: ktpData.email || user.email || null,
      idType: ktpData.idType || 'ktp',
      nik: ktpData.nik || null,
      idPhotoPreview: ktpData.idPhotoPreview || null,
      selfiePhotoPreview: ktpData.selfiePhotoPreview || null,
      notes: ktpData.notes || ''
    };

    return NextResponse.json({ success: true, data: verification }, { status: 200 });
  } catch (error) {
    console.error('Error reading KTP verification:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat memuat status verifikasi.' }, { status: 500 });
  }
}

// POST: body JSON { userId, name, email, idType, nik, idPhotoPreview, selfiePhotoPreview, notes }
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, name, email, idType, nik, idPhotoPreview, selfiePhotoPreview, notes } = body || {};

    if (!userId || !nik) {
      return NextResponse.json({ success: false, message: 'userId dan NIK wajib diisi.' }, { status: 400 });
    }

    const [user] = await query(
      'SELECT id, name, email FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!user) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const ktpPayload = {
      name: name || user.name || null,
      email: email || user.email || null,
      idType: idType || 'ktp',
      nik: String(nik).trim(),
      idPhotoPreview: typeof idPhotoPreview === 'string' ? idPhotoPreview : null,
      selfiePhotoPreview: typeof selfiePhotoPreview === 'string' ? selfiePhotoPreview : null,
      notes: notes || ''
    };

    await query(
      `UPDATE users SET ktp_status = 'pending', ktp_data = ?, ktp_submitted_at = ?, ktp_verified_by = NULL, ktp_verified_at = NULL, ktp_rejection_reason = NULL WHERE id = ?`,
      [JSON.stringify(ktpPayload), now, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Permohonan verifikasi KTP disimpan.',
      data: { status: 'pending', submittedAt: now, ...ktpPayload }
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving KTP verification:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat menyimpan verifikasi.' }, { status: 500 });
  }
}
