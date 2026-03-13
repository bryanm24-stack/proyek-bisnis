// JANGAN ADA 'use client' DI SINI!
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const filePath = path.join(process.cwd(), 'users.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const users = JSON.parse(fileData);

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return NextResponse.json({ success: false, message: 'Email atau password salah!' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Login berhasil!',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}