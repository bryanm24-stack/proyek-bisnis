import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

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

    const filePath = path.join(process.cwd(), 'users.json');
    let fileData = await fs.readFile(filePath, 'utf-8');
    fileData = fileData.replace(/^\uFEFF/, '').trim();
    const users = JSON.parse(fileData);

    const userIndex = users.findIndex((u) => String(u.id) === String(id));
    if (userIndex === -1) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (users[userIndex].password !== currentPassword) {
      return NextResponse.json({ success: false, message: 'Password saat ini tidak cocok.' }, { status: 401 });
    }

    users[userIndex].password = newPassword;
    await fs.writeFile(filePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ success: true, message: 'Password berhasil diubah.' }, { status: 200 });
  } catch (error) {
    console.error('Error change password:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server saat mengganti password.' }, { status: 500 });
  }
}
