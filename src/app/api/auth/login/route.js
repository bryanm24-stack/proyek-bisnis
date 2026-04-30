// JANGAN ADA 'use client' DI SINI!
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email dan password harus diisi!' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'users.json');
    let fileData = await fs.readFile(filePath, 'utf-8');
    // Remove BOM if present
    fileData = fileData.replace(/^\uFEFF/, '').trim();
    const users = JSON.parse(fileData);

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return NextResponse.json({ success: false, message: 'Email atau password salah!' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Login berhasil!',
      user: { 
        id: String(user.id),  // ← Ensure ID is always string
        name: user.name, 
        email: user.email, 
        role: user.role 
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan server: ' + error.message 
    }, { status: 500 });
  }
}