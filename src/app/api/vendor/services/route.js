import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function parseJsonSafe(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function normalizeServiceCapacity(service) {
  if (!service) return service;

  // Convert all keys from snake_case to camelCase
  const normalized = {};
  for (const [key, value] of Object.entries(service)) {
    const camelKey = snakeToCamel(key);
    normalized[camelKey] = value;
  }

  const parsedImages = parseJsonSafe(normalized.images, []);
  const parsedSpecifications = parseJsonSafe(normalized.specifications, {});
  const parsedSpecificationOptions = parseJsonSafe(normalized.specificationOptions, {});
  const parsedDescriptionTable = parseJsonSafe(normalized.descriptionTable, {});
  const parsedChecklist = parseJsonSafe(normalized.checklist, {});
  const parsedItems = parseJsonSafe(normalized.items, []);
  const parsedVariations = parseJsonSafe(normalized.variations, {});

  const parsedRentGuardShipping = normalized.pengirimanRentguard;
  const hasRentGuardShipping = parsedRentGuardShipping === true || parsedRentGuardShipping === 1 || parsedRentGuardShipping === '1' || parsedRentGuardShipping === 'true';

  if (normalized.type === 'jasa') {
    const capacity = Number(normalized.availableQuantity ?? normalized.availability ?? normalized.quantity ?? 0);
    return {
      ...normalized,
      pengirimanRentguard: Boolean(hasRentGuardShipping),
      availableQuantity: capacity,
      availability: capacity,
      quantity: capacity,
      images: Array.isArray(parsedImages) ? parsedImages : [],
      specifications: parsedSpecifications,
      specificationOptions: parsedSpecificationOptions,
      descriptionTable: parsedDescriptionTable,
      checklist: parsedChecklist,
      items: parsedItems,
      variations: parsedVariations
    };
  }

  return {
    ...normalized,
    pengirimanRentguard: Boolean(hasRentGuardShipping),
    images: Array.isArray(parsedImages) ? parsedImages : [],
    specifications: parsedSpecifications,
    specificationOptions: parsedSpecificationOptions,
    descriptionTable: parsedDescriptionTable,
    checklist: parsedChecklist,
    items: parsedItems,
    variations: parsedVariations
  };
}

// GET - Mengambil services dengan filter vendorId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    let services;
    if (vendorId) {
      services = await query('SELECT * FROM services WHERE vendor_id = ? ORDER BY id', [vendorId]);
    } else {
      services = await query('SELECT * FROM services ORDER BY id');
    }
    services = services.map(normalizeServiceCapacity);

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
      specificationOptions,
      descriptionTable,
      checklist,
      items,
      variations,
      images
    } = body;

    if (!vendorId || !vendorName) {
      return NextResponse.json({
        success: false,
        message: 'vendorId dan vendorName wajib diisi!'
      }, { status: 400 });
    }

    const hasModernPayload = Boolean(title || mainCategory || location);

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

      const validatedImages = images && Array.isArray(images)
        ? images.slice(0, 5)
        : [];

      const newService = {
        id: Date.now().toString(),
        vendor_id: vendorId,
        vendor_name: vendorName,
        main_category: mainCategory,
        sub_category: subCategory,
        super_sub_category: superSubCategory || '',
        category: category || mainCategory,
        title,
        short_description: shortDescription,
        description: description || detailDescription || '',
        detail_description: detailDescription || description || '',
        price: Number.isNaN(parsedPrice) ? 0 : parsedPrice,
        minimum_days: Number.isNaN(parsedMinimumDays) ? 1 : parsedMinimumDays,
        available_quantity: normalizedAvailability,
        quantity: normalizedQuantity,
        rental_policy: rentalPolicy || '',
        location,
        pengiriman_rentguard: Boolean(body.pengirimanRentGuard),
        specifications: specifications && typeof specifications === 'object' ? specifications : {},
        specification_options: specificationOptions && typeof specificationOptions === 'object' ? specificationOptions : {},
        description_table: descriptionTable && typeof descriptionTable === 'object' ? descriptionTable : {},
        checklist: checklist && typeof checklist === 'object' ? checklist : {},
        items: items && Array.isArray(items) ? items : [],
        variations: variations && typeof variations === 'object' ? variations : {},
        type: resolvedType,
        rating: 0,
        rent_count: 0,
        images: validatedImages && validatedImages.length > 0
          ? validatedImages
          : ['https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=150&q=80'],
        availability: normalizedAvailability
      };

      const sql = `INSERT INTO services (id, vendor_id, vendor_name, main_category, sub_category, super_sub_category, category, title, short_description, description, detail_description, price, minimum_days, available_quantity, quantity, rental_policy, location, pengiriman_rentguard, specifications, specification_options, description_table, checklist, items, variations, type, rating, rent_count, images, availability)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const values = [
        newService.id,
        newService.vendor_id,
        newService.vendor_name,
        newService.main_category,
        newService.sub_category,
        newService.super_sub_category,
        newService.category,
        newService.title,
        newService.short_description,
        newService.description,
        newService.detail_description,
        newService.price,
        newService.minimum_days,
        newService.available_quantity,
        newService.quantity,
        newService.rental_policy,
        newService.location,
        newService.pengiriman_rentguard ? 1 : 0,
        JSON.stringify(newService.specifications),
        JSON.stringify(newService.specification_options),
        JSON.stringify(newService.description_table),
        JSON.stringify(newService.checklist),
        JSON.stringify(newService.items),
        JSON.stringify(newService.variations),
        newService.type,
        newService.rating,
        newService.rent_count,
        JSON.stringify(newService.images),
        newService.availability
      ];

      await query(sql, values);

      return NextResponse.json({
        success: true,
        message: 'Item berhasil ditambahkan!',
        data: newService
      }, { status: 201 });
    }

    return NextResponse.json({
      success: false,
      message: 'Payload tidak valid'
    }, { status: 400 });
  } catch (error) {
    console.error('Error di API Vendor Services POST:', error);
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
      pengirimanRentGuard,
      images,
      category,
      specifications,
      specificationOptions,
      descriptionTable,
      checklist,
      variations,
      items
    } = body;

    if (!id || !vendorId) {
      return NextResponse.json({
        success: false,
        message: 'ID dan Vendor ID diperlukan'
      }, { status: 400 });
    }

    // Cek apakah service ada
    const existing = await query('SELECT * FROM services WHERE id = ? AND vendor_id = ? LIMIT 1', [id, vendorId]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    const service = existing[0];

    // Update SQL
    const updateSql = `UPDATE services SET 
      main_category = ?, sub_category = ?, super_sub_category = ?, title = ?,
      short_description = ?, description = ?, price = ?, minimum_days = ?,
      availability = ?, available_quantity = ?, quantity = ?, rental_policy = ?,
      location = ?, type = ?, pengiriman_rentguard = ?, images = ?, category = ?, specifications = ?, specification_options = ?,
      description_table = ?, checklist = ?, items = ?, variations = ?
      WHERE id = ? AND vendor_id = ?`;

    const updateValues = [
      mainCategory || service.main_category,
      subCategory || service.sub_category,
      superSubCategory !== undefined ? superSubCategory : (service.super_sub_category || ''),
      title || service.title,
      shortDescription || service.short_description,
      description || service.description,
      price !== undefined ? price : service.price,
      minimumDays || service.minimum_days,
      availability !== undefined ? availability : (service.availability ?? 0),
      availability !== undefined ? availability : (service.available_quantity ?? service.availability ?? 0),
      quantity !== undefined ? quantity : (availability !== undefined ? availability : service.quantity),
      rentalPolicy || service.rental_policy,
      location || service.location,
      type || service.type,
      pengirimanRentGuard !== undefined ? (pengirimanRentGuard ? 1 : 0) : (service.pengiriman_rentguard ? 1 : 0),
      JSON.stringify(images && images.length > 0 ? images : JSON.parse(service.images || '[]')),
      category || service.category,
      JSON.stringify(specifications || JSON.parse(service.specifications || '{}')),
      JSON.stringify(specificationOptions || JSON.parse(service.specification_options || '{}')),
      JSON.stringify(descriptionTable || JSON.parse(service.description_table || '{}')),
      JSON.stringify(checklist || JSON.parse(service.checklist || '{}')),
      JSON.stringify(items || JSON.parse(service.items || '[]')),
      JSON.stringify(variations || JSON.parse(service.variations || '{}')),
      id,
      vendorId
    ];

    await query(updateSql, updateValues);

    const updated = await query('SELECT * FROM services WHERE id = ? AND vendor_id = ? LIMIT 1', [id, vendorId]);

    return NextResponse.json({
      success: true,
      message: 'Service berhasil diperbarui!',
      data: normalizeServiceCapacity(updated[0])
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

    // Cek apakah service ada
    const existing = await query('SELECT * FROM services WHERE id = ? AND vendor_id = ? LIMIT 1', [id, vendorId]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Service tidak ditemukan'
      }, { status: 404 });
    }

    // Hapus service
    await query('DELETE FROM services WHERE id = ? AND vendor_id = ?', [id, vendorId]);

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
