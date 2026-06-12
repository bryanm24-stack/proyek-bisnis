import { NextResponse } from 'next/server';
import { query } from '@/lib/db';


import { readData, writeData } from '@/lib/storage';
// Helper: Normalize ID for consistent comparison
const normalizeId = (id) => String(id || '').trim();
const SERVICE_FAVORITE_TYPE = 'service';
const SUPPORTED_FAVORITE_TYPES = [SERVICE_FAVORITE_TYPE];

async function getFavoritesByUser(userId) {
  const result = await query(
    'SELECT id, user_id AS userId, service_id AS serviceId, created_at AS createdAt FROM favorites WHERE user_id = ? ORDER BY created_at',
    [userId]
  );
  return result;
}

async function findFavorite(userId, serviceId) {
  const result = await query(
    'SELECT id, user_id AS userId, service_id AS serviceId, created_at AS createdAt FROM favorites WHERE user_id = ? AND service_id = ? LIMIT 1',
    [userId, serviceId]
  );
  return result[0];
}

async function insertFavorite(userId, serviceId) {
  const id = `fav_${Date.now()}`;
  await query('INSERT INTO favorites (id, user_id, service_id) VALUES (?, ?, ?)', [id, userId, serviceId]);
  return { id, userId, serviceId, createdAt: new Date().toISOString() };
}

async function removeFavorite(userId, serviceId) {
  const result = await query('DELETE FROM favorites WHERE user_id = ? AND service_id = ?', [userId, serviceId]);
  return result.affectedRows || 0;
}

// GET - Fetch user's favorites
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId diperlukan' },
        { status: 400 }
      );
    }

    const userFavorites = await getFavoritesByUser(userId);

    return NextResponse.json(
      {
        success: true,
        data: userFavorites,
        count: userFavorites.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST - Add or toggle favorite
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, serviceId, type } = body;

    if (!userId || !type || !serviceId) {
      return NextResponse.json(
        { success: false, message: 'userId, type, dan serviceId diperlukan' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_FAVORITE_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, message: "Hanya type 'service' yang didukung untuk SQL favorites" },
        { status: 400 }
      );
    }

    const itemId = serviceId;
    const existingFavorite = await findFavorite(userId, itemId);

    if (existingFavorite) {
      const deletedCount = await removeFavorite(userId, itemId);
      return NextResponse.json(
        {
          success: true,
          message: 'Layanan dihapus dari favorit',
          isFavorite: false,
          deletedCount
        },
        { status: 200 }
      );
    }

    const newFavorite = await insertFavorite(userId, itemId);
    return NextResponse.json(
      {
        success: true,
        message: 'Layanan ditambahkan ke favorit',
        data: newFavorite,
        isFavorite: true
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error managing favorite:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE - Remove favorite
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { userId, serviceId, type } = body;

    if (!userId || !type || !serviceId) {
      return NextResponse.json(
        { success: false, message: 'userId, type, dan serviceId diperlukan' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_FAVORITE_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, message: "Hanya type 'service' yang didukung untuk SQL favorites" },
        { status: 400 }
      );
    }

    const deletedCount = await removeFavorite(userId, serviceId);
    if (deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Favorite tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Layanan dihapus dari favorit'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
