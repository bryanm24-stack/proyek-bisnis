import fs from 'fs';
import path from 'path';

const transactionsFile = path.join(process.cwd(), 'transactions.json');

// Ensure transactions.json exists
const ensureTransactionsFile = () => {
  if (!fs.existsSync(transactionsFile)) {
    fs.writeFileSync(transactionsFile, JSON.stringify([], null, 2));
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
    const data = fs.readFileSync(transactionsFile, 'utf-8');
    let transactions = JSON.parse(data);
    
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
    
    // Write back to file
    fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2));
    
    return Response.json({ success: true, transaction: newTransaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
