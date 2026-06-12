import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
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


    // Baca users dengan fallback jika file corrupt/tidak ada
    const users = await readData('users');

    const user = users.find(u => u.id === userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User tidak ditemukan'
      }, { status: 404 });
    }

    if (user.role === 'vendor') {
      return NextResponse.json({
        success: false,
        message: 'User sudah terdaftar sebagai vendor'
      }, { status: 400 });
    }

    // Cek apakah user sudah pernah mendaftar sebagai vendor
    const registrations = await readData('registrations');
    
    const existingRegistration = registrations.find(r => r.userId === userId);
    
    // Jika status pending, tidak boleh submit lagi
    if (existingRegistration && existingRegistration.status === 'pending') {
      return NextResponse.json({
        success: false,
        message: 'Anda sudah melakukan registrasi vendor. Silakan tunggu persetujuan admin.'
      }, { status: 400 });
    }

    // Jika status rejected, update dengan data baru (resubmit)
    if (existingRegistration && existingRegistration.status === 'rejected') {
      const registrationIndex = registrations.findIndex(r => r.userId === userId);
      
      const updatedRegistration = {
        ...existingRegistration,
        vendorName,
        phoneNumber,
        identityFile,
        identityFileName,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        rejectionReason: null
      };
      
      registrations[registrationIndex] = updatedRegistration;
      try {
        await writeData('registration', registrations);
      } catch (err) {
        console.error('[vendor register] Error writing registrations.json:', err);
        return NextResponse.json({
          success: false,
          message: 'Gagal menyimpan data registrasi. Silakan coba lagi.'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Registrasi vendor disubmit ulang! Silakan tunggu persetujuan admin.',
        data: updatedRegistration
      }, { status: 201 });
    }

    // Buat registrasi baru
    const newRegistration = {
      id: Date.now().toString(),
      userId,
      userName: user.name,
      userEmail: user.email,
      vendorName,
      phoneNumber,
      identityFile, // Base64 encoded file
      identityFileName,
      status: 'pending', // pending, approved, rejected
      createdAt: new Date().toISOString(),
      rejectionReason: null,
      approvedAt: null
    };

    registrations.push(newRegistration);
    try {
      await writeData('registration', registrations);
    } catch (err) {
      console.error('[vendor register] Error writing registrations.json:', err);
      return NextResponse.json({
        success: false,
        message: 'Gagal menyimpan data registrasi. Silakan coba lagi.'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registrasi vendor berhasil dikirim! Silakan tunggu persetujuan admin.',
      data: newRegistration
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

    const registrationsData = await readData('registrations');
    const registrations = registrationsData;

    const registration = registrations.find(r => r.userId === userId);

    return NextResponse.json({
      success: true,
      data: registration || null
    }, { status: 200 });
  } catch (error) {
    console.error('Error di API Vendor Register GET:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
