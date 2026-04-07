import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// GET - Mengambil semua services
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'services.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const services = JSON.parse(fileData);
    return NextResponse.json({ success: true, data: services }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal membaca services' }, { status: 500 });
  }
}

// POST - Menambahkan service baru
export async function POST(request) {
  try {
    const body = await request.json();
    const { vendorId, vendorName, title, shortDescription, description, price, images } = body;

    // Validasi input
    if (!vendorId || !vendorName || !title || !shortDescription || !description || !price) {
      return NextResponse.json({ 
        success: false, 
        message: 'Semua field wajib diisi!' 
      }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'services.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const services = JSON.parse(fileData);

    // Buat service baru
    const newService = {
      id: Date.now().toString(),
      vendorId,
      vendorName,
      title,
      shortDescription,
      description,
      price: parseInt(price),
      rating: 5.0,
      rentCount: "0",
      images: images || ["https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=150&q=80"]
    };

    services.push(newService);
    await fs.writeFile(filePath, JSON.stringify(services, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Jasa berhasil ditambahkan!',
      data: newService
    }, { status: 201 });
  } catch (error) {
    console.error('Error di API Vendor Services:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan server.' 
    }, { status: 500 });
  }
}
