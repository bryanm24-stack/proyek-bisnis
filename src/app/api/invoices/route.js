import fs from 'fs';
import path from 'path';

const invoicesFile = path.join(process.cwd(), 'invoices.json');
const transactionsFile = path.join(process.cwd(), 'transactions.json');
const dealsFile = path.join(process.cwd(), 'deals.json');
const servicesFile = path.join(process.cwd(), 'services.json');
const promosFile = path.join(process.cwd(), 'promos.json');
const ratingsFile = path.join(process.cwd(), 'ratings.json');
const usersFile = path.join(process.cwd(), 'users.json');

// Global invoice counter file (simple persistent counter)
const invoiceCounterFile = path.join(process.cwd(), 'invoice_counter.json');

function ensureInvoiceCounter() {
  try {
    if (!fs.existsSync(invoiceCounterFile)) {
      fs.writeFileSync(invoiceCounterFile, JSON.stringify({ next: 1 }, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('Could not ensure invoice counter file:', e?.message || e);
  }
}

function getNextInvoiceId() {
  try {
    ensureInvoiceCounter();
    const raw = fs.readFileSync(invoiceCounterFile, 'utf-8');
    const obj = raw ? JSON.parse(raw.replace(/^\uFEFF/, '').trim() || '{}') : {};
    let next = Number(obj.next || 1);
    const id = 'INV-' + String(next).padStart(6, '0');
    // increment and persist
    obj.next = next + 1;
    fs.writeFileSync(invoiceCounterFile, JSON.stringify(obj, null, 2), 'utf-8');
    return id;
  } catch (e) {
    console.warn('Could not read/write invoice counter, falling back to timestamp id:', e?.message || e);
    return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}

// Helper: Normalize ID for consistent comparison
const normalizeId = (id) => String(id || '').trim();

const parseJsonFile = (filePath, fallback = []) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const sanitized = raw.replace(/^\uFEFF/, '').trim();
    if (!sanitized) {
      return fallback;
    }
    return JSON.parse(sanitized);
  } catch (error) {
    console.warn(`Failed parsing JSON file ${path.basename(filePath)}:`, error.message);
    return fallback;
  }
};

// Ensure invoices.json exists
const ensureInvoicesFile = () => {
  if (!fs.existsSync(invoicesFile)) {
    fs.writeFileSync(invoicesFile, JSON.stringify([], null, 2));
  }
};

export async function GET(request) {
  try {
    ensureInvoicesFile();
    const ensureFile = (filePath) => {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }
    };

    ensureFile(transactionsFile);
    ensureFile(dealsFile);
    ensureFile(servicesFile);
    ensureFile(promosFile);
    ensureFile(ratingsFile);
    ensureFile(usersFile);
    
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');

    let invoices = parseJsonFile(invoicesFile, []);
    const transactions = parseJsonFile(transactionsFile, []);
    const deals = parseJsonFile(dealsFile, []);
    const services = parseJsonFile(servicesFile, []);
    const promos = parseJsonFile(promosFile, []);
    const ratings = parseJsonFile(ratingsFile, []);
    const users = parseJsonFile(usersFile, []);

    const findUserName = (id, fallbackLabel) => {
      if (!id) return fallbackLabel;
      const user = users.find((item) => String(item.id) === String(id));
      return user?.name || fallbackLabel;
    };

    // Backfill invoices from historical transactions so old paid/full payments also appear.
    let hasGeneratedInvoices = false;
    transactions
      .filter((item) => (item.dealId || item.promoId) && item.paymentType !== 'invoice_payment')
      .forEach((transaction) => {
        // Improved deduplication using normalizeId for case-insensitive matching
        const alreadyExists = invoices.some(
          (invoice) => normalizeId(invoice.transactionId) === normalizeId(transaction.id) || 
                       (normalizeId(invoice.dealId) === normalizeId(transaction.dealId) && 
                        invoice.paymentType === transaction.paymentType &&
                        invoice.status !== 'pending') // Only match if not pending (avoid overwriting pending invoices)
        );
        if (alreadyExists) return;

        const relatedDeal = deals.find((item) => item.id === transaction.dealId);
        const relatedPromo = promos.find((item) => String(item.id) === String(transaction.promoId));
        const isPayAfter = transaction.paymentType === 'pay_after';
        const nowIso = new Date().toISOString();
        const deadlineDate = new Date(transaction.timestamp || nowIso);
        deadlineDate.setDate(deadlineDate.getDate() + 2);

        invoices.push({
          id: getNextInvoiceId(),
          dealId: transaction.dealId || null,
          promoId: transaction.promoId || null,
          customerId: transaction.userId || relatedDeal?.customerId || null,
          vendorId: relatedDeal?.vendorId || relatedPromo?.vendorId || transaction.vendorId || null,
          serviceId: relatedDeal?.serviceId || null,
          transactionId: transaction.id,
          remainingPayment: isPayAfter
            ? Number(transaction.remainingPayment ?? 0)
            : Number(transaction.totalAmount ?? transaction.amount ?? 0),
          paymentDeadline: isPayAfter ? deadlineDate.toISOString() : (transaction.timestamp || nowIso),
          paymentMethod: transaction.paymentMethod || null,
          paymentType: transaction.paymentType || 'full',
          status: isPayAfter ? 'pending' : 'paid',
          createdAt: transaction.createdAt || nowIso,
          paidAt: isPayAfter ? null : (transaction.timestamp || nowIso),
          paymentTransactionId: isPayAfter ? null : transaction.id,
          notes: transaction.notes || '',
          serviceTitle: relatedPromo?.title || transaction.promo?.title || null,
          promo: transaction.promo || (relatedPromo ? {
            id: relatedPromo.id,
            title: relatedPromo.title,
            promoPrice: relatedPromo.promoPrice,
            image: relatedPromo.image,
            description: relatedPromo.description
          } : null)
        });
        hasGeneratedInvoices = true;
      });

    // Backfill pending invoices directly from agreed deals that are not paid yet.
    deals
      .filter((deal) => deal?.id && deal?.status === 'agreed' && deal?.invoiceStatus !== 'paid')
      .forEach((deal) => {
        // Improved deduplication: check if invoice already exists with same dealId
        const alreadyExists = invoices.some((invoice) => normalizeId(invoice.dealId) === normalizeId(deal.id));
        if (alreadyExists) return;

        const baseDate = new Date(deal.discountUpdatedAt || deal.agreedAt || Date.now());
        const deadline = new Date(baseDate);
        deadline.setDate(deadline.getDate() + 2);

        const relatedService = services.find((item) => String(item.id) === String(deal.serviceId));
        const firstItem = Array.isArray(relatedService?.items) ? relatedService.items[0] : null;
        const firstItemPrice = Number(
          (relatedService?.type === 'jasa' ? firstItem?.hargaSesi : firstItem?.hargaPcs) ??
          firstItem?.price ??
          0
        );

        const finalAmount = Number(
          deal.finalPrice ??
          deal.originalPrice ??
          deal.totalPrice ??
          deal.price ??
          relatedService?.price ??
          relatedService?.harga ??
          firstItemPrice ??
          0
        );

        invoices.push({
          id: getNextInvoiceId(),
          dealId: deal.id,
          customerId: deal.customerId || null,
          vendorId: deal.vendorId || null,
          serviceId: deal.serviceId || null,
          transactionId: null,
          remainingPayment: finalAmount,
          paymentDeadline: deadline.toISOString(),
          paymentMethod: null,
          paymentType: 'deal_pending',
          status: 'pending',
          createdAt: baseDate.toISOString(),
          paidAt: null,
          paymentTransactionId: null,
          notes: 'Menunggu pembayaran setelah deal disepakati.'
        });
        hasGeneratedInvoices = true;
      });

    if (hasGeneratedInvoices) {
      fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2));
    }

    const enrichInvoice = (invoice) => {
      const relatedTransaction = transactions.find((item) => item.id === invoice.transactionId || item.invoiceId === invoice.id);
      const relatedDeal = deals.find((item) => item.id === invoice.dealId);
      const relatedPromo = promos.find((item) => String(item.id) === String(invoice.promoId || relatedTransaction?.promoId));
      const relatedService = relatedDeal
        ? services.find((item) => String(item.id) === String(relatedDeal.serviceId))
        : null;

      const originalPrice = Number(
        relatedDeal?.originalPrice ??
        relatedTransaction?.basePrice ??
        relatedService?.price ??
        relatedService?.harga ??
        0
      );

      const discountAmount = Number(
        relatedTransaction?.discountAmount ??
        relatedDeal?.discount?.amount ??
        0
      );

      const subtotal = Number(
        relatedTransaction?.discountedSubtotal ??
        (originalPrice * Number(relatedTransaction?.quantity || 1) * Number(relatedTransaction?.durationDays || 1)) - discountAmount
      );

      const serviceFee = Number(relatedTransaction?.serviceFee ?? 0);
      const totalAmount = Number(
        relatedTransaction?.totalAmount ??
        (subtotal + serviceFee)
      );

      const customerIdForInvoice = String(invoice.customerId || relatedDeal?.customerId || relatedTransaction?.userId || '');
      const serviceIdForInvoice = String(relatedDeal?.serviceId || invoice.serviceId || '');
      const dealIdForInvoice = String(invoice.dealId || '');
      const hasCustomerRating = Boolean(
        dealIdForInvoice
          ? ratings.find((item) => String(item.customerId) === customerIdForInvoice && String(item.dealId || '') === dealIdForInvoice)
          : ratings.find((item) => String(item.customerId) === customerIdForInvoice && String(item.serviceId) === serviceIdForInvoice)
      );

      return {
        ...invoice,
        customerId: invoice.customerId || relatedDeal?.customerId || relatedTransaction?.userId || null,
        vendorId: invoice.vendorId || relatedDeal?.vendorId || relatedPromo?.vendorId || relatedTransaction?.vendorId || null,
        serviceId: relatedDeal?.serviceId || invoice.serviceId || null,
        customerName: relatedDeal?.customerName || relatedTransaction?.customerName || invoice.customerName || findUserName(invoice.customerId || relatedDeal?.customerId || relatedTransaction?.userId, 'Customer'),
        vendorName: relatedDeal?.vendorName || relatedPromo?.vendorName || relatedTransaction?.vendorName || invoice.vendorName || findUserName(invoice.vendorId || relatedDeal?.vendorId || relatedPromo?.vendorId || relatedTransaction?.vendorId, 'Vendor'),
        serviceTitle: relatedService?.title || relatedService?.namaBarang || relatedService?.namaJasa || relatedDeal?.itemName || relatedDeal?.serviceTitle || relatedPromo?.title || relatedTransaction?.promo?.title || invoice.serviceTitle || 'Item sewa',
        serviceImage: relatedService?.images?.[0] || relatedDeal?.image || relatedPromo?.image || relatedTransaction?.image || '',
        dealStatus: relatedDeal?.status || relatedDeal?.invoiceStatus || 'pending',
        paymentType: relatedTransaction?.paymentType || relatedDeal?.paymentType || invoice.paymentType || 'pay_after',
        quantity: relatedTransaction?.quantity || relatedDeal?.quantity || invoice.quantity || 1,
        durationDays: relatedTransaction?.durationDays || relatedDeal?.durationDays || invoice.durationDays || 1,
        basePrice: originalPrice,
        discountAmount,
        discountedSubtotal: subtotal,
        serviceFee,
        totalAmount,
        promo: relatedTransaction?.promo || relatedDeal?.promo || relatedPromo || invoice.promo || null,
        notes: relatedTransaction?.notes || invoice.notes || '',
        startDate: relatedTransaction?.startDate || invoice.startDate || null,
        dueDateLabel: invoice.paymentDeadline ? new Date(invoice.paymentDeadline).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
        hasCustomerRating,
        collaborationStatus: invoice.status === 'paid' ? 'completed' : 'ongoing'
      };
    };

    let enrichedInvoices = invoices.map(enrichInvoice);

    // Filter by customerId/vendorId if provided
    if (customerId) {
      enrichedInvoices = enrichedInvoices.filter((inv) => String(inv.customerId) === String(customerId));
    }
    if (vendorId) {
      enrichedInvoices = enrichedInvoices.filter((inv) => String(inv.vendorId) === String(vendorId));
    }

    // Filter by status if provided
    if (status) {
      enrichedInvoices = enrichedInvoices.filter((inv) => inv.status === status);
    }

    // Sort by latest first
    enrichedInvoices.sort((a, b) => new Date(b.createdAt || b.paymentDeadline || 0) - new Date(a.createdAt || a.paymentDeadline || 0));

    return Response.json(enrichedInvoices);
  } catch (error) {
    console.error('Error reading invoices:', error);
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    ensureInvoicesFile();
    let invoices = parseJsonFile(invoicesFile, []);

    // Create new invoice
    const newInvoice = {
      id: getNextInvoiceId(),
      dealId: body.dealId,
      customerId: body.customerId,
      vendorId: body.vendorId,
      transactionId: body.transactionId,
      remainingPayment: body.remainingPayment,
      paymentDeadline: body.paymentDeadline,
      paymentMethod: body.paymentMethod || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      paidAt: null,
      cardDetails: body.cardDetails || null,
      qrCode: body.qrCode || null
    };

    invoices.push(newInvoice);
    fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2));

    return Response.json({ success: true, invoice: newInvoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { invoiceId, status, paymentMethod, transactionId } = body;

    ensureInvoicesFile();
    let invoices = parseJsonFile(invoicesFile, []);

    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Update invoice
    const updatedInvoice = {
      ...invoices[invoiceIndex],
      status,
      paymentMethod: paymentMethod || invoices[invoiceIndex].paymentMethod,
      paidAt: status === 'paid' ? new Date().toISOString() : invoices[invoiceIndex].paidAt,
      paymentTransactionId: transactionId || invoices[invoiceIndex].paymentTransactionId
    };

    invoices[invoiceIndex] = updatedInvoice;
    fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2));

    // Update deal to mark invoice as paid, but do NOT mark the whole deal as completed here.
    // Completion should only occur after the return/inspection flow completes.
    if (status === 'paid') {
      try {
        const dealsData = fs.readFileSync(dealsFile, 'utf-8');
        let deals = JSON.parse(dealsData);

        const dealIndex = deals.findIndex(d => d.id === updatedInvoice.dealId);
        if (dealIndex !== -1) {
          // Only update invoice status and record payment timestamp.
          const existing = deals[dealIndex];
          const updated = {
            ...existing,
            invoiceStatus: 'paid',
            paymentConfirmedAt: new Date().toISOString()
          };

          // If the deal was in 'agreed' state (waiting payment), move it to 'active'
          // but do NOT mark as 'completed' here. Also set borrowDate if missing.
          if (String(existing.status) === 'agreed') {
            updated.status = 'active';
            if (!existing.borrowDate) {
              updated.borrowDate = new Date().toISOString();
            }
          }

          deals[dealIndex] = updated;
          fs.writeFileSync(dealsFile, JSON.stringify(deals, null, 2));

          // Also reserve/decrease stock in services.json if there is a matching booking
          try {
            const servicesRaw = fs.readFileSync(servicesFile, 'utf-8');
            const services = servicesRaw ? JSON.parse(servicesRaw.replace(/^\uFEFF/, '').trim() || '[]') : [];
            const svcIndex = services.findIndex(s => String(s.id) === String(existing.serviceId));
            if (svcIndex !== -1) {
              const svc = services[svcIndex];
              // Find booking by dealId / transactionId / bookingId
              const booking = (svc.bookings || []).find(b => String(b.dealId) === String(existing.id) || String(b.transactionId || '') === String(updatedInvoice.paymentTransactionId || '') || String(b.id || '') === String(existing.bookingId || ''));
              if (booking && !booking.stockReserved) {
                const qty = Number(booking.quantity || 1);
                // Decrease availableQuantity safely
                svc.availableQuantity = Math.max(0, Number(svc.availableQuantity || 0) - qty);
                // Mark booking reserved
                booking.stockReserved = true;

                // Try to also decrement specific item stock if chat->itemId exists and service.items contains it
                try {
                  const chatsFile = path.join(process.cwd(), 'chats.json');
                  const chatsRaw = fs.readFileSync(chatsFile, 'utf-8');
                  const chats = chatsRaw ? JSON.parse(chatsRaw.replace(/^\uFEFF/, '').trim() || '[]') : [];
                  const chat = chats.find(c => String(c.id) === String(existing.chatId));
                  const itemId = chat?.itemId || existing.itemId || null;
                  if (itemId && Array.isArray(svc.items)) {
                    const itemIndex = svc.items.findIndex(it => String(it.id) === String(itemId));
                    if (itemIndex !== -1 && typeof svc.items[itemIndex].stok === 'number') {
                      svc.items[itemIndex].stok = Math.max(0, Number(svc.items[itemIndex].stok || 0) - qty);
                    }
                  }
                } catch (e) {
                  console.warn('Could not decrement item stok:', e?.message || e);
                }
                // Optionally decrease individual item stok if service has items and a mapping is clear
                // (Not implemented here - we update overall availableQuantity)
                // persist
                services[svcIndex] = svc;
                fs.writeFileSync(servicesFile, JSON.stringify(services, null, 2));
              }
                else {
                  // Fallback: booking not found or already reserved. Try to derive quantity from transactions.
                  try {
                    const transactionsRaw = fs.readFileSync(transactionsFile, 'utf-8');
                    const transactions = transactionsRaw ? JSON.parse(transactionsRaw.replace(/^\uFEFF/, '').trim() || '[]') : [];
                    const trx = transactions.find(t => String(t.id) === String(updatedInvoice.paymentTransactionId) || String(t.dealId) === String(existing.id));
                    const qtyFromTrx = trx ? Number(trx.quantity || trx.requestedQuantity || 1) : 0;
                    const qtyUse = qtyFromTrx > 0 ? qtyFromTrx : 0;
                    if (qtyUse > 0) {
                      // decrease availableQuantity by qtyUse if not already reserved
                      svc.availableQuantity = Math.max(0, Number(svc.availableQuantity || 0) - qtyUse);

                      // Try to decrement item stok using deal/chat mapping as before
                      try {
                        const chatsFile = path.join(process.cwd(), 'chats.json');
                        const chatsRaw = fs.readFileSync(chatsFile, 'utf-8');
                        const chats = chatsRaw ? JSON.parse(chatsRaw.replace(/^\uFEFF/, '').trim() || '[]') : [];
                        const chat = chats.find(c => String(c.id) === String(existing.chatId));
                        const itemId = chat?.itemId || existing.itemId || null;
                        if (itemId && Array.isArray(svc.items)) {
                          const itemIndex = svc.items.findIndex(it => String(it.id) === String(itemId));
                          if (itemIndex !== -1 && typeof svc.items[itemIndex].stok === 'number') {
                            svc.items[itemIndex].stok = Math.max(0, Number(svc.items[itemIndex].stok || 0) - qtyUse);
                          }
                        }
                      } catch (e) {
                        console.warn('Could not decrement item stok (fallback):', e?.message || e);
                      }

                      services[svcIndex] = svc;
                      fs.writeFileSync(servicesFile, JSON.stringify(services, null, 2));
                    }
                  } catch (e) {
                    // ignore
                  }
                }
            }
          } catch (e) {
            console.warn('Could not update service stock on payment:', e?.message || e);
          }
        }
      } catch (dealError) {
        console.warn('Could not update deal:', dealError);
      }
    }

    return Response.json({ success: true, invoice: updatedInvoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
