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
      let res;
      try {
        res = await query(
          'SELECT id, name, email, role, phone, bankName, accountNumber, accountHolder, ktp_status FROM users WHERE email = ? AND password = ? LIMIT 1',
          [email, password]
        );
      } catch (columnErr) {
        // Fallback if bank/ktp columns don't exist (legacy DB)
        console.log('Bank/KTP columns not found, trying without them');
        res = await query(
          'SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ? LIMIT 1',
          [email, password]
        );
      }
      
      const user = Array.isArray(res) ? res[0] : undefined;
      if (!user) {
        throw new Error('User not found in DB');
      }

      return NextResponse.json({
        success: true,
        message: 'Login berhasil!',
        user: {
          id: String(user.id),
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          bankName: user.bankName || '',
          accountNumber: user.accountNumber || '',
          accountHolder: user.accountHolder || '',
          ktp_status: user.ktp_status || 'not_submitted',
          role: user.role
        }
      }, { status: 200 });
    } catch (dbErr) {
      // fallback to JSON storage for local/dev if DB is unavailable or user is not found
      const users = await readData('users');
      const user = users.find((u) => u.email === email && u.password === password);

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
          bankName: user.bankName || '',
          accountNumber: user.accountNumber || '',
          accountHolder: user.accountHolder || '',
          ktp_status: user.ktp_status || 'not_submitted',
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