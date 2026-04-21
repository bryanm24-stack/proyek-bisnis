import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// POST - Submit rating and increment rentCount
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, customerId, vendorId, rating, review } = body;

    if (!serviceId || !customerId || !vendorId || !rating) {
      return NextResponse.json({
        success: false,
        message: 'serviceId, customerId, vendorId, dan rating wajib diisi!'
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        message: 'Rating harus antara 1-5'
      }, { status: 400 });
    }

    const ratingsPath = path.join(process.cwd(), 'ratings.json');
    const servicesPath = path.join(process.cwd(), 'services.json');

    const ratingsData = await fs.readFile(ratingsPath, 'utf-8');
    const ratings = JSON.parse(ratingsData);
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    const services = JSON.parse(servicesData);

    // Cari service
    const service = services.find(s => s.id === serviceId);
    if (!service) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    // Check apakah user sudah rating service yang sama
    const existingRating = ratings.find(
      r => r.serviceId === serviceId && r.customerId === customerId
    );

    if (existingRating) {
      return NextResponse.json({
        success: false,
        message: 'Anda sudah memberikan rating untuk layanan ini'
      }, { status: 400 });
    }

    // Buat rating baru
    const newRating = {
      id: Date.now().toString(),
      serviceId,
      customerId,
      vendorId,
      rating: parseInt(rating),
      review: review || '',
      createdAt: new Date().toISOString()
    };

    ratings.push(newRating);

    // Update rentCount dan rating di service
    const currentRating = parseFloat(service.rating) || 5.0;
    const currentRentCount = parseInt(service.rentCount) || 0;
    const totalRatings = ratings.filter(r => r.serviceId === serviceId).length;
    
    // Hitung rata-rata rating baru
    const allRatingsForService = ratings.filter(r => r.serviceId === serviceId);
    const totalRatingScore = allRatingsForService.reduce((sum, r) => sum + r.rating, 0);
    const newAverageRating = (totalRatingScore / allRatingsForService.length).toFixed(1);

    service.rentCount = (currentRentCount + 1).toString();
    service.rating = parseFloat(newAverageRating);

    // Simpan perubahan
    await fs.writeFile(ratingsPath, JSON.stringify(ratings, null, 2));
    await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Rating berhasil disimpan',
      data: {
        rating: newRating,
        updatedService: service
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// GET - Get ratings for a service
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId diperlukan'
      }, { status: 400 });
    }

    const ratingsPath = path.join(process.cwd(), 'ratings.json');
    const usersPath = path.join(process.cwd(), 'users.json');
    const ratingsData = await fs.readFile(ratingsPath, 'utf-8');
    const ratings = JSON.parse(ratingsData);
    const usersData = await fs.readFile(usersPath, 'utf-8');
    const users = JSON.parse(usersData);

    const serviceRatings = ratings
      .filter(r => r.serviceId === serviceId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((ratingItem) => {
        const customer = users.find((u) => u.id === ratingItem.customerId);
        return {
          ...ratingItem,
          customerName: customer?.name || 'Customer'
        };
      });

    return NextResponse.json({
      success: true,
      data: serviceRatings
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting ratings:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
