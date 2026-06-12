import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
function normalizeServiceCapacity(service) {
  if (!service) return service;

  if (service.type === 'jasa') {
    const capacity = Number(service.availableQuantity ?? service.availability ?? service.quantity ?? 0);
    return {
      ...service,
      availableQuantity: capacity,
      availability: capacity,
      quantity: capacity
    };
  }

  return service;
}

// GET - Mengambil services dengan filter vendorId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    let services = await readData('services');
    services = services.map(normalizeServiceCapacity);

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
      // Modern payload fields (used by VendorProductForm)
      mainCategory,
      subCategory,
      superSubCategory,
      title,
      shortDescription,
      description,
      detailDescription,
      price,
      minimumDays,
      type,
      availability,
      quantity,
      rentalPolicy,
      location,
      category,
      specifications,
      descriptionTable,
      checklist,
      items,
      variations,
      // Fields untuk barang
      namaBarang,
      jenisBarang,
      spesifikBarang,
      jumlahBarang,
      hargaBarang,
      deskripsiProduk,
      availability: legacyAvailability,
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
    if (!vendorId || !vendorName) {
      return NextResponse.json({
        success: false,
        message: 'vendorId dan vendorName wajib diisi!'
      }, { status: 400 });
    }

    const hasModernPayload = Boolean(title || mainCategory || location);

    const services = await readData('services');

    // Support payload baru dari halaman /vendor/tambah-produk dan /vendor
    if (hasModernPayload) {
      const resolvedType = type || (mainCategory && mainCategory.toLowerCase().includes('jasa') ? 'jasa' : 'barang');
      const missingFields = [];
      if (!mainCategory) missingFields.push('mainCategory');
      if (!subCategory) missingFields.push('subCategory');
      if (!title) missingFields.push('title');
      if (price === undefined || price === null || price === '') missingFields.push('price');
      if (resolvedType === 'barang' && (quantity === undefined || quantity === null || quantity === '')) {
        missingFields.push('quantity');
      }
      if (resolvedType === 'jasa' && (availability === undefined || availability === null || availability === '')) {
        missingFields.push('availability');
      }
      if (!location) missingFields.push('location');

      if (missingFields.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Field wajib belum lengkap: ${missingFields.join(', ')}`
        }, { status: 400 });
      }

      const parsedPrice = Number.parseInt(price, 10);
      const parsedMinimumDays = Number.parseInt(minimumDays, 10);
      const parsedAvailability = Number.parseInt(availability, 10);
      const parsedQuantity = Number.parseInt(quantity, 10);
      const normalizedQuantity = resolvedType === 'jasa'
        ? (Number.isNaN(parsedAvailability) ? 0 : parsedAvailability)
        : (Number.isNaN(parsedQuantity) ? 0 : parsedQuantity);
      const normalizedAvailability = resolvedType === 'jasa'
        ? (Number.isNaN(parsedAvailability) ? 0 : parsedAvailability)
        : 0;

      // ✅ Validasi: Maximum 5 images
      const validatedImages = images && Array.isArray(images)
        ? images.slice(0, 5)
        : [];

      const newService = {
        id: Date.now().toString(),
        vendorId,
        vendorName,
        mainCategory,
        subCategory,
        superSubCategory: superSubCategory || '',
        category: category || mainCategory,
        title,
        shortDescription,
        description: description || detailDescription || '',
        detailDescription: detailDescription || description || '',
        price: Number.isNaN(parsedPrice) ? 0 : parsedPrice,
        minimumDays: Number.isNaN(parsedMinimumDays) ? 1 : parsedMinimumDays,
        availableQuantity: normalizedAvailability,
        quantity: normalizedQuantity,
        rentalPolicy: rentalPolicy || '',
        location,
        specifications: specifications && typeof specifications === 'object' ? specifications : {},
        descriptionTable: descriptionTable && typeof descriptionTable === 'object' ? descriptionTable : {},
        checklist: checklist && typeof checklist === 'object' ? checklist : {},
        items: items && Array.isArray(items) ? items : [],
        variations: variations && typeof variations === 'object' ? variations : {},
        type: resolvedType,
        rating: 0,
        rentCount: 0,
        images: validatedImages && validatedImages.length > 0
          ? validatedImages
          : ['https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=150&q=80']
      };

      services.push(newService);
      await writeData('services', services);

      return NextResponse.json({
        success: true,
        message: 'Item berhasil ditambahkan!',
        data: newService
      }, { status: 201 });
    }

    if (!type) {
      return NextResponse.json({
        success: false,
        message: 'type wajib diisi untuk format payload lama'
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
        availableQuantity: legacyAvailability,
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
        availability: 0,
        availableQuantity: 0,
        quantity: 0,
        images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=150&q=80']
      };
    }

    services.push(newService);
    await writeData('services', services);

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
      type,
      mainCategory,
      subCategory,
      superSubCategory,
      title,
      shortDescription,
      description,
      price,
      minimumDays,
      availability,
      quantity,
      rentalPolicy,
      location,
      images,
      category,
      specifications,
      descriptionTable,
      checklist,
      items
    } = body;

    if (!id || !vendorId) {
      return NextResponse.json({
        success: false,
        message: 'ID dan Vendor ID diperlukan'
      }, { status: 400 });
    }

    let services = await readData('services');
    services = services.map(normalizeServiceCapacity);

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
      superSubCategory: superSubCategory !== undefined ? superSubCategory : (services[serviceIndex].superSubCategory || ''),
      title: title || services[serviceIndex].title,
      shortDescription: shortDescription || services[serviceIndex].shortDescription,
      description: description || services[serviceIndex].description,
      price: price !== undefined ? price : services[serviceIndex].price,
      minimumDays: minimumDays || services[serviceIndex].minimumDays,
      availability: availability !== undefined
        ? availability
        : (services[serviceIndex].availability ?? 0),
      availableQuantity: availability !== undefined
        ? availability
        : (services[serviceIndex].availableQuantity ?? services[serviceIndex].availability ?? 0),
      quantity: quantity !== undefined
        ? quantity
        : (
            availability !== undefined
              ? availability
              : services[serviceIndex].quantity
          ),
      rentalPolicy: rentalPolicy || services[serviceIndex].rentalPolicy,
      location: location || services[serviceIndex].location,
      type: type || services[serviceIndex].type,
      images: images && images.length > 0 ? images : services[serviceIndex].images,
      category: category || services[serviceIndex].category,
      specifications: specifications && typeof specifications === 'object'
        ? specifications
        : (services[serviceIndex].specifications || {}),
      descriptionTable: descriptionTable && typeof descriptionTable === 'object'
        ? descriptionTable
        : (services[serviceIndex].descriptionTable || {}),
      checklist: checklist && typeof checklist === 'object'
        ? checklist
        : (services[serviceIndex].checklist || {}),
      items: items && Array.isArray(items)
        ? items
        : (services[serviceIndex].items || [])
    };

    services[serviceIndex] = normalizeServiceCapacity(services[serviceIndex]);

    await writeData('services', services);

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

    let services = await readData('services');

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
    await writeData('services', services);

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
