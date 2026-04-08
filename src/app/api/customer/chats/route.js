import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// GET - Get all chats for customer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: 'customerId diperlukan'
      }, { status: 400 });
    }

    const chatsPath = path.join(process.cwd(), 'chats.json');
    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);

    // Filter chats untuk customer ini
    const customerChats = chats.filter(c => c.customerId === customerId);

    return NextResponse.json({
      success: true,
      data: customerChats
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting customer chats:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
