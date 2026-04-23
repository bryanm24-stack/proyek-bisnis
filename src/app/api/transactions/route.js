import fs from 'fs';
import path from 'path';

const transactionsFile = path.join(process.cwd(), 'transactions.json');
const invoicesFile = path.join(process.cwd(), 'invoices.json');
const dealsFile = path.join(process.cwd(), 'deals.json');

// Ensure JSON files exist
const ensureTransactionsFile = () => {
  if (!fs.existsSync(transactionsFile)) {
    fs.writeFileSync(transactionsFile, JSON.stringify([], null, 2));
  }
};

const ensureInvoicesFile = () => {
  if (!fs.existsSync(invoicesFile)) {
    fs.writeFileSync(invoicesFile, JSON.stringify([], null, 2));
  }
};

const ensureDealsFile = () => {
  if (!fs.existsSync(dealsFile)) {
    fs.writeFileSync(dealsFile, JSON.stringify([], null, 2));
  }
};

export async function GET(request) {
  try {
    ensureTransactionsFile();
    const data = fs.readFileSync(transactionsFile, 'utf-8');
    const transactions = JSON.parse(data);
    
    return Response.json(transactions);
  } catch (error) {
    console.error('Error reading transactions:', error);
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    ensureTransactionsFile();
    ensureInvoicesFile();
    ensureDealsFile();
    
    const transactionsData = fs.readFileSync(transactionsFile, 'utf-8');
    let transactions = JSON.parse(transactionsData);
    
    // Add new transaction
    const identityVerification = body.identityVerification
      ? {
          ...body.identityVerification,
          status: body.identityVerification.status || 'pending',
          reviewedAt: body.identityVerification.reviewedAt || null,
          reviewedBy: body.identityVerification.reviewedBy || null,
          adminNotes: body.identityVerification.adminNotes || ''
        }
      : null;

    const newTransaction = {
      ...body,
      identityVerification,
      createdAt: new Date().toISOString()
    };
    
    transactions.push(newTransaction);
    
    // Write transaction
    fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2));

    // If pay_after payment, create invoice and update deal
    if (body.paymentType === 'pay_after') {
      const invoicesData = fs.readFileSync(invoicesFile, 'utf-8');
      let invoices = JSON.parse(invoicesData);
      
      // Create invoice for remaining 80% payment
      const paymentDeadline = new Date();
      paymentDeadline.setDate(paymentDeadline.getDate() + 2); // 2 days from now
      
      const newInvoice = {
        id: `INV-${Date.now()}`,
        dealId: body.dealId,
        customerId: body.userId,
        transactionId: body.id,
        remainingPayment: body.remainingPayment,
        paymentDeadline: paymentDeadline.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        paidAt: null
      };
      
      invoices.push(newInvoice);
      fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2));

      // Update deal with payment info
      try {
        const dealsData = fs.readFileSync(dealsFile, 'utf-8');
        let deals = JSON.parse(dealsData);
        
        const dealIndex = deals.findIndex(d => d.id === body.dealId);
        if (dealIndex !== -1) {
          deals[dealIndex] = {
            ...deals[dealIndex],
            paymentType: 'pay_after',
            downPayment: body.downPayment,
            remainingPayment: body.remainingPayment,
            invoiceStatus: 'pending',
            paymentDeadline: paymentDeadline.toISOString(),
            invoiceId: newInvoice.id
          };
          fs.writeFileSync(dealsFile, JSON.stringify(deals, null, 2));
        }
      } catch (dealError) {
        console.warn('Could not update deal:', dealError);
      }
    }
    
    return Response.json({ success: true, transaction: newTransaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
