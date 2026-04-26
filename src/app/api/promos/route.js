import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const promosPath = path.join(process.cwd(), 'promos.json');

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

function normalizePromoCode(input) {
  return String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

function buildPromoCode(productName) {
  const base = String(productName || 'PROMO')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8) || 'PROMO';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const productId = searchParams.get('productId');
    const active = searchParams.get('active');

    let promos = await readPromos();

    if (vendorId) {
      promos = promos.filter((promo) => promo.vendorId === vendorId);
    }

    if (productId) {
      promos = promos.filter((promo) => promo.productId === productId);
    }

    if (active === 'true') {
      promos = promos.filter((promo) => promo.active !== false);
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
      productId,
      productName,
      productImage,
      originalPrice,
      promoCode,
      promoType,
      promoValue,
      minSubtotal,
      description,
      active = true
    } = body;

    if (!vendorId || !vendorName || !productId || !productName) {
      return NextResponse.json({
        success: false,
        message: 'vendorId, vendorName, productId, dan productName wajib diisi.'
      }, { status: 400 });
    }

    const parsedValue = Number.parseInt(promoValue, 10);
    const parsedOriginalPrice = Number.parseInt(originalPrice, 10);
    const parsedMinSubtotal = minSubtotal ? Number.parseInt(minSubtotal, 10) : 0;

    if (!promoType || !['percent', 'fixed'].includes(promoType)) {
      return NextResponse.json({
        success: false,
        message: 'promoType harus percent atau fixed.'
      }, { status: 400 });
    }

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return NextResponse.json({
        success: false,
        message: 'promoValue harus berupa angka lebih dari 0.'
      }, { status: 400 });
    }

    const promoAmount = promoType === 'percent'
      ? Math.floor((Number.isFinite(parsedOriginalPrice) ? parsedOriginalPrice : 0) * parsedValue / 100)
      : parsedValue;

    const promoPrice = Number.isFinite(parsedOriginalPrice)
      ? Math.max(0, parsedOriginalPrice - promoAmount)
      : null;

    const promos = await readPromos();
    const newPromo = {
      id: Date.now().toString(),
      code: normalizePromoCode(promoCode) || buildPromoCode(productName),
      vendorId,
      vendorName,
      productId,
      productName,
      productImage: productImage || '',
      originalPrice: Number.isFinite(parsedOriginalPrice) ? parsedOriginalPrice : null,
      promoType,
      promoValue: parsedValue,
      promoAmount,
      promoPrice,
      minSubtotal: Number.isFinite(parsedMinSubtotal) ? parsedMinSubtotal : 0,
      description: description || `Promo spesial untuk ${productName}`,
      active: Boolean(active),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (promos.some((promo) => promo.code === newPromo.code)) {
      return NextResponse.json({
        success: false,
        message: 'Kode promo sudah dipakai. Gunakan kode lain.'
      }, { status: 409 });
    }

    promos.push(newPromo);
    await writePromos(promos);

    return NextResponse.json({ success: true, message: 'Promo berhasil dibuat.', data: newPromo }, { status: 201 });
  } catch (error) {
    console.error('Error creating promo:', error);
    return NextResponse.json({ success: false, message: 'Gagal membuat promo.' }, { status: 500 });
  }
}