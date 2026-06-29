import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const normalizeId = (id) => String(id ?? '').trim();

function parseJsonSafe(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toBool(value) {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

function mapChatRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceTitle: row.service_title,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    itemId: row.item_id,
    itemName: row.item_name,
    messages: parseJsonSafe(row.messages, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dealStatus: row.deal_status
  };
}

function mapDealRow(row, chat = null, originalPriceOverride = null) {
  if (!row) return null;
  const discount = parseJsonSafe(row.discount, { type: null, value: 0, amount: 0 });
  const originalPrice = Number(originalPriceOverride ?? row.original_price ?? 0) || 0;
  const finalPrice = Number(row.final_price ?? Math.max(originalPrice - Number(discount?.amount || 0), 0)) || 0;

  return {
    id: row.id,
    chatId: row.chat_id,
    customerId: row.customer_id,
    vendorId: row.vendor_id,
    serviceId: row.service_id,
    customerAccepted: toBool(row.customer_accepted),
    vendorAccepted: toBool(row.vendor_accepted),
    status: row.status,
    createdAt: row.created_at,
    agreedAt: row.agreed_at,
    discount,
    discountGiven: Number(discount?.amount || 0) > 0,
    originalPrice,
    finalPrice,
    discountUpdatedAt: row.discount_updated_at,
    invoiceStatus: row.invoice_status,
    paymentConfirmedAt: row.payment_confirmed_at,
    completedAt: row.completed_at,
    actualReturnDate: row.actual_return_date,
    returnStatus: row.return_status,
    vendorConfirmed: toBool(row.vendor_confirmed),
    customerConfirmed: toBool(row.customer_confirmed),
    settlementDate: row.settlement_date,
    refundStatus: row.refund_status,
    itemId: chat?.itemId ?? null,
    itemName: chat?.itemName ?? null,
    itemPrice: originalPrice
  };
}

async function getChatById(chatId) {
  const rows = await query('SELECT * FROM chats WHERE id = ? LIMIT 1', [chatId]);
  return rows[0] || null;
}

async function getLatestDealByChatId(chatId) {
  const rows = await query(
    'SELECT * FROM deals WHERE chat_id = ? ORDER BY COALESCE(created_at, NOW()) DESC, id DESC LIMIT 1',
    [chatId]
  );
  return rows[0] || null;
}

async function resolveDealPrice(serviceId, itemId) {
  const services = await query('SELECT id, type, price, items FROM services WHERE id = ? LIMIT 1', [serviceId]);
  const service = services[0];
  if (!service) return 0;

  const items = parseJsonSafe(service.items, []);
  if (Array.isArray(items) && itemId) {
    const found = items.find((entry) => normalizeId(entry?.id) === normalizeId(itemId));
    if (found) {
      const priceField = service.type === 'barang' ? 'hargaPcs' : 'hargaSesi';
      const itemPrice = Number(found?.[priceField] ?? found?.price ?? 0);
      if (Number.isFinite(itemPrice) && itemPrice > 0) return itemPrice;
    }
  }

  return Number(service.price ?? 0) || 0;
}

async function createNotification(userId, type, message, relatedId, relatedData = {}) {
  try {
    await query(
      `INSERT INTO notifications (id, user_id, type, message, related_id, related_data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        `notif_${Date.now()}`,
        String(userId),
        type,
        message,
        String(relatedId),
        JSON.stringify(relatedData || {}),
        0,
        new Date().toISOString()
      ]
    );
  } catch (error) {
    console.warn('Failed to create notification:', error.message);
  }
}

async function upsertPendingInvoice(deal, finalPrice) {
  const pending = await query(
    `SELECT * FROM invoices
     WHERE deal_id = ? AND (status IS NULL OR status <> 'paid')
     ORDER BY COALESCE(created_at, NOW()) DESC
     LIMIT 1`,
    [deal.id]
  );

  const deadline = new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)).toISOString();
  if (pending.length > 0) {
    await query(
      `UPDATE invoices
       SET customer_id = ?, vendor_id = ?, service_id = ?, remaining_payment = ?, payment_deadline = ?,
           payment_type = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        deal.customerId,
        deal.vendorId,
        deal.serviceId,
        Number(finalPrice || 0),
        deadline,
        'deal_pending',
        'pending',
        'Menunggu pembayaran setelah deal disepakati dan diskon diterapkan.',
        pending[0].id
      ]
    );
    return;
  }

  await query(
    `INSERT INTO invoices (
      id, deal_id, customer_id, vendor_id, service_id, transaction_id,
      remaining_payment, payment_deadline, payment_method, payment_type,
      status, created_at, paid_at, payment_transaction_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `INV-${Date.now()}`,
      deal.id,
      deal.customerId,
      deal.vendorId,
      deal.serviceId,
      null,
      Number(finalPrice || 0),
      deadline,
      null,
      'deal_pending',
      'pending',
      new Date().toISOString(),
      null,
      null,
      'Menunggu pembayaran setelah deal disepakati dan diskon diterapkan.'
    ]
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const referer = request.headers.get('referer') || '';
    const actorIsVendorUI = referer.includes('/vendor/chats');
    const { action, chatId, customerId, vendorId, serviceId, resetDeadline } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: 'Action diperlukan' }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ success: false, message: 'chatId wajib diisi' }, { status: 400 });
    }

    const chatRow = await getChatById(chatId);
    if (!chatRow) {
      return NextResponse.json({ success: false, message: 'Chat room tidak ditemukan' }, { status: 404 });
    }
    const chat = mapChatRow(chatRow);

    if (customerId && normalizeId(chat.customerId) !== normalizeId(customerId)) {
      return NextResponse.json({ success: false, message: 'Data customer tidak valid' }, { status: 403 });
    }
    if (vendorId && normalizeId(chat.vendorId) !== normalizeId(vendorId)) {
      return NextResponse.json({ success: false, message: 'Data vendor tidak valid' }, { status: 403 });
    }
    if (serviceId && normalizeId(chat.serviceId) !== normalizeId(serviceId)) {
      return NextResponse.json({ success: false, message: 'Data service tidak valid' }, { status: 403 });
    }

    const existingDealRow = await getLatestDealByChatId(chatId);

    if (action === 'cancel') {
      if (resetDeadline && existingDealRow && ['completed', 'cancelled'].includes(existingDealRow.status)) {
        await query(
          'UPDATE deals SET status = ?, customer_accepted = ?, vendor_accepted = ? WHERE id = ?',
          ['pending', 1, 0, existingDealRow.id]
        );
        await query('UPDATE chats SET deal_status = ? WHERE id = ?', ['pending', chatId]);

        const refreshedDealRow = await getLatestDealByChatId(chatId);
        const refreshedChat = mapChatRow(await getChatById(chatId));

        await createNotification(vendorId || chat.vendorId, 'deal_pending', 'Ada penawaran baru dari customer', chatId, {
          customerId: customerId || chat.customerId,
          serviceId: serviceId || chat.serviceId
        });

        return NextResponse.json({
          success: true,
          message: 'Deal direset untuk siklus baru',
          data: { deal: mapDealRow(refreshedDealRow, refreshedChat), chat: refreshedChat }
        }, { status: 200 });
      }

      if (existingDealRow) {
        await query('UPDATE deals SET status = ? WHERE id = ?', ['cancelled', existingDealRow.id]);
      }
      await query('UPDATE chats SET deal_status = ? WHERE id = ?', ['cancelled', chatId]);

      const refreshedDealRow = await getLatestDealByChatId(chatId);
      const refreshedChat = mapChatRow(await getChatById(chatId));

      await createNotification(vendorId || chat.vendorId, 'deal_cancelled', 'Deal dibatalkan oleh customer', chatId, {
        customerId: customerId || chat.customerId,
        serviceId: serviceId || chat.serviceId
      });

      return NextResponse.json({
        success: true,
        message: 'Deal dibatalkan',
        data: { deal: mapDealRow(refreshedDealRow, refreshedChat), chat: refreshedChat }
      }, { status: 200 });
    }

    if (action === 'accept') {
      if (!existingDealRow || ['completed', 'cancelled'].includes(existingDealRow.status)) {
        const resolvedPrice = await resolveDealPrice(chat.serviceId, chat.itemId);
        const dealId = Date.now().toString();
        const initialStatus = actorIsVendorUI ? 'agreed' : 'pending';
        const vendorAccepted = actorIsVendorUI ? 1 : 0;
        const agreedAt = actorIsVendorUI ? new Date().toISOString() : null;

        await query(
          `INSERT INTO deals (
            id, chat_id, customer_id, vendor_id, service_id,
            customer_accepted, vendor_accepted, status, created_at,
            agreed_at, discount, original_price, final_price, return_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dealId,
            chatId,
            chat.customerId,
            chat.vendorId,
            chat.serviceId,
            1,
            vendorAccepted,
            initialStatus,
            new Date().toISOString(),
            agreedAt,
            JSON.stringify({ type: null, value: 0, amount: 0 }),
            resolvedPrice,
            resolvedPrice,
            'pending'
          ]
        );

        await query('UPDATE chats SET deal_status = ? WHERE id = ?', [initialStatus, chatId]);
        const createdDeal = await getLatestDealByChatId(chatId);
        const refreshedChat = mapChatRow(await getChatById(chatId));

        if (actorIsVendorUI) {
          await createNotification(chat.customerId, 'deal_accepted', 'Vendor menerima penawaran Anda!', chatId, {
            vendorId: chat.vendorId,
            serviceId: chat.serviceId
          });
        } else {
          await createNotification(chat.vendorId, 'deal_pending', 'Ada penawaran baru dari customer', chatId, {
            customerId: chat.customerId,
            serviceId: chat.serviceId
          });
        }

        return NextResponse.json({
          success: true,
          message: actorIsVendorUI ? 'Deal diterima.' : 'Penawaran dikirim, menunggu vendor menerima',
          data: { deal: mapDealRow(createdDeal, refreshedChat), chat: refreshedChat }
        }, { status: actorIsVendorUI ? 200 : 201 });
      }

      if (!actorIsVendorUI && existingDealRow.status === 'pending') {
        return NextResponse.json({
          success: true,
          message: 'Penawaran sedang menunggu vendor menerima.',
          data: { deal: mapDealRow(existingDealRow, chat), chat }
        }, { status: 200 });
      }

      const agreedPrice = await resolveDealPrice(chat.serviceId, chat.itemId);
      await query(
        `UPDATE deals
         SET vendor_accepted = ?, status = ?, agreed_at = ?,
             original_price = COALESCE(original_price, ?),
             final_price = COALESCE(final_price, ?)
         WHERE id = ?`,
        [1, 'agreed', new Date().toISOString(), agreedPrice, agreedPrice, existingDealRow.id]
      );

      await query('UPDATE chats SET deal_status = ? WHERE id = ?', ['agreed', chatId]);

      const refreshedDealRow = await getLatestDealByChatId(chatId);
      const refreshedChat = mapChatRow(await getChatById(chatId));

      await createNotification(chat.customerId, 'deal_accepted', 'Vendor menerima penawaran Anda!', chatId, {
        vendorId: chat.vendorId,
        serviceId: chat.serviceId
      });

      return NextResponse.json({
        success: true,
        message: 'Deal diterima.',
        data: { deal: mapDealRow(refreshedDealRow, refreshedChat), chat: refreshedChat, readyForRating: true }
      }, { status: 200 });
    }

    if (action === 'apply-discount') {
      const { discountType, discountValue } = body;
      if (!discountType || typeof discountValue !== 'number') {
        return NextResponse.json({ success: false, message: 'Data diskon tidak lengkap' }, { status: 400 });
      }

      if (!existingDealRow) {
        return NextResponse.json({ success: false, message: 'Deal belum dibuat' }, { status: 404 });
      }

      if (normalizeId(existingDealRow.vendor_id) !== normalizeId(vendorId || chat.vendorId)) {
        return NextResponse.json({ success: false, message: 'Hanya vendor pemilik deal yang bisa memberi diskon' }, { status: 403 });
      }

      if (existingDealRow.status !== 'agreed') {
        return NextResponse.json({ success: false, message: 'Diskon hanya bisa diterapkan setelah deal disetujui' }, { status: 400 });
      }

      let originalPrice = Number(existingDealRow.original_price ?? 0) || 0;
      if (originalPrice <= 0) {
        originalPrice = await resolveDealPrice(chat.serviceId, chat.itemId);
      }

      let normalizedValue = Number(discountValue);
      if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
        return NextResponse.json({ success: false, message: 'Nilai diskon tidak valid' }, { status: 400 });
      }

      let amount = 0;
      if (discountType === 'percent') {
        if (normalizedValue > 100) normalizedValue = 100;
        amount = Math.round((normalizedValue / 100) * originalPrice);
      } else if (discountType === 'amount') {
        amount = Math.round(normalizedValue);
      } else {
        return NextResponse.json({ success: false, message: 'Tipe diskon tidak valid' }, { status: 400 });
      }

      if (amount > originalPrice) amount = originalPrice;
      const finalPrice = Math.max(originalPrice - amount, 0);
      const discount = { type: discountType, value: normalizedValue, amount };

      await query(
        `UPDATE deals
         SET discount = ?, original_price = ?, final_price = ?, discount_updated_at = ?
         WHERE id = ?`,
        [JSON.stringify(discount), originalPrice, finalPrice, new Date().toISOString(), existingDealRow.id]
      );

      const dealForInvoice = {
        id: existingDealRow.id,
        customerId: existingDealRow.customer_id,
        vendorId: existingDealRow.vendor_id,
        serviceId: existingDealRow.service_id
      };
      await upsertPendingInvoice(dealForInvoice, finalPrice);

      await createNotification(
        existingDealRow.customer_id,
        'deal_discount_applied',
        `Vendor memberikan diskon. Harga akhir: Rp ${finalPrice.toLocaleString('id-ID')}`,
        chatId,
        {
          vendorId: existingDealRow.vendor_id,
          serviceId: existingDealRow.service_id,
          finalPrice,
          amount
        }
      );

      const refreshedDealRow = await getLatestDealByChatId(chatId);
      const refreshedChat = mapChatRow(await getChatById(chatId));
      return NextResponse.json({
        success: true,
        message: 'Diskon berhasil diterapkan',
        data: { deal: mapDealRow(refreshedDealRow, refreshedChat), chat: refreshedChat }
      }, { status: 200 });
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });
  } catch (error) {
    console.error('Error processing deal:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ success: false, message: 'chatId diperlukan' }, { status: 400 });
    }

    const chatRow = await getChatById(chatId);
    const chat = mapChatRow(chatRow);
    const dealRow = await getLatestDealByChatId(chatId);

    if (!dealRow) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    // If chat cycle has been reset, hide previous completed/cancelled/active deal from UI.
    if (!chat?.dealStatus && ['active', 'completed', 'cancelled'].includes(String(dealRow.status || '').toLowerCase())) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    let originalPrice = Number(dealRow.original_price ?? 0) || 0;
    if (originalPrice <= 0 && chat) {
      originalPrice = await resolveDealPrice(chat.serviceId, chat.itemId);
    }

    return NextResponse.json({
      success: true,
      data: mapDealRow(dealRow, chat, originalPrice)
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting deal:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
