import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code || typeof subtotal !== 'number') {
      return NextResponse.json(
        { success: false, message: 'code dan subtotal wajib diisi.' },
        { status: 400 }
      );
    }

    const promosPath = path.join(process.cwd(), 'promos.json');
    const promosRaw = await fs.readFile(promosPath, 'utf-8');
    const promos = JSON.parse(promosRaw);

    const promo = promos.find((item) => item.code.toUpperCase() === String(code).toUpperCase() && item.active);
    if (!promo) {
      return NextResponse.json({ success: false, message: 'Kode promo tidak valid atau sudah tidak aktif.' }, { status: 404 });
    }

    if (subtotal < (promo.minSubtotal || 0)) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimal transaksi Rp ${(promo.minSubtotal || 0).toLocaleString('id-ID')} untuk promo ini.`
        },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (promo.type === 'percent') {
      discountAmount = Math.floor((subtotal * promo.value) / 100);
    } else {
      discountAmount = promo.value;
    }

    if (promo.maxDiscount) {
      discountAmount = Math.min(discountAmount, promo.maxDiscount);
    }

    discountAmount = Math.max(0, Math.min(discountAmount, subtotal));

    return NextResponse.json(
      {
        success: true,
        message: `Promo ${promo.code} berhasil diterapkan.`,
        data: {
          code: promo.code,
          type: promo.type,
          value: promo.value,
          description: promo.description,
          discountAmount
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error validating promo:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
