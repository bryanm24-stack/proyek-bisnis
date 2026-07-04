import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    const chats = await query(
      'SELECT * FROM chats WHERE vendor_id = ? OR customer_id = ? ORDER BY created_at DESC',
      [vendorId, vendorId]
    );

    // Convert to camelCase and parse JSON
    const processedChats = chats.map(chat => ({
      id: chat.id,
      serviceId: chat.service_id,
      serviceTitle: chat.service_title,
      vendorId: chat.vendor_id,
      vendorName: chat.vendor_name,
      customerId: chat.customer_id,
      customerName: chat.customer_name,
      itemId: chat.item_id,
      itemName: chat.item_name,
      messages: typeof chat.messages === 'string' ? JSON.parse(chat.messages) : chat.messages || [],
      createdAt: chat.created_at,
      dealStatus: chat.deal_status
    }));

    return NextResponse.json({
      success: true,
      data: processedChats
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting vendor chats:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
