import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
// GET - Get all vendor registrations (admin only)
export async function GET(request) {
  try {
    const registrationsData = await readData('registrations');
    const registrations = registrationsData;

    // Sort by createdAt descending
    registrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({
      success: true,
      data: registrations
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


    // Baca registrations
    const registrationsData = await readData('registrations');
    const registrations = registrationsData;

    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) {
      return NextResponse.json({
        success: false,
        message: 'Registrasi tidak ditemukan'
      }, { status: 404 });
    }

    if (registration.status !== 'pending') {
      return NextResponse.json({
        success: false,
        message: `Registrasi sudah ${registration.status === 'approved' ? 'disetujui' : 'ditolak'}`
      }, { status: 400 });
    }

    if (action === 'approve') {
      // Update user role to vendor
      const usersData = await readData('users');
      const users = usersData;

      const userIndex = users.findIndex(u => u.id === registration.userId);
      if (userIndex === -1) {
        return NextResponse.json({
          success: false,
          message: 'User tidak ditemukan'
        }, { status: 404 });
      }

      users[userIndex].role = 'vendor';
      users[userIndex].name = registration.vendorName;
      users[userIndex].phone = registration.phoneNumber;

      // Update registration status
      registration.status = 'approved';
      registration.approvedAt = new Date().toISOString();

      await writeData('users', users);
      await writeData('registrations', registrations);

      return NextResponse.json({
        success: true,
        message: `Vendor ${registration.vendorName} berhasil disetujui!`,
        data: registration
      }, { status: 200 });
    } else {
      // Reject registration
      if (!rejectionReason) {
        return NextResponse.json({
          success: false,
          message: 'Alasan penolakan wajib diisi!'
        }, { status: 400 });
      }

      registration.status = 'rejected';
      registration.rejectionReason = rejectionReason;
      registration.approvedAt = new Date().toISOString();

      await writeData('registration', registrations);

      return NextResponse.json({
        success: true,
        message: `Registrasi ${registration.vendorName} ditolak.`,
        data: registration
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
