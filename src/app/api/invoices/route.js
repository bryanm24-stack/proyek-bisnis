import { query } from '@/lib/db';

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

function mapInvoiceRow(row) {
  const basePrice = toNumber(row.base_price);
  const quantity = toNumber(row.quantity, 1);
  const durationDays = toNumber(row.duration_days, 1);
  const serviceFee = toNumber(row.service_fee);
  const txTotal = toNumber(row.tx_total_amount);
  const remainingPayment = toNumber(row.remaining_payment);
  const discountAmount = Math.max((basePrice * quantity * durationDays) - Math.max(txTotal - serviceFee, 0), 0);
  const discountedSubtotal = Math.max(txTotal - serviceFee, 0);
  const totalAmount = txTotal > 0 ? txTotal : (discountedSubtotal + serviceFee);

  return {
    id: row.id,
    dealId: row.deal_id,
    customerId: row.customer_id,
    vendorId: row.vendor_id,
    serviceId: row.service_id,
    transactionId: row.transaction_id,
    remainingPayment,
    paymentDeadline: row.payment_deadline,
    paymentMethod: row.payment_method,
    paymentType: row.payment_type,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    paymentTransactionId: row.payment_transaction_id,
    notes: row.notes || '',
    customerName: row.customer_name || 'Customer',
    vendorName: row.vendor_name || 'Vendor',
    serviceTitle: row.service_title || 'Item sewa',
    serviceImage: row.service_image || '',
    quantity,
    durationDays,
    basePrice,
    discountAmount,
    discountedSubtotal,
    serviceFee,
    totalAmount,
    promo: row.promo_id
      ? {
          id: row.promo_id,
          code: row.promo_title || row.promo_id,
          title: row.promo_title || row.promo_id,
          price: row.promo_price !== null && row.promo_price !== undefined ? toNumber(row.promo_price) : null
        }
      : null,
    collaborationStatus: row.status === 'paid' ? 'completed' : 'ongoing'
  };
}

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const vendorId = searchParams.get('vendorId');
    const statusRaw = searchParams.get('status');
    const status = statusRaw && statusRaw !== 'all' ? statusRaw : null;

    const conditions = [];
    const params = [];

    if (customerId) {
      conditions.push('i.customer_id = ?');
      params.push(String(customerId));
    }
    if (vendorId) {
      conditions.push('i.vendor_id = ?');
      params.push(String(vendorId));
    }
    if (status) {
      conditions.push('i.status = ?');
      params.push(String(status));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT
         i.*,
         c.name AS customer_name,
         v.name AS vendor_name,
         s.title AS service_title,
         COALESCE(
           JSON_UNQUOTE(JSON_EXTRACT(s.images, '$[0]')),
           ''
         ) AS service_image,
         t.base_price,
         t.quantity,
         t.duration_days,
         t.service_fee,
         t.total_amount AS tx_total_amount,
         t.promo_id,
         p.title AS promo_title,
         p.promo_price
       FROM invoices i
       LEFT JOIN users c ON c.id = i.customer_id
       LEFT JOIN users v ON v.id = i.vendor_id
       LEFT JOIN services s ON s.id = i.service_id
       LEFT JOIN transactions t ON t.id = COALESCE(i.payment_transaction_id, i.transaction_id)
       LEFT JOIN promos p ON p.id = t.promo_id
       ${whereClause}
       ORDER BY COALESCE(i.created_at, i.payment_deadline) DESC`,
      params
    );

    return Response.json(rows.map(mapInvoiceRow));
  } catch (error) {
    console.error('Error reading invoices from SQL:', error);
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const id = body.id || `INV-${Date.now()}`;

    await query(
      `INSERT INTO invoices (
        id, deal_id, customer_id, vendor_id, service_id, transaction_id,
        remaining_payment, payment_deadline, payment_method, payment_type,
        status, created_at, paid_at, payment_transaction_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.dealId || null,
        body.customerId || null,
        body.vendorId || null,
        body.serviceId || null,
        body.transactionId || null,
        toNumber(body.remainingPayment),
        body.paymentDeadline || null,
        body.paymentMethod || null,
        body.paymentType || 'full',
        body.status || 'pending',
        new Date().toISOString(),
        body.paidAt || null,
        body.paymentTransactionId || null,
        body.notes || ''
      ]
    );

    return Response.json({ success: true, invoice: { id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { invoiceId, status, paymentMethod, transactionId } = body;

    if (!invoiceId) {
      return Response.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    const existing = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
    if (existing.length === 0) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    await query(
      `UPDATE invoices
       SET status = ?,
           payment_method = COALESCE(?, payment_method),
           paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END,
           payment_transaction_id = COALESCE(?, payment_transaction_id)
       WHERE id = ?`,
      [
        status || existing[0].status,
        paymentMethod || null,
        status || existing[0].status,
        new Date().toISOString(),
        transactionId || null,
        invoiceId
      ]
    );

    if ((status || existing[0].status) === 'paid' && existing[0].deal_id) {
      await query(
        `UPDATE deals
         SET invoice_status = 'paid',
             payment_confirmed_at = ?,
             status = CASE WHEN status = 'agreed' THEN 'active' ELSE status END,
             completed_at = CASE WHEN completed_at IS NULL THEN ? ELSE completed_at END
         WHERE id = ?`,
        [new Date().toISOString(), new Date().toISOString(), existing[0].deal_id]
      );
    }

    const updated = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
    return Response.json({ success: true, invoice: updated[0] });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
