import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const promosPath = path.join(process.cwd(), 'promos.json');
const transactionsPath = path.join(process.cwd(), 'transactions.json');

async function readPromos() {
  try {
    const raw = await fs.readFile(promosPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePromos(promos) {
  await fs.writeFile(promosPath, JSON.stringify(promos, null, 2));
}

async function readTransactions() {
  try {
    const raw = await fs.readFile(transactionsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
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
  const hasEnded = !endAtDate || endAtDate.getTime() > now;
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
    isExpired: Boolean(endAtDate && endAtDate.getTime() <= now),
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
      promos = promos.filter((promo) => promo.vendorId === vendorId);
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
    const body = await request.json();
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
    return NextResponse.json({ success: false, message: 'Gagal membuat promo.' }, { status: 500 });
  }
}