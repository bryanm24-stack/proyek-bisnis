import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const vendorId = searchParams.get('vendorId');
    const category = searchParams.get('category');

    let sql = `
      SELECT 
        id, vendor_id, vendor_name, main_category, sub_category, 
        super_sub_category, category, type, title, short_description, 
        description, detail_description, price, minimum_days, quantity, 
        rental_policy, location, rating, rent_count, images, 
        specifications, specification_options, description_table, checklist,
        created_at, updated_at
      FROM services
      WHERE 1=1
    `;
    const params = [];

    if (serviceId) {
      sql += ' AND id = ?';
      params.push(serviceId);
    }

    if (vendorId) {
      sql += ' AND vendor_id = ?';
      params.push(vendorId);
    }

    if (category) {
      sql += ' AND (category = ? OR main_category = ? OR sub_category = ?)';
      params.push(category, category, category);
    }

    sql += ' ORDER BY created_at DESC';

    const services = await query(sql, params);

    // Parse JSON fields
    const processedServices = services.map(service => ({
      ...service,
      images: service.images ? (typeof service.images === 'string' ? JSON.parse(service.images) : service.images) : [],
      specifications: service.specifications ? (typeof service.specifications === 'string' ? JSON.parse(service.specifications) : service.specifications) : {},
      specificationOptions: service.specification_options ? (typeof service.specification_options === 'string' ? JSON.parse(service.specification_options) : service.specification_options) : {},
      descriptionTable: service.description_table ? (typeof service.description_table === 'string' ? JSON.parse(service.description_table) : service.description_table) : {},
      checklist: service.checklist ? (typeof service.checklist === 'string' ? JSON.parse(service.checklist) : service.checklist) : []
    }));

    return NextResponse.json(processedServices, { status: 200 });
  } catch (error) {
    console.error('Error fetching services from SQL:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal mengambil data services dari SQL',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      vendorId,
      vendorName,
      mainCategory,
      subCategory,
      superSubCategory,
      category,
      type,
      title,
      shortDescription,
      description,
      detailDescription,
      price,
      minimumDays,
      quantity,
      rentalPolicy,
      location,
      images = [],
      specifications = {},
      specificationOptions = {},
      descriptionTable = {},
      checklist = []
    } = body;

    // Validate required fields
    if (!vendorId || !vendorName || !title || !price) {
      return NextResponse.json({
        success: false,
        message: 'vendorId, vendorName, title, dan price wajib diisi.'
      }, { status: 400 });
    }

    const serviceId = Date.now().toString();
    const now = new Date().toISOString();

    await query(
      `INSERT INTO services (
        id, vendor_id, vendor_name, main_category, sub_category, 
        super_sub_category, category, type, title, short_description, 
        description, detail_description, price, minimum_days, quantity, 
        rental_policy, location, rating, rent_count, images, 
        specifications, specification_options, description_table, checklist,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        serviceId,
        vendorId,
        vendorName,
        mainCategory || null,
        subCategory || null,
        superSubCategory || null,
        category || null,
        type || 'barang',
        title,
        shortDescription || null,
        description || null,
        detailDescription || null,
        Number(price) || 0,
        minimumDays ? Number(minimumDays) : 1,
        quantity ? Number(quantity) : null,
        rentalPolicy || null,
        location || null,
        0,
        0,
        JSON.stringify(images),
        JSON.stringify(specifications),
        JSON.stringify(specificationOptions),
        JSON.stringify(descriptionTable),
        JSON.stringify(checklist),
        now,
        now
      ]
    );

    const newService = {
      id: serviceId,
      vendorId,
      vendorName,
      mainCategory,
      subCategory,
      superSubCategory,
      category,
      type: type || 'barang',
      title,
      shortDescription,
      description,
      detailDescription,
      price: Number(price) || 0,
      minimumDays: minimumDays ? Number(minimumDays) : 1,
      quantity: quantity ? Number(quantity) : null,
      rentalPolicy,
      location,
      rating: 0,
      rentCount: 0,
      images,
      specifications,
      specificationOptions,
      descriptionTable,
      checklist,
      createdAt: now,
      updatedAt: now
    };

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal membuat service',
      error: error.message
    }, { status: 500 });
  }
}
