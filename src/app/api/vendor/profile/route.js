import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const normalizeVendorProfile = (row) => {
  if (!row) return null;
  return {
    vendorId: row.vendor_id,
    userName: row.user_name,
    vendorName: row.vendor_name || row.user_name || '',
    vendorLogo: row.vendor_logo || null,
    vendorAddress: row.vendor_address || '',
    vendorBio: row.vendor_bio || '',
    isOnline: Boolean(row.is_online),
    lastActiveAt: row.last_active_at || null,
    memberSince: row.joined_at || row.user_created_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    totalServices: Number(row.total_services || 0),
    totalRentCount: Number(row.total_rent_count || 0),
    averageRating: Number(row.average_rating || 0),
    totalReviews: Number(row.total_reviews || 0)
  };
};

async function ensureVendorProfilesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_profiles (
      vendor_id VARCHAR(255) PRIMARY KEY,
      vendor_name VARCHAR(255),
      vendor_logo TEXT,
      vendor_address TEXT,
      vendor_bio TEXT,
      is_online BOOLEAN DEFAULT false,
      last_active_at DATETIME(3),
      joined_at DATETIME(3),
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ success: false, message: 'vendorId diperlukan.' }, { status: 400 });
    }

    await ensureVendorProfilesTable();

    const rows = await query(
      `SELECT
         u.id AS vendor_id,
         u.name AS user_name,
         u.created_at AS user_created_at,
         vp.vendor_name,
         vp.vendor_logo,
         vp.vendor_address,
         vp.vendor_bio,
         vp.is_online,
         vp.last_active_at,
         vp.joined_at,
         vp.created_at,
         vp.updated_at,
         COALESCE((SELECT COUNT(*) FROM services s2 WHERE s2.vendor_id = u.id), 0) AS total_services,
         COALESCE((SELECT SUM(rent_count) FROM services s2 WHERE s2.vendor_id = u.id), 0) AS total_rent_count,
         COALESCE((SELECT COUNT(*) FROM ratings r2 WHERE r2.vendor_id = u.id), 0) AS total_reviews,
         COALESCE((SELECT ROUND(AVG(rating), 1) FROM ratings r2 WHERE r2.vendor_id = u.id), 0) AS average_rating
       FROM users u
       LEFT JOIN vendor_profiles vp ON vp.vendor_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [vendorId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: normalizeVendorProfile(rows[0]) }, { status: 200 });
  } catch (error) {
    console.error('Error di API Vendor Profile GET:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { vendorId, vendorName, vendorLogo, vendorAddress, vendorBio, isOnline } = body;

    if (!vendorId) {
      return NextResponse.json({ success: false, message: 'vendorId diperlukan.' }, { status: 400 });
    }

    await ensureVendorProfilesTable();

    const users = await query('SELECT id, role, name FROM users WHERE id = ? LIMIT 1', [vendorId]);
    if (!users || users.length === 0 || String(users[0].role) !== 'vendor') {
      return NextResponse.json({ success: false, message: 'Vendor tidak ditemukan atau tidak berhak.' }, { status: 404 });
    }

    const existing = await query('SELECT vendor_id FROM vendor_profiles WHERE vendor_id = ? LIMIT 1', [vendorId]);
    const now = new Date().toISOString();
    const normalizedLogo = typeof vendorLogo === 'string' ? vendorLogo.trim() : null;

    if (existing && existing.length > 0) {
      await query(
        `UPDATE vendor_profiles
         SET vendor_name = ?, vendor_logo = ?, vendor_address = ?, vendor_bio = ?, is_online = ?, last_active_at = ?, updated_at = ?
         WHERE vendor_id = ?`,
        [
          vendorName || users[0].name,
          normalizedLogo || null,
          vendorAddress || null,
          vendorBio || null,
          Boolean(isOnline),
          now,
          now,
          vendorId
        ]
      );
    } else {
      await query(
        `INSERT INTO vendor_profiles (
           vendor_id, vendor_name, vendor_logo, vendor_address, vendor_bio,
           is_online, last_active_at, joined_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId,
          vendorName || users[0].name,
          normalizedLogo || null,
          vendorAddress || null,
          vendorBio || null,
          Boolean(isOnline),
          now,
          now,
          now,
          now
        ]
      );
    }

    const updatedRows = await query(
      `SELECT
         u.id AS vendor_id,
         u.name AS user_name,
         u.created_at AS user_created_at,
         vp.vendor_name,
         vp.vendor_logo,
         vp.vendor_address,
         vp.vendor_bio,
         vp.is_online,
         vp.last_active_at,
         vp.joined_at,
         vp.created_at,
         vp.updated_at,
         COALESCE((SELECT COUNT(*) FROM services s2 WHERE s2.vendor_id = u.id), 0) AS total_services,
         COALESCE((SELECT SUM(rent_count) FROM services s2 WHERE s2.vendor_id = u.id), 0) AS total_rent_count,
         COALESCE((SELECT COUNT(*) FROM ratings r2 WHERE r2.vendor_id = u.id), 0) AS total_reviews,
         COALESCE((SELECT ROUND(AVG(rating), 1) FROM ratings r2 WHERE r2.vendor_id = u.id), 0) AS average_rating
       FROM users u
       LEFT JOIN vendor_profiles vp ON vp.vendor_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [vendorId]
    );

    return NextResponse.json({ success: true, message: 'Profil vendor berhasil disimpan.', data: normalizeVendorProfile(updatedRows[0]) }, { status: 200 });
  } catch (error) {
    console.error('Error di API Vendor Profile PUT:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
