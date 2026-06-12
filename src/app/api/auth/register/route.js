import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
export async function POST(request) {
  try {
    const body = await request.json(); // Ambil data dari form React
    const { username, name, email, password } = body;

    // Lokasi file users.json di root folder
    
    const users = await readData('users');

    // Cek apakah username sudah terdaftar
    const usernameExists = users.find(u => u.username === username);
    if (usernameExists) {
      return NextResponse.json({ success: false, message: 'Username sudah digunakan!' }, { status: 400 });
    }

    // Cek apakah email sudah terdaftar
    const userExists = users.find(u => u.email === email);
    if (userExists) {
      return NextResponse.json({ success: false, message: 'Email sudah terdaftar!' }, { status: 400 });
    }

    // Generate ID terurut (cari ID maksimal, kemudian +1)
    const maxId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.id) || 0)) : 0;
    const newId = (maxId + 1).toString();

    // Tambahkan user baru
    const newUser = {
      id: newId,
      username,
      name,
      email,
      password, // Di dunia nyata password harus di-hash (misal pakai bcrypt), tapi ini gapapa untuk belajar
      role: 'customer',
      phone: '',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);

    // Simpan kembali ke file
    await writeData('users', users);

    return NextResponse.json({ 
      success: true, 
      message: 'Registrasi berhasil!',
      user: { id: newUser.id, username: newUser.username, name: newUser.name, email: newUser.email, role: newUser.role }
    }, { status: 201 });
  } catch (error) {
    console.error('Error di API Register:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}