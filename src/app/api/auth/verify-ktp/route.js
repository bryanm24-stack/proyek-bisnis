import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/storage';

const DATASET = 'ktp_verifications';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId wajib diisi.' }, { status: 400 });
    }

    const records = await readData(DATASET);
    const verification = Array.isArray(records)
      ? records.find((item) => String(item.userId) === String(userId))
      : null;

    return NextResponse.json({ success: true, data: verification || null }, { status: 200 });
  } catch (error) {
    console.error('Error reading KTP verification:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat memuat status verifikasi.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, name, email, idType, nik, idPhotoPreview, selfiePhotoPreview, status, notes } = body;

    if (!userId || !nik) {
      return NextResponse.json({ success: false, message: 'userId dan NIK wajib diisi.' }, { status: 400 });
    }

    const records = await readData(DATASET);
    const existingRecord = Array.isArray(records)
      ? records.find((item) => String(item.userId) === String(userId))
      : null;

    const newRecord = {
      id: existingRecord?.id || `KTP-${Date.now()}`,
      userId: String(userId),
      name: name || null,
      email: email || null,
      idType: idType || 'ktp',
      nik: String(nik).trim(),
      idPhotoPreview: typeof idPhotoPreview === 'string' ? idPhotoPreview : null,
      selfiePhotoPreview: typeof selfiePhotoPreview === 'string' ? selfiePhotoPreview : null,
      status: status || 'pending',
      notes: notes || '',
      submittedAt: new Date().toISOString(),
      reviewedAt: existingRecord?.reviewedAt || null,
      reviewedBy: existingRecord?.reviewedBy || null,
      adminNotes: existingRecord?.adminNotes || ''
    };

    const updated = existingRecord
      ? records.map((item) => (String(item.userId) === String(userId) ? newRecord : item))
      : [...(Array.isArray(records) ? records : []), newRecord];

    await writeData(DATASET, updated);

    return NextResponse.json({ success: true, message: 'Permohonan verifikasi KTP disimpan.', data: newRecord }, { status: 200 });
  } catch (error) {
    console.error('Error saving KTP verification:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat menyimpan verifikasi.' }, { status: 500 });
  }
}
