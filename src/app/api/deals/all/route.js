import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function parseJsonSafe(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapDeal(row) {
  const discount = parseJsonSafe(row.discount, null);
  return {
    id: row.id,
    chatId: row.chat_id,
    customerId: row.customer_id,
    vendorId: row.vendor_id,
    serviceId: row.service_id,
    customerAccepted: row.customer_accepted,
    vendorAccepted: row.vendor_accepted,
    status: row.status,
    inspectionStatus: row.inspection_status || row.inspectionStatus || null,
    refundAmount: Number(row.refund_amount || row.refundAmount || 0),
    refundReason: row.refund_reason || row.refundReason || null,
    refundRequestedAt: row.refund_requested_at || row.refundRequestedAt || null,
    refundedAt: row.refunded_at || row.refundedAt || null,
    createdAt: row.created_at,
    agreedAt: row.agreed_at,
    discount,
    discountGiven: Boolean(discount && Number(discount.amount || 0) > 0),
    originalPrice: Number(row.original_price || 0),
    finalPrice: Number(row.final_price || 0),
    discountUpdatedAt: row.discount_updated_at,
    invoiceStatus: row.invoice_status,
    paymentConfirmedAt: row.payment_confirmed_at,
    completedAt: row.completed_at
  };
}

export async function GET(request) {
  try {
    const rows = await query(
      `SELECT
         d.*,
         c.customer_name,
         c.vendor_name,
         c.item_name,
         s.title AS service_title,
         s.short_description,
         s.description,
         s.detail_description,
         s.rating,
         s.rent_count,
         s.price,
         s.location,
         u.name AS vendor_user_name
       FROM deals d
       LEFT JOIN chats c ON c.id = d.chat_id
       LEFT JOIN services s ON s.id = d.service_id
       LEFT JOIN users u ON u.id = d.vendor_id
       ORDER BY COALESCE(d.created_at, NOW()) DESC`
    );

    const enrichedDeals = rows.map((row) => {
      const mapped = mapDeal(row);
      return {
        ...mapped,
        itemName: row.item_name || row.service_title || 'Layanan',
        vendorName: row.vendor_user_name || row.vendor_name || 'Unknown',
        totalPrice: Number(row.price || mapped.finalPrice || mapped.originalPrice || 0),
        customerName: row.customer_name || 'Unknown',
        description: row.description || 'N/A',
        detailDescription: row.detail_description || row.description || 'N/A',
        rating: Number(row.rating || 0),
        rentCount: Number(row.rent_count || 0),
        price: Number(row.price || 0),
        lokasi: row.location || null
      };
    });

    return NextResponse.json(enrichedDeals, { status: 200 });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json([], { status: 200 });
  }
}
