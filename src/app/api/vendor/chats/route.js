import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// GET - Get all chats for vendor
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({
        success: false,
        message: 'vendorId diperlukan'
      }, { status: 400 });
    }

    const chatsPath = path.join(process.cwd(), 'chats.json');
    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);

    // Filter chats untuk vendor ini
    const vendorChats = chats.filter(c => c.vendorId === vendorId);

    return NextResponse.json({
      success: true,
      data: vendorChats
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting vendor chats:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
