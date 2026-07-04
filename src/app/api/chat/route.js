import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function buildActiveChatLookup(serviceId, customerId, itemId) {
  const baseWhere = itemId
    ? 'WHERE service_id = ? AND customer_id = ? AND item_id = ?'
    : 'WHERE service_id = ? AND customer_id = ? AND item_id IS NULL';
  const params = itemId ? [serviceId, customerId, itemId] : [serviceId, customerId];

  return {
    sql: `SELECT * FROM chats ${baseWhere} AND (deal_status IS NULL OR deal_status <> ?) ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1`,
    params: [...params, 'closed']
  };
}

// Format date untuk MySQL DATETIME(3)
function formatMySQLDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

// GET - Load existing chat or return null if not found
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const serviceId = searchParams.get('serviceId');
    const customerId = searchParams.get('customerId');
    const itemId = searchParams.get('itemId');

    if (chatId) {
      const chats = await query(
        'SELECT * FROM chats WHERE id = ?',
        [chatId]
      );
      const chat = chats[0] || null;
      if (chat && chat.messages) {
        chat.messages = typeof chat.messages === 'string' ? JSON.parse(chat.messages) : chat.messages;
      }
      return NextResponse.json({ success: true, data: chat });
    }

    if (!serviceId || !customerId) {
      return NextResponse.json(
        { success: false, message: 'serviceId dan customerId required' },
        { status: 400 }
      );
    }

    const lookup = buildActiveChatLookup(serviceId, customerId, itemId);
    const chats = await query(lookup.sql, lookup.params);
    
    const chat = chats[0] || null;
    if (chat && chat.messages) {
      chat.messages = typeof chat.messages === 'string' ? JSON.parse(chat.messages) : chat.messages;
    }

    return NextResponse.json({ success: true, data: chat });
  } catch (error) {
    console.error('[chat] GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST - Send message
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { 
      serviceId, serviceTitle, vendorId, vendorName, customerId, customerName, 
      itemId, itemName, message, senderId, senderName 
    } = body;

    if (!serviceId || !customerId || !message || !senderId) {
      return NextResponse.json(
        { success: false, message: `Missing required fields. Required: serviceId, customerId, message, senderId` },
        { status: 400 }
      );
    }

    // Find or create chat room
    const lookup = buildActiveChatLookup(serviceId, customerId, itemId);
    const existingChats = await query(lookup.sql, lookup.params);
    
    let chatRoom;
    if (existingChats.length > 0) {
      chatRoom = existingChats[0];
      if (chatRoom.messages) {
        chatRoom.messages = typeof chatRoom.messages === 'string' ? JSON.parse(chatRoom.messages) : chatRoom.messages;
      }
    }

    if (!chatRoom) {
      const chatId = randomUUID();
      const messages = [{
        id: randomUUID(),
        senderId,
        senderName: senderName || 'Unknown',
        message,
        timestamp: new Date().toISOString()
      }];

      const createdAt = formatMySQLDate();

      await query(
        `INSERT INTO chats (id, service_id, service_title, vendor_id, vendor_name, customer_id, customer_name, item_id, item_name, messages, created_at, deal_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chatId,
          serviceId,
          serviceTitle || 'Unknown',
          vendorId || null,
          vendorName || 'Unknown',
          customerId,
          customerName || 'Unknown',
          itemId || null,
          itemName || null,
          JSON.stringify(messages),
          createdAt,
          null
        ]
      );

      chatRoom = {
        id: chatId,
        service_id: serviceId,
        service_title: serviceTitle || 'Unknown',
        vendor_id: vendorId || null,
        vendor_name: vendorName || 'Unknown',
        customer_id: customerId,
        customer_name: customerName || 'Unknown',
        item_id: itemId || null,
        item_name: itemName || null,
        messages,
        created_at: createdAt,
        deal_status: null
      };
    } else {
      const newMessage = {
        id: randomUUID(),
        senderId,
        senderName: senderName || 'Unknown',
        message,
        timestamp: new Date().toISOString()
      };

      chatRoom.messages.push(newMessage);

      await query(
        'UPDATE chats SET messages = ? WHERE id = ?',
        [JSON.stringify(chatRoom.messages), chatRoom.id]
      );
    }

    // Convert snake_case to camelCase for response
    const responseChat = {
      id: chatRoom.id,
      serviceId: chatRoom.service_id,
      serviceTitle: chatRoom.service_title,
      vendorId: chatRoom.vendor_id,
      vendorName: chatRoom.vendor_name,
      customerId: chatRoom.customer_id,
      customerName: chatRoom.customer_name,
      itemId: chatRoom.item_id,
      itemName: chatRoom.item_name,
      messages: chatRoom.messages,
      createdAt: chatRoom.created_at,
      dealStatus: chatRoom.deal_status
    };

    return NextResponse.json({ success: true, data: responseChat }, { status: 201 });
  } catch (error) {
    console.error('[chat] POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
