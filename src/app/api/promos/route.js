import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Removed - using SQL queries directly

function toValidDate(value) {
  if (!value) return null;

  // Support common localized input format like "18 / 06 / 2026 , 10 . 00"
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const localizedMatch = trimmed.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*,\s*(\d{1,2})\s*\.\s*(\d{1,2})$/);
    if (localizedMatch) {
      const [, d, m, y, hh, mm] = localizedMatch;
      const converted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
      const localizedDate = new Date(converted);
      if (!Number.isNaN(localizedDate.getTime())) return localizedDate;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePromo(promo, options = {}) {
  const { userId = null, claimedUsersByPromo = new Map() } = options;
  const startAtDate = toValidDate(promo.start_at || promo.startAt);
  const endAtDate = toValidDate(promo.end_at || promo.endAt);
  const maxApplicants = promo.max_applicants || promo.maxApplicants;
  const claimedUsersFromDb = Array.isArray(promo.claimed_user_ids)
    ? promo.claimed_user_ids.map((id) => String(id))
    : (() => {
        try {
          const parsed = JSON.parse(promo.claimed_user_ids || '[]');
          return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
        } catch {
          return [];
        }
      })();
  const claimedUsersFromTx = Array.from(claimedUsersByPromo.get(String(promo.id)) || []);
  const claimedUsersUnion = Array.from(new Set([...claimedUsersFromDb, ...claimedUsersFromTx]));
  const claimedCount = claimedUsersUnion.length;
  const remainingApplicants = Number.isFinite(Number(maxApplicants))
    ? Math.max(0, Number(maxApplicants) - claimedCount)
    : null;
  const now = Date.now();
  const normalizedUserId = userId ? String(userId) : null;
  const userHasClaimed = Boolean(normalizedUserId && claimedUsersUnion.includes(normalizedUserId));

  return {
    id: promo.id,
    vendorId: promo.vendor_id,
    vendorName: promo.vendor_name,
    title: promo.title,
    image: promo.image,
    promoPrice: promo.promo_price,
    description: promo.description,
    active: Boolean(promo.active),
    startAt: startAtDate ? startAtDate.toISOString() : null,
    endAt: endAtDate ? endAtDate.toISOString() : null,
    maxApplicants: maxApplicants ? Number(maxApplicants) : null,
    claimedCount,
    remainingApplicants,
    userHasClaimed,
    claimLimitPerUser: 1,
    createdAt: promo.created_at,
    updatedAt: promo.updated_at,
    isUpcoming: startAtDate && startAtDate.getTime() > now,
    isExpired: endAtDate && endAtDate.getTime() <= now,
    isActiveNow: promo.active && (!startAtDate || startAtDate.getTime() <= now) && (!endAtDate || endAtDate.getTime() > now)
  };
}



export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const active = searchParams.get('active');
    const promoId = searchParams.get('promoId');
    const userId = searchParams.get('userId');

    let sql = 'SELECT * FROM promos WHERE 1=1';
    const params = [];

    if (promoId) {
      sql += ' AND id = ?';
      params.push(promoId);
    }

    if (vendorId) {
      sql += ' AND vendor_id = ?';
      params.push(vendorId);
    }

    sql += ' ORDER BY created_at DESC';

    const promos = await query(sql, params);

    const promoIds = promos.map((promo) => String(promo.id));
    const claimedUsersByPromo = new Map();
    if (promoIds.length > 0) {
      try {
        const placeholders = promoIds.map(() => '?').join(', ');
        const txRows = await query(
          `SELECT promo_id, user_id
           FROM transactions
           WHERE status = 'success'
             AND promo_id IN (${placeholders})`,
          promoIds
        );

        txRows.forEach((row) => {
          const key = String(row.promo_id || '');
          if (!claimedUsersByPromo.has(key)) claimedUsersByPromo.set(key, new Set());
          if (row.user_id !== null && row.user_id !== undefined) {
            claimedUsersByPromo.get(key).add(String(row.user_id));
          }
        });
      } catch (transactionReadError) {
        console.warn('Promo claim aggregation from transactions not available:', transactionReadError?.message || transactionReadError);
      }
    }

    let processedPromos = promos.map((promo) => normalizePromo(promo, { userId, claimedUsersByPromo }));

    if (active === 'true') {
      processedPromos = processedPromos.filter(p => p.isActiveNow);
    }

    return NextResponse.json({ success: true, data: processedPromos }, { status: 200 });
  } catch (error) {
    console.error('Error reading promos:', error);
    return NextResponse.json({ success: false, message: 'Gagal membaca promo.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Ensure promo image can store base64 payloads from upload input
    try {
      await query('ALTER TABLE promos MODIFY COLUMN image LONGTEXT');
    } catch {
      // Ignore when already LONGTEXT or no alter permission
    }

    const body = await request.json();
    const {
      vendorId,
      vendorName,
      title,
      image,
      promoPrice,
      description,
      active = true,
      startAt,
      endAt,
      maxApplicants
    } = body;

    // Validasi required fields
    const normalizedVendorName = String(vendorName || body.vendor || body.name || '').trim();

    if (!vendorId || !normalizedVendorName || !title || !image || promoPrice === undefined) {
      return NextResponse.json({
        success: false,
        message: 'vendorId, vendorName, title, image, dan promoPrice wajib diisi.'
      }, { status: 400 });
    }

    const parsedPrice = Number.parseInt(promoPrice, 10);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({
        success: false,
        message: 'promoPrice harus berupa angka lebih dari 0.'
      }, { status: 400 });
    }

    const startDate = toValidDate(startAt);
    const endDate = toValidDate(endAt);

    if (startAt && !startDate) {
      return NextResponse.json({
        success: false,
        message: 'Format startAt tidak valid.'
      }, { status: 400 });
    }

    if (endAt && !endDate) {
      return NextResponse.json({
        success: false,
        message: 'Format endAt tidak valid.'
      }, { status: 400 });
    }

    if (startDate && endDate && startDate >= endDate) {
      return NextResponse.json({
        success: false,
        message: 'Tanggal promo selesai harus lebih besar dari tanggal mulai.'
      }, { status: 400 });
    }

    const parsedMaxApplicants = maxApplicants === undefined || maxApplicants === null || maxApplicants === ''
      ? null
      : Number(maxApplicants);

    if (parsedMaxApplicants !== null && (!Number.isInteger(parsedMaxApplicants) || parsedMaxApplicants <= 0)) {
      return NextResponse.json({
        success: false,
        message: 'Limit applicant harus berupa angka bulat lebih dari 0.'
      }, { status: 400 });
    }

    const promoId = Date.now().toString();
    const now = new Date().toISOString();

    await query(
      `INSERT INTO promos (id, vendor_id, vendor_name, title, image, promo_price, description, active, start_at, end_at, max_applicants, claimed_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        promoId,
        vendorId,
        normalizedVendorName,
        String(title).trim(),
        String(image).trim(),
        parsedPrice,
        String(description || '').trim(),
        Boolean(active) ? 1 : 0,
        startDate ? startDate.toISOString() : null,
        endDate ? endDate.toISOString() : null,
        parsedMaxApplicants,
        0,
        now,
        now
      ]
    );

    const newPromo = {
      id: promoId,
      vendorId,
      vendorName: normalizedVendorName,
      title: String(title).trim(),
      image: String(image).trim(),
      promoPrice: parsedPrice,
      description: String(description || '').trim(),
      active: Boolean(active),
      startAt: startDate ? startDate.toISOString() : null,
      endAt: endDate ? endDate.toISOString() : null,
      maxApplicants: parsedMaxApplicants,
      claimedCount: 0,
      createdAt: now,
      updatedAt: now
    };

    return NextResponse.json({ success: true, message: 'Promo berhasil dibuat.', data: newPromo }, { status: 201 });
  } catch (error) {
    console.error('Error creating promo:', error);
    return NextResponse.json({
      success: false,
      message: error?.message ? `Gagal membuat promo: ${error.message}` : 'Gagal membuat promo.'
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const promoId = searchParams.get('id') || searchParams.get('promoId');
    const vendorId = searchParams.get('vendorId');

    if (!promoId) {
      return NextResponse.json({
        success: false,
        message: 'promoId diperlukan'
      }, { status: 400 });
    }

    // Verify ownership if vendorId provided
    if (vendorId) {
      const promo = await query('SELECT vendor_id FROM promos WHERE id = ?', [promoId]);
      if (promo.length === 0 || String(promo[0].vendor_id) !== String(vendorId)) {
        return NextResponse.json({
          success: false,
          message: 'Anda tidak memiliki izin menghapus promo ini'
        }, { status: 403 });
      }
    }

    await query('DELETE FROM promos WHERE id = ?', [promoId]);

    return NextResponse.json({
      success: true,
      message: 'Promo berhasil dihapus'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting promo:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal menghapus promo'
    }, { status: 500 });
  }
}