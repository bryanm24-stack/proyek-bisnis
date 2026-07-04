import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { readData, writeData } from '@/lib/storage';

async function updateJsonUserProfile(id, updates) {
  const users = await readData('users');
  const updatedUsers = users.map((user) => {
    if (String(user.id) === String(id)) {
      return { ...user, ...updates };
    }
    return user;
  });

  await writeData('users', updatedUsers);
  return updatedUsers.find((user) => String(user.id) === String(id));
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, email, phone, bankName, accountNumber, accountHolder } = body;

    if (!id || !name || !email) {
      return NextResponse.json({ success: false, message: 'ID, nama, dan email harus diisi.' }, { status: 400 });
    }

    const updates = {
      name,
      email,
      phone: phone || null,
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      accountHolder: accountHolder || null
    };

    let user;
    let updatedUser;
    let usedJsonFallback = false;

    try {
      const users = await query(
        'SELECT id, name, email, role, phone, bankName, accountNumber, accountHolder FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      if (users.length === 0) {
        throw new Error('User not found in DB');
      }
      user = users[0];

      await query(
        'UPDATE users SET name = ?, email = ?, phone = ?, bankName = ?, accountNumber = ?, accountHolder = ? WHERE id = ?',
        [updates.name, updates.email, updates.phone, updates.bankName, updates.accountNumber, updates.accountHolder, id]
      );

      updatedUser = {
        id: user.id,
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        bankName: updates.bankName,
        accountNumber: updates.accountNumber,
        accountHolder: updates.accountHolder,
        role: user.role
      };
    } catch (sqlError) {
      // Fallback to JSON storage if DB is unavailable or schema does not support bank fields.
      usedJsonFallback = true;
      const users = await readData('users');
      const existingUser = users.find((item) => String(item.id) === String(id));
      if (!existingUser) {
        return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
      }

      updatedUser = await updateJsonUserProfile(id, {
        ...updates,
        role: existingUser.role || existingUser.role
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Informasi diperbarui.',
        user: updatedUser,
        storage: usedJsonFallback ? 'json' : 'db'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error update profile:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server saat memperbarui profil.' }, { status: 500 });
  }
}
