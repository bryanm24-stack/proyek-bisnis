import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

// GET: ?userId=...
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId wajib diisi.' }, { status: 400 });
    }

    const users = await readData('users');
    const user = Array.isArray(users) ? users.find((u) => String(u.id) === String(userId)) : null;

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

    const users = await readData('users');
    const userIndex = Array.isArray(users) ? users.findIndex((u) => String(u.id) === String(userId)) : -1;

    if (userIndex === -1) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const ktpPayload = {
      name: name || users[userIndex].name || null,
      email: email || users[userIndex].email || null,
      idType: idType || 'ktp',
      nik: String(nik).trim(),
      idPhotoPreview: typeof idPhotoPreview === 'string' ? idPhotoPreview : null,
      selfiePhotoPreview: typeof selfiePhotoPreview === 'string' ? selfiePhotoPreview : null,
      notes: notes || ''
    };

    // Update user record in JSON storage (snake_case fields expected by admin UI)
    const user = users[userIndex];
    user.ktp_status = 'pending';
    user.ktp_data = ktpPayload;
    user.ktp_submitted_at = now;
    user.ktp_verified_by = null;
    user.ktp_verified_at = null;
    user.ktp_rejection_reason = null;

    // Remove old camelCase variants to reduce ambiguity
    delete user.ktpStatus;
    delete user.ktpData;
    delete user.ktpSubmittedAt;
    delete user.ktpVerifiedBy;
    delete user.ktpVerifiedAt;
    delete user.ktpRejectionReason;

    users[userIndex] = user;
    await writeData('users', users);

    return NextResponse.json({
      success: true,
      message: 'Permohonan verifikasi KTP disimpan.',
      data: { status: user.ktp_status, submittedAt: user.ktp_submitted_at, ...ktpPayload }
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving KTP verification:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat menyimpan verifikasi.' }, { status: 500 });
  }
}
