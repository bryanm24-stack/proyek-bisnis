import { NextResponse } from 'next/server';


import { readData, writeData, deleteData } from '@/lib/storage';

async function readPromos() {
  try {
    const raw = await readData('promos');
    const parsed = raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePromos(promos) {
  try {
    const result = await writeData('promos', promos);
    console.debug('promos API: writeData result for promos:', result);
    return result;
  } catch (err) {
    console.error('promos API: writePromos error:', err);
    throw err;
  }
}

async function readTransactions() {
  try {
    const raw = await readData('transactions');
    const parsed = raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toValidDate(value) {
  if (!value) return null;
  let normalized = value;
  if (typeof normalized === 'string') {
    normalized = normalized.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
      normalized = `${normalized.replace(' ', 'T')}Z`;
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(normalized) && !normalized.endsWith('Z')) {
      normalized = `${normalized.replace(/Z?$/, '')}Z`;
    }
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePromo(promo, now = Date.now()) {
  const startAtDate = toValidDate(promo.startAt);
  const endAtDate = toValidDate(promo.endAt);
  const claimedUserIds = Array.isArray(promo.claimedUserIds)
    ? promo.claimedUserIds.map((userId) => String(userId))
    : [];
  const maxApplicants = promo.maxApplicants === undefined || promo.maxApplicants === null || promo.maxApplicants === ''
    ? null
    : Number(promo.maxApplicants);
  const claimedCount = Number.isFinite(Number(promo.claimedCount))
    ? Number(promo.claimedCount)
    : claimedUserIds.length;
  const hasStarted = !startAtDate || startAtDate.getTime() <= now;
  const hasEnded = !endAtDate || endAtDate.getTime() >= now;
  const remainingApplicants = Number.isFinite(maxApplicants)
    ? Math.max(0, maxApplicants - claimedCount)
    : null;

  return {
    ...promo,
    startAt: startAtDate ? startAtDate.toISOString() : (promo.startAt || null),
    endAt: endAtDate ? endAtDate.toISOString() : (promo.endAt || null),
    maxApplicants: Number.isFinite(maxApplicants) ? maxApplicants : null,
    claimedCount,
    claimedUserIds,
    remainingApplicants,
    isUpcoming: Boolean(startAtDate && startAtDate.getTime() > now),
    isExpired: Boolean(endAtDate && endAtDate.getTime() < now),
    isActiveNow: promo.active !== false && hasStarted && hasEnded && (remainingApplicants === null || remainingApplicants > 0)
  };
}



export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const active = searchParams.get('active');
    const promoId = searchParams.get('promoId');
    const userId = searchParams.get('userId');

    const transactions = userId ? await readTransactions() : [];
    let promos = (await readPromos()).map((promo) => {
      const normalizedPromo = normalizePromo(promo);

      if (userId) {
        const hasClaimedInTransactions = transactions.some(
          (transaction) =>
            String(transaction.promoId) === String(promo.id) &&
            String(transaction.userId) === String(userId) &&
            transaction.status === 'success'
        );

        normalizedPromo.userHasClaimed = normalizedPromo.claimedUserIds.includes(String(userId)) || hasClaimedInTransactions;
      }

      return normalizedPromo;
    });

    if (promoId) {
      promos = promos.filter((promo) => String(promo.id) === String(promoId));
    }

    if (vendorId) {
      // Compare as strings to handle both number and string IDs from database
      promos = promos.filter((promo) => String(promo.vendorId) === String(vendorId));
    }

    if (active === 'true') {
      promos = promos.filter((promo) => promo.isActiveNow);
    }

    promos.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

    return NextResponse.json({ success: true, data: promos }, { status: 200 });
  } catch (error) {
    console.error('Error reading promos:', error);
    return NextResponse.json({ success: false, message: 'Gagal membaca promo.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const rawText = await request.text();
    console.debug('promos POST raw body:', rawText);
    let body;
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch (parseErr) {
      console.error('JSON parse error in promos POST:', parseErr.message);
      console.error('Raw body was:', rawText);
      return NextResponse.json({
        success: false,
        message: `Invalid JSON: ${parseErr.message}`
      }, { status: 400 });
    }
    const {
      vendorId,
      vendorName,
      title,
      image,
      promoPrice,
      description,
      active = true,
      startAt,
      endAt,
      maxApplicants
    } = body;

    // Validasi required fields
    if (!vendorId || !vendorName || !title || !image || promoPrice === undefined) {
      return NextResponse.json({
        success: false,
        message: 'vendorId, vendorName, title, image, dan promoPrice wajib diisi.'
      }, { status: 400 });
    }

    const parsedPrice = Number.parseInt(promoPrice, 10);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({
        success: false,
        message: 'promoPrice harus berupa angka lebih dari 0.'
      }, { status: 400 });
    }

    const startDate = toValidDate(startAt);
    const endDate = toValidDate(endAt);

    if (startAt && !startDate) {
      return NextResponse.json({
        success: false,
        message: 'Format startAt tidak valid.'
      }, { status: 400 });
    }

    if (endAt && !endDate) {
      return NextResponse.json({
        success: false,
        message: 'Format endAt tidak valid.'
      }, { status: 400 });
    }

    if (startDate && endDate && startDate >= endDate) {
      return NextResponse.json({
        success: false,
        message: 'Tanggal promo selesai harus lebih besar dari tanggal mulai.'
      }, { status: 400 });
    }

    const parsedMaxApplicants = maxApplicants === undefined || maxApplicants === null || maxApplicants === ''
      ? null
      : Number(maxApplicants);

    if (parsedMaxApplicants !== null && (!Number.isInteger(parsedMaxApplicants) || parsedMaxApplicants <= 0)) {
      return NextResponse.json({
        success: false,
        message: 'Limit applicant harus berupa angka bulat lebih dari 0.'
      }, { status: 400 });
    }

    const promos = await readPromos();
    const newPromo = {
      id: Date.now().toString(),
      vendorId,
      vendorName,
      title: String(title || '').trim(),
      image: String(image || '').trim(),
      promoPrice: parsedPrice,
      description: String(description || '').trim(),
      active: Boolean(active),
      startAt: startDate ? startDate.toISOString() : null,
      endAt: endDate ? endDate.toISOString() : null,
      maxApplicants: parsedMaxApplicants,
      claimLimitPerUser: 1,
      claimedCount: 0,
      claimedUserIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    promos.push(newPromo);
    await writePromos(promos);

    return NextResponse.json({ success: true, message: 'Promo berhasil dibuat.', data: newPromo }, { status: 201 });
  } catch (error) {
    console.error('Error creating promo:', error);
    const message = error && error.message ? String(error.message) : 'Gagal membuat promo.';
    const stack = error && error.stack ? String(error.stack) : '';
    return NextResponse.json({ success: false, message: `${message}\n${stack}` }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const promoIdFromQuery = searchParams.get('id') || searchParams.get('promoId');
    const vendorIdFromQuery = searchParams.get('vendorId');

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const promoId = promoIdFromQuery || body.promoId || body.id;
    const vendorId = vendorIdFromQuery || body.vendorId;

    if (!promoId || !vendorId) {
      return NextResponse.json({
        success: false,
        message: 'promoId dan vendorId wajib diisi.'
      }, { status: 400 });
    }

    const promos = await readPromos();
    const promoIndex = promos.findIndex((promo) => String(promo.id) === String(promoId));

    if (promoIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Promo tidak ditemukan.'
      }, { status: 404 });
    }

    if (String(promos[promoIndex].vendorId) !== String(vendorId)) {
      return NextResponse.json({
        success: false,
        message: 'Anda tidak berhak menghapus promo ini.'
      }, { status: 403 });
    }

    const [deletedPromo] = promos.splice(promoIndex, 1);
    try {
      await deleteData('promos', { id: deletedPromo.id });
    } catch (err) {
      console.error('Error deleting promo from SQL:', err);
      return NextResponse.json({
        success: false,
        message: 'Gagal menghapus promo dari database.'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Promo berhasil dihapus.',
      data: deletedPromo
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting promo:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus promo.' }, { status: 500 });
  }
}