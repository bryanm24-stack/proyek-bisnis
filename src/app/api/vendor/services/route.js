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
    const {
      vendorId,
      vendorName,
      type,
      namaBarang,
      jenisBarang,
      spesifikBarang,
      jumlahBarang,
      hargaBarang,
      deskripsiProduk,
      availability,
      lokasi,
      latitude,
      longitude,
      kebijakanKerusakan,
      denda,
      syaratSewa,
      spesialisasi,
      deskripsi,
      benefit,
      tarif,
      jangkauanWilayah,
      jamOperasional,
      estimasiPengerjaan,
      garansiLayanan,
      images
    } = body;

    const isJasa = type === 'jasa';

    // Validasi input
    if (!vendorId || !vendorName) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vendor tidak valid.' 
      }, { status: 400 });
    }

    if (isJasa) {
      if (!spesialisasi || !deskripsi || !benefit || !tarif || !Array.isArray(jangkauanWilayah) || jangkauanWilayah.length === 0 || !jamOperasional || !jamOperasional.dari || !jamOperasional.sampai || !jamOperasional.hari || jamOperasional.hari.length === 0 || !estimasiPengerjaan || !garansiLayanan) {
        return NextResponse.json({ 
          success: false,
          message: 'Semua field jasa wajib diisi!'
        }, { status: 400 });
      }
    } else {
      if (!namaBarang || !jenisBarang || !spesifikBarang || !jumlahBarang || !hargaBarang || !deskripsiProduk || !lokasi || !kebijakanKerusakan || !denda || !syaratSewa) {
        return NextResponse.json({ 
          success: false,
          message: 'Semua field barang wajib diisi!'
        }, { status: 400 });
      }
    }

    const filePath = path.join(process.cwd(), 'services.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const services = JSON.parse(fileData);

    const commonData = {
      id: Date.now().toString(),
      vendorId,
      vendorName,
      type: type || 'barang',
      category: type || body.category || 'barang',
      rating: 5.0,
      rentCount: '0',
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=150&q=80']
    };

    const newService = isJasa ? {
      ...commonData,
      title: spesialisasi,
      shortDescription: benefit,
      description,
      price: parseInt(tarif, 10),
      spesialisasi,
      benefit,
      jangkauanWilayah,
      jamOperasional,
      estimasiPengerjaan,
      garansiLayanan
    } : {
      ...commonData,
      title: namaBarang,
      shortDescription: `${jenisBarang}${spesifikBarang ? ` — ${spesifikBarang}` : ''}`,
      description: deskripsiProduk,
      price: parseInt(hargaBarang, 10),
      namaBarang,
      jenisBarang,
      spesifikBarang,
      jumlahBarang,
      availability: availability || 'ready',
      lokasi,
      latitude,
      longitude,
      kebijakanKerusakan,
      denda,
      syaratSewa
    };

    services.push(newService);
    await fs.writeFile(filePath, JSON.stringify(services, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Service berhasil ditambahkan!',
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
