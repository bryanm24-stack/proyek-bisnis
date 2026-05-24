import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { NextResponse } from 'next/server';

const CHATS_FILE = path.join(process.cwd(), 'chats.json');

// HELPER: Baca chats.json
async function readChatsFile() {
  try {
    const data = await fs.readFile(CHATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[chat] Failed to read chats file:', error.message);
    return [];
  }
}

// HELPER: Simpan chats.json
async function writeChatsFile(chats) {
  try {
    await fs.writeFile(CHATS_FILE, JSON.stringify(chats, null, 2));
    return true;
  } catch (error) {
    console.error('[chat] Failed to write chats file:', error.message);
    throw error;
  }
}

function findChatByContext(chats, serviceId, customerId, itemId) {
  return chats.find(c => {
    const sameService = String(c.serviceId) === String(serviceId);
    const sameCustomer = String(c.customerId) === String(customerId);
    const sameItem = itemId
      ? String(c.itemId || '') === String(itemId)
      : !c.itemId;

    return sameService && sameCustomer && sameItem;
  });
}

// GET - Load existing chat or return null if not found
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const serviceId = searchParams.get('serviceId');
    const customerId = searchParams.get('customerId');
    const itemId = searchParams.get('itemId');

    const chats = await readChatsFile();

    // If chatId provided, return by id
    if (chatId) {
      const chatById = chats.find(c => String(c.id) === String(chatId));
      return NextResponse.json({ success: true, data: chatById || null });
    }

    if (!serviceId || !customerId) {
      return NextResponse.json(
        { success: false, message: 'serviceId dan customerId required' },
        { status: 400 }
      );
    }

    const chat = findChatByContext(chats, serviceId, customerId, itemId);

    return NextResponse.json({ success: true, data: chat || null });
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
    // 1. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 2. Extract fields
    const { serviceId, serviceTitle, vendorId, vendorName, customerId, customerName, itemId, itemName, message, senderId, senderName } = body;

    // 3. Validate required fields
    if (!serviceId || !vendorId || !customerId || !message || !senderId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 4. Read chats
    const chats = await readChatsFile();

    // 5. Find or create chat room
    let chatRoom = findChatByContext(chats, serviceId, customerId, itemId);

    if (!chatRoom) {
      chatRoom = {
        id: randomUUID(),
        serviceId,
        serviceTitle: serviceTitle || 'Unknown',
        itemId: itemId || null,
        itemName: itemName || null,
        vendorId,
        vendorName: vendorName || 'Unknown',
        customerId,
        customerName: customerName || 'Unknown',
        messages: [],
        createdAt: new Date().toISOString(),
        dealStatus: null
      };
      chats.push(chatRoom);
    }

    // 6. Add message
    chatRoom.messages.push({
      id: randomUUID(),
      senderId: senderId,
      senderName: senderName || 'Unknown',
      message,
      timestamp: new Date().toISOString()
    });

    // 7. Save to file
    await writeChatsFile(chats);

    // 8. Return response
    return NextResponse.json({
      success: true,
      message: 'Pesan terkirim',
      data: chatRoom
    });
  } catch (error) {
    console.error('[chat] POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
