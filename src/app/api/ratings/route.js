import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

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

    const ratingsPath = path.join(process.cwd(), 'ratings.json');
    const servicesPath = path.join(process.cwd(), 'services.json');
    const dealsPath = path.join(process.cwd(), 'deals.json');
    const chatsPath = path.join(process.cwd(), 'chats.json');
    const usersPath = path.join(process.cwd(), 'users.json');

    const ratingsData = await fs.readFile(ratingsPath, 'utf-8');
    const ratings = JSON.parse(ratingsData.trim());
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    const services = JSON.parse(servicesData.trim());

    // Cari service
    const service = services.find(s => s.id === serviceId);
    if (!service) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    const serviceType = String(service.type || 'barang').toLowerCase();

    // Check duplikasi rating per siklus deal; fallback ke service untuk data lama tanpa dealId.
    const existingRating = dealId
      ? ratings.find(
          (r) => String(r.customerId) === String(customerId) && String(r.dealId || '') === String(dealId)
        )
      : ratings.find(
          (r) => String(r.serviceId) === String(serviceId) && String(r.customerId) === String(customerId) && !r.dealId
        );

    if (existingRating) {
      return NextResponse.json({
        success: false,
        message: dealId
          ? 'Anda sudah memberikan rating untuk transaksi ini'
          : 'Anda sudah memberikan rating untuk layanan ini'
      }, { status: 400 });
    }

    // Buat rating baru
    const newRating = {
      id: Date.now().toString(),
      serviceId,
      customerId,
      vendorId,
      dealId: dealId || null,
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

    // Update deal ratingCompleted if dealId provided
    let updatedDeal = null;
    let updatedChat = null;
    let chatResetAfterRating = false;
    if (dealId) {
      try {
        const dealsData = await fs.readFile(dealsPath, 'utf-8');
        const deals = JSON.parse(dealsData.trim());
        const deal = deals.find(d => d.id === dealId);
        if (deal) {
          deal.ratingCompleted = true;
          updatedDeal = deal;

          const shouldResetForNewCycle = serviceType === 'barang';

          // Barang: setelah rating, buka kembali deal/chat agar siap siklus beli berikutnya.
          const usersData = await fs.readFile(usersPath, 'utf-8');
          const users = JSON.parse(usersData.trim());
          const customerUser = users.find((u) => String(u.id) === String(deal.customerId));
          const vendorUser = users.find((u) => String(u.id) === String(deal.vendorId));
          const isVendorToVendor = customerUser?.role === 'vendor' && vendorUser?.role === 'vendor';

          if ((shouldResetForNewCycle || isVendorToVendor) && deal.chatId) {
            const chatsData = await fs.readFile(chatsPath, 'utf-8');
            const chats = JSON.parse(chatsData.trim());
            const chat = chats.find((c) => String(c.id) === String(deal.chatId));

            if (chat) {
              chat.dealStatus = 'pending';
              chat.closedAt = null;
              chat.closedReason = null;
              await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));
              updatedChat = chat;
              chatResetAfterRating = true;
            }
          }

          await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));
        }
      } catch (e) {
        console.warn('Could not update deal ratingCompleted:', e);
      }
    }

    // Simpan perubahan
    await fs.writeFile(ratingsPath, JSON.stringify(ratings, null, 2));
    await fs.writeFile(servicesPath, JSON.stringify(services, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Rating berhasil disimpan',
      data: {
        rating: newRating,
        updatedService: service,
        updatedDeal,
        updatedChat,
        chatResetAfterRating
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

    const ratingsPath = path.join(process.cwd(), 'ratings.json');
    const servicesPath = path.join(process.cwd(), 'services.json');

    const ratingsData = await fs.readFile(ratingsPath, 'utf-8');
    const ratings = JSON.parse(ratingsData.trim());
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    const services = JSON.parse(servicesData.trim());

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

    await fs.writeFile(ratingsPath, JSON.stringify(ratings, null, 2));

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

    const ratingsPath = path.join(process.cwd(), 'ratings.json');
    const usersPath = path.join(process.cwd(), 'users.json');
    const ratingsData = await fs.readFile(ratingsPath, 'utf-8');
    const ratings = JSON.parse(ratingsData.trim());
    const usersData = await fs.readFile(usersPath, 'utf-8');
    const users = JSON.parse(usersData.trim());

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
