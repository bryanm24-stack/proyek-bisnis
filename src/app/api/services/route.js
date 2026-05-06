import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const servicesFile = path.join(process.cwd(), 'services.json');

export async function GET(request) {
  try {
    // Read services.json
    let servicesData = fs.readFileSync(servicesFile, 'utf-8');
    servicesData = servicesData.replace(/^\uFEFF/, '').trim();
    const services = JSON.parse(servicesData);
    
    return NextResponse.json(services, { status: 200 });
  } catch (error) {
    console.error('Error reading services:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal membaca data services',
      error: error.message
    }, { status: 500 });
  }
}
