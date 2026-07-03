import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, name, email, password } = body;

    if (!username || !name || !email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Semua field wajib diisi!' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Format email tidak valid!' 
      }, { status: 400 });
    }

    // Validate username (alphanumeric, min 3 chars)
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Username minimal 3 karakter, hanya huruf, angka, dan underscore' 
      }, { status: 400 });
    }

    // Validate password strength (min 6 chars)
    if (password.length < 6) {
      return NextResponse.json({ 
        success: false, 
        message: 'Password minimal 6 karakter' 
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newId = Date.now().toString();

    // Check if username or email already exists
    const existingUsers = await query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.username === username) {
        return NextResponse.json({ 
          success: false, 
          message: 'Username sudah digunakan!' 
        }, { status: 400 });
      }
      if (existing.email === email) {
        return NextResponse.json({ 
          success: false, 
          message: 'Email sudah terdaftar!' 
        }, { status: 400 });
      }
    }

    // Insert new user
    await query(
      `INSERT INTO users (id, username, password, name, role_id, role, email, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, username, password, name, 1, 'customer', email, '', now]
    );

    // Verify insert was successful
    const newUser = await query(
      'SELECT id, username, name, email, role FROM users WHERE id = ? LIMIT 1',
      [newId]
    );

    if (!newUser || newUser.length === 0) {
      throw new Error('Failed to retrieve newly created user');
    }

    console.log(`[REGISTER] User ${newId} (${email}) successfully registered in SQL database`);

    return NextResponse.json({ 
      success: true, 
      message: 'Registrasi berhasil!',
      user: {
        id: String(newUser[0].id),
        username: newUser[0].username,
        name: newUser[0].name,
        email: newUser[0].email,
        phone: newUser[0].phone || '',
        role: newUser[0].role
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error di API Register:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan server: ' + error.message
    }, { status: 500 });
  }
}