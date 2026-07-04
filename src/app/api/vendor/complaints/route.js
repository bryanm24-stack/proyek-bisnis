import { NextResponse } from 'next/server';

import {  , listComplaintsForVendor } from '@/lib/complaints';

export async function GET(request) {
  try {
    await ensureComplaintsTable();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const scope = (searchParams.get('scope') || 'active').toLowerCase();

    if (!vendorId) {
      return NextResponse.json({ success: false, message: 'vendorId diperlukan' }, { status: 400 });
    }

    let data = await listComplaintsForVendor(vendorId);
    if (scope === 'active') {
      data = data.filter((item) => item.status !== 'RESOLVED');
    } else if (scope === 'resolved') {
      data = data.filter((item) => item.status === 'RESOLVED');
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error loading vendor complaints:', error);
    return NextResponse.json({ success: false, message: 'Gagal memuat instruksi complaint vendor.' }, { status: 500 });
  }
}
