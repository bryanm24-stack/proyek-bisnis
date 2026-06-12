import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { readData } from '@/lib/storage';

export async function GET(request) {
  try {
    // Try DB first
    try {
      const res = await query('SELECT * FROM services');
      return NextResponse.json(res.rows, { status: 200 });
    } catch (dbErr) {
      // fallback to storage for environments without DB
      console.warn('DB unavailable, falling back to storage:', dbErr.message);
      const services = await readData('services');
      return NextResponse.json(services, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal mengambil data services',
      error: error.message
    }, { status: 500 });
  }
}
