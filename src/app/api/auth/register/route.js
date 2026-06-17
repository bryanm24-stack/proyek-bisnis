import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { readData, writeData } from '@/lib/storage';

export async function POST(request) {
  try {
    const body = await request.json(); // Ambil data dari form React
    const { username, name, email, password } = body;

    if (!username || !name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Semua field wajib diisi!' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newId = Date.now().toString();

    try {
      const existingUsers = await query(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username, email]
      );

      if (existingUsers.length > 0) {
        return NextResponse.json({ success: false, message: 'Username atau email sudah terdaftar!' }, { status: 400 });
      }

      await query(
        `INSERT INTO users (id, username, password, name, role_id, role, email, phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, username, password, name, 1, 'customer', email, '', now]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Registrasi berhasil!',
        user: { id: newId, username, name, email, role: 'customer' }
      }, { status: 201 });
    } catch (dbError) {
      console.warn('DB unavailable, fallback to JSON storage:', dbError.message);

      const users = await readData('users');

      const usernameExists = users.find(u => u.username === username);
      if (usernameExists) {
        return NextResponse.json({ success: false, message: 'Username sudah digunakan!' }, { status: 400 });
      }

      const userExists = users.find(u => u.email === email);
      if (userExists) {
        return NextResponse.json({ success: false, message: 'Email sudah terdaftar!' }, { status: 400 });
      }

      const newUser = {
        id: newId,
        username,
        name,
        email,
        password,
        role_id: 1,
        role: 'customer',
        phone: '',
        createdAt: now
      };

      await writeData('users', [...users, newUser]);

      return NextResponse.json({ 
        success: true, 
        message: 'Registrasi berhasil!',
        user: { id: newUser.id, username: newUser.username, name: newUser.name, email: newUser.email, role: newUser.role }
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error di API Register:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}