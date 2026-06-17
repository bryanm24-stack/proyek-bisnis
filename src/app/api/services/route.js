import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const services = await query('SELECT * FROM services');
    return NextResponse.json(services, { status: 200 });
  } catch (error) {
    console.error('Error fetching services from SQL:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal mengambil data services dari SQL',
      error: error.message
    }, { status: 500 });
  }
}
