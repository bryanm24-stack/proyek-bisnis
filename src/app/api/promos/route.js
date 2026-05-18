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



export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const active = searchParams.get('active');

    let promos = await readPromos();

    if (vendorId) {
      promos = promos.filter((promo) => promo.vendorId === vendorId);
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
      title,
      image,
      promoPrice,
      description,
      active = true
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