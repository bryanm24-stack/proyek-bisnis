import { NextResponse } from 'next/server';

import { query } from '@/lib/db';

async function ratingsHasColumn(columnName) {
  const rows = await query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'ratings'
       AND COLUMN_NAME = ?
     LIMIT 1`
    ,
    [columnName]
  );
  return rows.length > 0;
}

async function ensureRatingsSchema() {
  const schemaUpdates = [
    { column: 'deal_id', sql: 'ALTER TABLE ratings ADD COLUMN deal_id VARCHAR(255) NULL' },
    { column: 'vendor_reply', sql: 'ALTER TABLE ratings ADD COLUMN vendor_reply TEXT NULL' },
    { column: 'vendor_reply_at', sql: 'ALTER TABLE ratings ADD COLUMN vendor_reply_at DATETIME(3) NULL' },
    { column: 'vendor_reply_by', sql: 'ALTER TABLE ratings ADD COLUMN vendor_reply_by VARCHAR(255) NULL' }
  ];

  for (const update of schemaUpdates) {
    const exists = await ratingsHasColumn(update.column);
    if (!exists) {
      try {
        await query(update.sql);
      } catch (error) {
        console.warn(`Could not add ratings.${update.column}:`, error?.message || error);
      }
    }
  }
}

function mapRatingRow(row) {
  return {
    id: row.id,
    serviceId: row.service_id,
    customerId: row.customer_id,
    vendorId: row.vendor_id,
    dealId: row.deal_id || null,
    itemId: row.item_id || null,
    itemName: row.item_name || null,
    rating: Number(row.rating || 0),
    review: row.review || '',
    customerName: row.customer_name || 'Customer',
    vendorReply: row.vendor_reply || null,
    vendorReplyAt: row.vendor_reply_at || null,
    vendorReplyBy: row.vendor_reply_by || null,
    createdAt: row.created_at
  };
}

// POST - Submit rating and increment rentCount
export async function POST(request) {
  try {
    await ensureRatingsSchema();

    const body = await request.json();
    const { serviceId, customerId, vendorId, rating, review, dealId } = body;

    if (!serviceId || !customerId || !vendorId || !rating) {
      return NextResponse.json({
        success: false,
        message: 'serviceId, customerId, vendorId, dan rating wajib diisi!'
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        message: 'Rating harus antara 1-5'
      }, { status: 400 });
    }

    // SQL-first: resolve service id from payload or deal
    let resolvedServiceId = serviceId ? String(serviceId) : null;
    if (!resolvedServiceId && dealId) {
      const dealRows = await query('SELECT service_id FROM deals WHERE id = ? LIMIT 1', [String(dealId)]);
      resolvedServiceId = dealRows[0]?.service_id ? String(dealRows[0].service_id) : null;
    }

    if (!resolvedServiceId) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    const serviceRows = await query('SELECT id, rating, rent_count FROM services WHERE id = ? LIMIT 1', [resolvedServiceId]);
    if (serviceRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Layanan tidak ditemukan'
      }, { status: 404 });
    }

    // Cek duplikasi rating berdasarkan deal (prioritas) atau service legacy
    const hasDealIdColumn = await ratingsHasColumn('deal_id');
    let duplicateRows = [];
    if (dealId && hasDealIdColumn) {
      duplicateRows = await query(
        'SELECT id FROM ratings WHERE customer_id = ? AND deal_id = ? LIMIT 1',
        [String(customerId), String(dealId)]
      );
    } else if (dealId && !hasDealIdColumn) {
      duplicateRows = [];
    } else if (hasDealIdColumn) {
      duplicateRows = await query(
        'SELECT id FROM ratings WHERE customer_id = ? AND service_id = ? AND (deal_id IS NULL OR deal_id = "") LIMIT 1',
        [String(customerId), resolvedServiceId]
      );
    } else {
      duplicateRows = await query(
        'SELECT id FROM ratings WHERE customer_id = ? AND service_id = ? LIMIT 1',
        [String(customerId), resolvedServiceId]
      );
    }

    if (duplicateRows.length > 0) {
      return NextResponse.json({
        success: false,
        message: dealId
          ? 'Anda sudah memberikan rating untuk transaksi ini'
          : 'Anda sudah memberikan rating untuk layanan ini'
      }, { status: 400 });
    }

    const newRating = {
      id: Date.now().toString(),
      serviceId: resolvedServiceId,
      customerId,
      vendorId,
      dealId: dealId || null,
      rating: parseInt(rating),
      review: review || '',
      createdAt: new Date().toISOString()
    };

    if (hasDealIdColumn) {
      await query(
        `INSERT INTO ratings (id, service_id, customer_id, vendor_id, deal_id, rating, review, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRating.id,
          resolvedServiceId,
          String(customerId),
          String(vendorId),
          dealId ? String(dealId) : null,
          Number(newRating.rating),
          newRating.review,
          newRating.createdAt
        ]
      );
    } else {
      await query(
        `INSERT INTO ratings (id, service_id, customer_id, vendor_id, rating, review, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newRating.id,
          resolvedServiceId,
          String(customerId),
          String(vendorId),
          Number(newRating.rating),
          newRating.review,
          newRating.createdAt
        ]
      );
    }

    const aggregate = await query(
      'SELECT COUNT(*) AS total, AVG(rating) AS avg_rating FROM ratings WHERE service_id = ?',
      [resolvedServiceId]
    );
    const total = Number(aggregate[0]?.total || 0);
    const avgRating = Number(aggregate[0]?.avg_rating || 0);

    await query(
      'UPDATE services SET rent_count = ?, rating = ? WHERE id = ?',
      [total, Number(avgRating.toFixed(1)), resolvedServiceId]
    );

    if (dealId) {
      await query(
        `UPDATE deals
         SET status = ?, completed_at = COALESCE(completed_at, ?), invoice_status = COALESCE(invoice_status, 'paid')
         WHERE id = ?`,
        ['completed', newRating.createdAt, String(dealId)]
      );

      const dealRows = await query('SELECT chat_id FROM deals WHERE id = ? LIMIT 1', [String(dealId)]);
      if (dealRows.length > 0 && dealRows[0].chat_id) {
        await query('UPDATE chats SET deal_status = ? WHERE id = ?', [null, String(dealRows[0].chat_id)]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rating berhasil disimpan',
      data: {
        rating: newRating,
        updatedService: {
          id: resolvedServiceId,
          rating: Number(avgRating.toFixed(1)),
          rentCount: total
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// PUT - Vendor reply to a rating
export async function PUT(request) {
  try {
    await ensureRatingsSchema();

    const body = await request.json();
    const { ratingId, vendorId, serviceId, reply } = body;

    if (!ratingId || !vendorId || !serviceId) {
      return NextResponse.json({
        success: false,
        message: 'ratingId, vendorId, dan serviceId wajib diisi!'
      }, { status: 400 });
    }

    const services = await query('SELECT id, vendor_id FROM services WHERE id = ? LIMIT 1', [String(serviceId)]);
    const service = services[0] || null;
    if (!service || String(service.vendor_id || '') !== String(vendorId)) {
      return NextResponse.json({
        success: false,
        message: 'Vendor tidak memiliki akses ke rating ini'
      }, { status: 403 });
    }

    const updateResult = await query(
      `UPDATE ratings
       SET vendor_reply = ?, vendor_reply_at = ?, vendor_reply_by = ?
       WHERE id = ? AND service_id = ?`,
      [
        (reply || '').trim(),
        (reply || '').trim() ? new Date().toISOString() : null,
        String(vendorId),
        String(ratingId),
        String(serviceId)
      ]
    );

    if (!updateResult || Number(updateResult.affectedRows || 0) === 0) {
      return NextResponse.json({
        success: false,
        message: 'Rating tidak ditemukan'
      }, { status: 404 });
    }

    const updatedRows = await query(
      `SELECT r.*, u.name AS customer_name
       FROM ratings r
       LEFT JOIN users u ON u.id = r.customer_id
       WHERE r.id = ? LIMIT 1`,
      [String(ratingId)]
    );
    const updated = updatedRows[0] ? mapRatingRow(updatedRows[0]) : null;

    return NextResponse.json({
      success: true,
      message: 'Balasan vendor berhasil disimpan',
      data: updated
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving vendor reply:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// GET - Get ratings for a service
export async function GET(request) {
  try {
    await ensureRatingsSchema();

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const itemId = searchParams.get('itemId');

    if (!serviceId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId diperlukan'
      }, { status: 400 });
    }

    const hasDealIdColumn = await ratingsHasColumn('deal_id');
    const params = [String(serviceId)];

    let rows = [];
    if (hasDealIdColumn) {
      let itemFilterSql = '';
      if (itemId) {
        itemFilterSql = ' AND c.item_id = ?';
        params.push(String(itemId));
      }

      rows = await query(
        `SELECT
           r.*,
           u.name AS customer_name,
           c.item_id,
           c.item_name
         FROM ratings r
         LEFT JOIN users u ON u.id = r.customer_id
         LEFT JOIN deals d ON d.id = r.deal_id
         LEFT JOIN chats c ON c.id = d.chat_id
         WHERE r.service_id = ?${itemFilterSql}
         ORDER BY COALESCE(r.created_at, NOW()) DESC`,
        params
      );
    } else {
      rows = await query(
        `SELECT r.*, u.name AS customer_name
         FROM ratings r
         LEFT JOIN users u ON u.id = r.customer_id
         WHERE r.service_id = ?
         ORDER BY COALESCE(r.created_at, NOW()) DESC`,
        params
      );
    }

    const serviceRatings = rows.map(mapRatingRow);

    return NextResponse.json({
      success: true,
      data: serviceRatings
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting ratings:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
