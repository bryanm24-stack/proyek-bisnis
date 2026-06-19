import { NextResponse } from 'next/server';

import { query } from '@/lib/db';

import { readData, writeData } from '@/lib/storage';
// POST - Submit rating and increment rentCount
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, customerId, vendorId, rating, review, dealId } = body;

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

    // SQL-first: resolve service id from payload or deal
    let resolvedServiceId = serviceId ? String(serviceId) : null;
    if (!resolvedServiceId && dealId) {
      const dealRows = await query('SELECT service_id FROM deals WHERE id = ? LIMIT 1', [String(dealId)]);
      resolvedServiceId = dealRows[0]?.service_id ? String(dealRows[0].service_id) : null;
    }

    if (!resolvedServiceId) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    const serviceRows = await query('SELECT id, rating, rent_count FROM services WHERE id = ? LIMIT 1', [resolvedServiceId]);
    if (serviceRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    // Cek duplikasi rating berdasarkan deal (prioritas) atau service legacy
    let duplicateRows = [];
    if (dealId) {
      duplicateRows = await query(
        'SELECT id FROM ratings WHERE customer_id = ? AND deal_id = ? LIMIT 1',
        [String(customerId), String(dealId)]
      );
    } else {
      duplicateRows = await query(
        'SELECT id FROM ratings WHERE customer_id = ? AND service_id = ? AND (deal_id IS NULL OR deal_id = "") LIMIT 1',
        [String(customerId), resolvedServiceId]
      );
    }

    if (duplicateRows.length > 0) {
      return NextResponse.json({
        success: false,
        message: dealId
          ? 'Anda sudah memberikan rating untuk transaksi ini'
          : 'Anda sudah memberikan rating untuk layanan ini'
      }, { status: 400 });
    }

    const newRating = {
      id: Date.now().toString(),
      serviceId: resolvedServiceId,
      customerId,
      vendorId,
      dealId: dealId || null,
      rating: parseInt(rating),
      review: review || '',
      createdAt: new Date().toISOString()
    };

    await query(
      `INSERT INTO ratings (id, service_id, customer_id, vendor_id, rating, review, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [
        newRating.id,
        resolvedServiceId,
        String(customerId),
        String(vendorId),
        Number(newRating.rating),
        newRating.review,
        newRating.createdAt
      ]
    );

    const aggregate = await query(
      'SELECT COUNT(*) AS total, AVG(rating) AS avg_rating FROM ratings WHERE service_id = ?',
      [resolvedServiceId]
    );
    const total = Number(aggregate[0]?.total || 0);
    const avgRating = Number(aggregate[0]?.avg_rating || 0);

    await query(
      'UPDATE services SET rent_count = ?, rating = ? WHERE id = ?',
      [total, Number(avgRating.toFixed(1)), resolvedServiceId]
    );

    return NextResponse.json({
      success: true,
      message: 'Rating berhasil disimpan',
      data: {
        rating: newRating
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

// PUT - Vendor reply to a rating
export async function PUT(request) {
  try {
    const body = await request.json();
    const { ratingId, vendorId, serviceId, reply } = body;

    if (!ratingId || !vendorId || !serviceId) {
      return NextResponse.json({
        success: false,
        message: 'ratingId, vendorId, dan serviceId wajib diisi!'
      }, { status: 400 });
    }


    const ratings = await readData('ratings');
    const services = await readData('services');

    const service = services.find((item) => item.id === serviceId);
    if (!service || service.vendorId !== vendorId) {
      return NextResponse.json({
        success: false,
        message: 'Vendor tidak memiliki akses ke rating ini'
      }, { status: 403 });
    }

    const targetRating = ratings.find((item) => item.id === ratingId && item.serviceId === serviceId);
    if (!targetRating) {
      return NextResponse.json({
        success: false,
        message: 'Rating tidak ditemukan'
      }, { status: 404 });
    }

    targetRating.vendorReply = (reply || '').trim();
    targetRating.vendorReplyAt = targetRating.vendorReply ? new Date().toISOString() : null;
    targetRating.vendorReplyBy = vendorId;

    await writeData('rating', ratings);

    return NextResponse.json({
      success: true,
      message: 'Balasan vendor berhasil disimpan',
      data: targetRating
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving vendor reply:', error);
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

    const ratings = await readData('ratings');
    const users = await readData('users');

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
