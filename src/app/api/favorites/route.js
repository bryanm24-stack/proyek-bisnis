import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Helper: Normalize ID for consistent comparison
const normalizeId = (id) => String(id || '').trim();

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

    const favoritesPath = path.join(process.cwd(), 'favorites.json');
    const data = await fs.readFile(favoritesPath, 'utf-8');
    const favorites = JSON.parse(data);

    // Filter favorites by userId
    const userFavorites = favorites.filter(
      (fav) => normalizeId(fav.userId) === normalizeId(userId)
    );

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
    const { userId, serviceId, vendorId, type } = body;

    if (!userId || !type || (!serviceId && !vendorId)) {
      return NextResponse.json(
        { success: false, message: 'userId, type, dan serviceId/vendorId diperlukan' },
        { status: 400 }
      );
    }

    // type harus 'service' atau 'vendor'
    if (!['service', 'vendor'].includes(type)) {
      return NextResponse.json(
        { success: false, message: "type harus 'service' atau 'vendor'" },
        { status: 400 }
      );
    }

    const favoritesPath = path.join(process.cwd(), 'favorites.json');
    const data = await fs.readFile(favoritesPath, 'utf-8');
    const favorites = JSON.parse(data);

    const itemId = type === 'service' ? serviceId : vendorId;

    // Cek apakah sudah di-favorite
    const existingFavorite = favorites.find(
      (fav) =>
        normalizeId(fav.userId) === normalizeId(userId) &&
        normalizeId(fav[type === 'service' ? 'serviceId' : 'vendorId']) === normalizeId(itemId)
    );

    if (existingFavorite) {
      // Hapus favorite (toggle off)
      const updatedFavorites = favorites.filter(
        (fav) =>
          !(
            normalizeId(fav.userId) === normalizeId(userId) &&
            normalizeId(fav[type === 'service' ? 'serviceId' : 'vendorId']) === normalizeId(itemId)
          )
      );

      await fs.writeFile(
        favoritesPath,
        JSON.stringify(updatedFavorites, null, 2)
      );

      return NextResponse.json(
        {
          success: true,
          message: `${type === 'service' ? 'Layanan' : 'Vendor'} dihapus dari favorit`,
          isFavorite: false
        },
        { status: 200 }
      );
    } else {
      // Tambah favorite
      const newFavorite = {
        id: `fav_${Date.now()}`,
        userId,
        ...(type === 'service' ? { serviceId } : { vendorId }),
        type,
        createdAt: new Date().toISOString()
      };

      favorites.push(newFavorite);
      await fs.writeFile(
        favoritesPath,
        JSON.stringify(favorites, null, 2)
      );

      return NextResponse.json(
        {
          success: true,
          message: `${type === 'service' ? 'Layanan' : 'Vendor'} ditambahkan ke favorit`,
          data: newFavorite,
          isFavorite: true
        },
        { status: 201 }
      );
    }
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
    const { userId, serviceId, vendorId, type } = body;

    if (!userId || !type || (!serviceId && !vendorId)) {
      return NextResponse.json(
        { success: false, message: 'userId, type, dan serviceId/vendorId diperlukan' },
        { status: 400 }
      );
    }

    const favoritesPath = path.join(process.cwd(), 'favorites.json');
    const data = await fs.readFile(favoritesPath, 'utf-8');
    let favorites = JSON.parse(data);

    const itemId = type === 'service' ? serviceId : vendorId;

    const favoriteCount = favorites.length;
    favorites = favorites.filter(
      (fav) =>
        !(
          normalizeId(fav.userId) === normalizeId(userId) &&
          normalizeId(fav[type === 'service' ? 'serviceId' : 'vendorId']) === normalizeId(itemId)
        )
    );

    if (favorites.length === favoriteCount) {
      return NextResponse.json(
        { success: false, message: 'Favorite tidak ditemukan' },
        { status: 404 }
      );
    }

    await fs.writeFile(
      favoritesPath,
      JSON.stringify(favorites, null, 2)
    );

    return NextResponse.json(
      {
        success: true,
        message: `${type === 'service' ? 'Layanan' : 'Vendor'} dihapus dari favorit`
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
