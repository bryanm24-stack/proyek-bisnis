import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    const chats = await query(
      'SELECT * FROM chats WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
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
    console.error('Error getting customer chats:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
