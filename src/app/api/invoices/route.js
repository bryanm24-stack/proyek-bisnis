import fs from 'fs';
import path from 'path';

const invoicesFile = path.join(process.cwd(), 'invoices.json');
const transactionsFile = path.join(process.cwd(), 'transactions.json');
const dealsFile = path.join(process.cwd(), 'deals.json');

// Ensure invoices.json exists
const ensureInvoicesFile = () => {
  if (!fs.existsSync(invoicesFile)) {
    fs.writeFileSync(invoicesFile, JSON.stringify([], null, 2));
  }
};

export async function GET(request) {
  try {
    ensureInvoicesFile();
    
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    const data = fs.readFileSync(invoicesFile, 'utf-8');
    let invoices = JSON.parse(data);

    // Filter by customerId if provided
    if (customerId) {
      invoices = invoices.filter(inv => inv.customerId === customerId);
    }

    // Filter by status if provided
    if (status) {
      invoices = invoices.filter(inv => inv.status === status);
    }

    // Sort by deadline (earliest first)
    invoices.sort((a, b) => new Date(a.paymentDeadline) - new Date(b.paymentDeadline));

    return Response.json(invoices);
  } catch (error) {
    console.error('Error reading invoices:', error);
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    ensureInvoicesFile();
    const data = fs.readFileSync(invoicesFile, 'utf-8');
    let invoices = JSON.parse(data);

    // Create new invoice
    const newInvoice = {
      id: `INV-${Date.now()}`,
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
    const data = fs.readFileSync(invoicesFile, 'utf-8');
    let invoices = JSON.parse(data);

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

    // Update deal status if invoice is paid
    if (status === 'paid') {
      try {
        const dealsData = fs.readFileSync(dealsFile, 'utf-8');
        let deals = JSON.parse(dealsData);

        const dealIndex = deals.findIndex(d => d.id === updatedInvoice.dealId);
        if (dealIndex !== -1) {
          deals[dealIndex] = {
            ...deals[dealIndex],
            invoiceStatus: 'paid'
          };
          fs.writeFileSync(dealsFile, JSON.stringify(deals, null, 2));
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
