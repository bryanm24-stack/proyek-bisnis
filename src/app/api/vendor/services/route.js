import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// GET - Mengambil services dengan filter vendorId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    const filePath = path.join(process.cwd(), 'services.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    let services = JSON.parse(fileData);

    // Filter berdasarkan vendorId jika diberikan
    if (vendorId) {
      services = services.filter(service => service.vendorId === vendorId);
    }

    return NextResponse.json({ success: true, data: services }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/vendor/services:', error.message);
    return NextResponse.json({ success: false, message: error.message || 'Gagal membaca services' }, { status: 500 });
  }
}

// POST - Menambahkan service baru
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      vendorId,
      vendorName,
      type, // 'barang' atau 'jasa'
      // Fields untuk barang
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
      // Fields untuk jasa
      spesialisasi,
      deskripsi,
      benefit,
      tarif,
      jangkauanWilayah,
      jamOperasional,
      estimasiPengerjaan,
      garansiLayanan,
      // Common
      images
    } = body;

    // Validasi input
    if (!vendorId || !vendorName || !type) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi!'
      }, { status: 400 });
    }

    // Validasi berdasarkan tipe
    if (type === 'barang') {
      if (!namaBarang || !jenisBarang || !spesifikBarang || !jumlahBarang || 
          !hargaBarang || !deskripsiProduk || !lokasi || !kebijakanKerusakan || 
          !denda || !syaratSewa) {
        return NextResponse.json({
          success: false,
          message: 'Semua field barang wajib diisi!'
        }, { status: 400 });
      }
    } else if (type === 'jasa') {
      if (!spesialisasi || !deskripsi || !benefit || !tarif || 
          !jangkauanWilayah || jangkauanWilayah.length === 0 ||
          !jamOperasional || !estimasiPengerjaan || !garansiLayanan) {
        return NextResponse.json({
          success: false,
          message: 'Semua field jasa wajib diisi!'
        }, { status: 400 });
      }
    }

    const filePath = path.join(process.cwd(), 'services.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const services = JSON.parse(fileData);

    // Buat service baru berdasarkan tipe
    let newService;
    if (type === 'barang') {
      newService = {
        id: Date.now().toString(),
        vendorId,
        vendorName,
        category: 'barang',
        title: namaBarang,
        shortDescription: spesifikBarang,
        description: deskripsiProduk,
        price: parseInt(hargaBarang),
        type: 'barang',
        jenisBarang,
        jumlahBarang: parseInt(jumlahBarang),
        availability,
        lokasi,
        latitude,
        longitude,
        kebijakanKerusakan,
        denda: parseInt(denda),
        syaratSewa,
        rating: 5.0,
        rentCount: '0',
        images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=150&q=80']
      };
    } else if (type === 'jasa') {
      newService = {
        id: Date.now().toString(),
        vendorId,
        vendorName,
        category: 'jasa',
        title: spesialisasi,
        shortDescription: benefit,
        description: deskripsi,
        price: parseInt(tarif),
        type: 'jasa',
        spesialisasi,
        jangkauanWilayah,
        jamOperasional,
        estimasiPengerjaan,
        garansiLayanan,
        rating: 5.0,
        rentCount: '0',
        images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=150&q=80']
      };
    }

    services.push(newService);
    await fs.writeFile(filePath, JSON.stringify(services, null, 2));

    return NextResponse.json({
      success: true,
      message: `${type === 'barang' ? 'Barang' : 'Jasa'} berhasil ditambahkan!`,
      data: newService
    }, { status: 201 });
  } catch (error) {
    console.error('Error di API Vendor Services:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    }, { status: 500 });
  }
}

// PUT - Update service
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      vendorId,
      mainCategory,
      subCategory,
      title,
      shortDescription,
      description,
      price,
      minimumDays,
      quantity,
      rentalPolicy,
      location,
      images,
      category
    } = body;

    if (!id || !vendorId) {
      return NextResponse.json({
        success: false,
        message: 'ID dan Vendor ID diperlukan'
      }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'services.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    let services = JSON.parse(fileData);

    // Cari dan update service
    const serviceIndex = services.findIndex(s => s.id === id && s.vendorId === vendorId);
    
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    // Update service
    services[serviceIndex] = {
      ...services[serviceIndex],
      mainCategory: mainCategory || services[serviceIndex].mainCategory,
      subCategory: subCategory || services[serviceIndex].subCategory,
      title: title || services[serviceIndex].title,
      shortDescription: shortDescription || services[serviceIndex].shortDescription,
      description: description || services[serviceIndex].description,
      price: price !== undefined ? price : services[serviceIndex].price,
      minimumDays: minimumDays || services[serviceIndex].minimumDays,
      quantity: quantity !== undefined ? quantity : services[serviceIndex].quantity,
      rentalPolicy: rentalPolicy || services[serviceIndex].rentalPolicy,
      location: location || services[serviceIndex].location,
      images: images && images.length > 0 ? images : services[serviceIndex].images,
      category: category || services[serviceIndex].category
    };

    await fs.writeFile(filePath, JSON.stringify(services, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Service berhasil diperbarui!',
      data: services[serviceIndex]
    }, { status: 200 });
  } catch (error) {
    console.error('Error di API PUT Vendor Services:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    }, { status: 500 });
  }
}

// DELETE - Hapus service
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const body = await request.json();
    const { vendorId } = body;

    if (!id || !vendorId) {
      return NextResponse.json({
        success: false,
        message: 'ID dan Vendor ID diperlukan'
      }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'services.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    let services = JSON.parse(fileData);

    // Cari service
    const serviceIndex = services.findIndex(s => s.id === id && s.vendorId === vendorId);
    
    if (serviceIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    // Hapus service
    services.splice(serviceIndex, 1);
    await fs.writeFile(filePath, JSON.stringify(services, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Service berhasil dihapus!'
    }, { status: 200 });
  } catch (error) {
    console.error('Error di API DELETE Vendor Services:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    }, { status: 500 });
  }
}
