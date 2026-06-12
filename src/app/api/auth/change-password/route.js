import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, currentPassword, newPassword } = body;

    if (!id || !currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'ID, password saat ini, dan password baru harus diisi.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: 'Password baru harus minimal 6 karakter.' }, { status: 400 });
    }

    const users = await readData('users');

    const userIndex = users.findIndex((u) => String(u.id) === String(id));
    if (userIndex === -1) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (users[userIndex].password !== currentPassword) {
      return NextResponse.json({ success: false, message: 'Password saat ini tidak cocok.' }, { status: 401 });
    }

    users[userIndex].password = newPassword;
    await writeData('users', users);

    return NextResponse.json({ success: true, message: 'Password berhasil diubah.' }, { status: 200 });
  } catch (error) {
    console.error('Error change password:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server saat mengganti password.' }, { status: 500 });
  }
}
