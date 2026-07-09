import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Ensure chats table has is_read and last_sender_id columns
async function ensureChatsTableSchema() {
  try {
    const columns = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chats'`
    );
    const columnNames = new Set(columns.map(c => c.COLUMN_NAME.toLowerCase()));
    
    if (!columnNames.has('is_read')) {
      await query(
        `ALTER TABLE chats ADD COLUMN is_read TINYINT(1) DEFAULT 0 AFTER messages`
      );
    }

    if (!columnNames.has('last_sender_id')) {
      await query(
        `ALTER TABLE chats ADD COLUMN last_sender_id VARCHAR(255) AFTER is_read`
      );
    }
  } catch (err) {
    console.warn('Warning checking chats table schema:', err?.message);
  }
}

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
    await ensureChatsTableSchema();

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
    await ensureChatsTableSchema();

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
        `INSERT INTO chats (id, service_id, service_title, vendor_id, vendor_name, customer_id, customer_name, item_id, item_name, messages, created_at, deal_status, last_sender_id, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
          null,
          senderId
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
        deal_status: null,
        last_sender_id: senderId,
        is_read: 0
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

      // Update messages, track last_sender_id, and reset is_read to 0 (new message for recipient)
      await query(
        'UPDATE chats SET messages = ?, is_read = 0, last_sender_id = ? WHERE id = ?',
        [JSON.stringify(chatRoom.messages), senderId, chatRoom.id]
      );

      chatRoom.last_sender_id = senderId;
      chatRoom.is_read = 0;

      // Send notification to recipient
      const recipientId = senderId === customerId ? vendorId : customerId;
      if (recipientId) {
        try {
          await fetch(new URL('/api/notifications', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: recipientId,
              type: 'chat_message',
              message: message,
              senderName: senderName || 'Unknown',
              relatedId: chatRoom.id,
              relatedData: {
                chatId: chatRoom.id,
                serviceId: serviceId,
                serviceTitle: serviceTitle
              }
            })
          }).catch(err => console.error('Error creating notification:', err));
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }
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
      dealStatus: chatRoom.deal_status,
      lastSenderId: chatRoom.last_sender_id,
      isRead: chatRoom.is_read,
      last_sender_id: chatRoom.last_sender_id,
      is_read: chatRoom.is_read
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

// PATCH - Mark chat as read
export async function PATCH(request) {
  try {
    await ensureChatsTableSchema();

    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'chatId diperlukan' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE chats SET is_read = 1 WHERE id = ?',
      [chatId]
    );

    const [updatedChat] = await query(
      'SELECT * FROM chats WHERE id = ?',
      [chatId]
    );

    if (updatedChat && updatedChat.messages) {
      updatedChat.messages = typeof updatedChat.messages === 'string' ? JSON.parse(updatedChat.messages) : updatedChat.messages;
    }

    return NextResponse.json({ success: true, data: updatedChat }, { status: 200 });
  } catch (error) {
    console.error('[chat] PATCH error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
