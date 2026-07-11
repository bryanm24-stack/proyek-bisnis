import { NextResponse } from 'next/server';

import { ensureComplaintsTable, listComplaintsForAdmin } from '@/lib/complaints';

export async function GET() {
  try {
    await ensureComplaintsTable();
    const data = await listComplaintsForAdmin();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error loading admin complaints:', error);
    return NextResponse.json({ success: false, message: 'Gagal memuat komplain admin.' }, { status: 500 });
  }
}
