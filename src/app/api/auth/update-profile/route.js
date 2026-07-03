import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, email, phone } = body;

    if (!id || !name || !email) {
      return NextResponse.json({ success: false, message: 'ID, nama, dan email harus diisi.' }, { status: 400 });
    }

    // Check if user exists
    const users = await query('SELECT id, name, email, role, phone FROM users WHERE id = ? LIMIT 1', [id]);
    if (users.length === 0) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const user = users[0];

    // Check if email is already in use by another user
    const duplicateEmails = await query('SELECT id FROM users WHERE id != ? AND email = ?', [id, email]);
    if (duplicateEmails.length > 0) {
      return NextResponse.json({ success: false, message: 'Email sudah digunakan oleh pengguna lain.' }, { status: 400 });
    }

    // Update user profile in database
    await query('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone || null, id]);

    return NextResponse.json(
      {
        success: true,
        message: 'Informasi diperbarui.',
        user: {
          id: user.id,
          name,
          email,
          phone: phone || user.phone,
          role: user.role
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error update profile:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server saat memperbarui profil.' }, { status: 500 });
  }
}
