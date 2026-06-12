// JANGAN ADA 'use client' DI SINI!
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';


import { readData, writeData } from '@/lib/storage';
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email dan password harus diisi!' }, { status: 400 });
    }

    // Try DB first
    try {
      const res = await query('SELECT id, name, email, role FROM users WHERE email = $1 AND password = $2 LIMIT 1', [email, password]);
      const user = res.rows[0];
      if (!user) {
        // fallthrough to file-check for compatibility
        throw new Error('User not found in DB');
      }

      return NextResponse.json({
        success: true,
        message: 'Login berhasil!',
        user: {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role
        }
      }, { status: 200 });
    } catch (dbErr) {
      // fallback to JSON file for local/dev if DB not available or user not found
      const users = await readData('users');

      const user = users.find(u => u.email === email && u.password === password);

      if (!user) {
        return NextResponse.json({ success: false, message: 'Email atau password salah!' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        message: 'Login berhasil!',
        user: {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role
        }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan server: ' + error.message 
    }, { status: 500 });
  }
}