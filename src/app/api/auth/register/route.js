import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json(); // Ambil data dari form React
    const { name, email, password } = body;

    // Lokasi file users.json di root folder
    const filePath = path.join(process.cwd(), 'users.json');
    
    // Baca isi file
    const fileData = await fs.readFile(filePath, 'utf-8');
    const users = JSON.parse(fileData);

    // Cek apakah email sudah terdaftar
    const userExists = users.find(u => u.email === email);
    if (userExists) {
      return NextResponse.json({ success: false, message: 'Email sudah terdaftar!' }, { status: 400 });
    }

    // Tambahkan user baru
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password, // Di dunia nyata password harus di-hash (misal pakai bcrypt), tapi ini gapapa untuk belajar
      role: 'member'
    };
    users.push(newUser);

    // Simpan kembali ke file
    await fs.writeFile(filePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ success: true, message: 'Registrasi berhasil!' }, { status: 201 });
  } catch (error) {
    console.error('Error di API Register:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}