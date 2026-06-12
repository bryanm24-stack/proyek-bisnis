import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, email } = body;

    if (!id || !name || !email) {
      return NextResponse.json({ success: false, message: 'ID, nama, dan email harus diisi.' }, { status: 400 });
    }

    const users = await readData('users');

    const userIndex = users.findIndex((u) => String(u.id) === String(id));
    if (userIndex === -1) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const duplicateEmail = users.find((u) => String(u.id) !== String(id) && u.email === email);
    if (duplicateEmail) {
      return NextResponse.json({ success: false, message: 'Email sudah digunakan oleh pengguna lain.' }, { status: 400 });
    }

    users[userIndex].name = name;
    users[userIndex].email = email;

    await writeData('users', users);

    return NextResponse.json({ success: true, message: 'Informasi diperbarui.', user: { id: users[userIndex].id, name: users[userIndex].name, email: users[userIndex].email, role: users[userIndex].role } }, { status: 200 });
  } catch (error) {
    console.error('Error update profile:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server saat memperbarui profil.' }, { status: 500 });
  }
}
