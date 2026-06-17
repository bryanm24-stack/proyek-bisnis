import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    // Get user from database
    const users = await query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [id]);
    const user = users[0];

    if (!user) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (user.password !== currentPassword) {
      return NextResponse.json({ success: false, message: 'Password saat ini tidak cocok.' }, { status: 401 });
    }

    // Update password in database
    await query('UPDATE users SET password = ? WHERE id = ?', [newPassword, id]);

    return NextResponse.json({ success: true, message: 'Password berhasil diubah.' }, { status: 200 });
  } catch (error) {
    console.error('Error change password:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server saat mengganti password.' }, { status: 500 });
  }
}
