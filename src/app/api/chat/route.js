import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const CHATS_FILE = path.join(process.cwd(), 'chats.json');
const DEALS_FILE = path.join(process.cwd(), 'deals.json');

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

// HELPER: Baca deals.json
async function readDealsFile() {
  try {
    const data = await fs.readFile(DEALS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[chat] Failed to read deals file:', error.message);
    return [];
  }
}

// HELPER: Check if chat should be closed (deal is completed)
async function isChatClosed(chatId) {
  const deals = await readDealsFile();
  const deal = deals.find(d => d.chatId === chatId);
  
  // Chat ditutup jika:
  // 1. Deal status = 'completed' (pembayaran selesai)
  // 2. Deal status = 'cancelled' (deal ditolak)
  if (deal && (deal.status === 'completed' || deal.status === 'cancelled')) {
    return true;
  }
  
  return false;
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
    const serviceId = searchParams.get('serviceId');
    const customerId = searchParams.get('customerId');
    const itemId = searchParams.get('itemId');

    if (!serviceId || !customerId) {
      return NextResponse.json(
        { success: false, message: 'serviceId dan customerId required' },
        { status: 400 }
      );
    }

    const chats = await readChatsFile();
    const chat = findChatByContext(chats, serviceId, customerId, itemId);

    // Cek apakah chat sudah ditutup (deal completed/cancelled)
    if (chat) {
      const closed = await isChatClosed(chat.id);
      if (closed) {
        // Chat sudah ditutup, return null untuk trigger buat chat baru
        console.log('[chat] Chat sudah closed, return null untuk buat chat baru');
        return NextResponse.json({
          success: true,
          data: null
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: chat || null
    });
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
    
    // Cek apakah chat lama sudah closed (deal completed/cancelled)
    let shouldCreateNewChat = false;
    if (chatRoom) {
      const closed = await isChatClosed(chatRoom.id);
      if (closed) {
        console.log('[chat] Chat lama sudah closed, akan buat chat baru');
        shouldCreateNewChat = true;
        chatRoom = null; // Reset untuk buat baru
      }
    }

    if (!chatRoom) {
      chatRoom = {
        id: Date.now().toString(),
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
      
      if (shouldCreateNewChat) {
        console.log('[chat] Berhasil buat chat baru dengan ID:', chatRoom.id);
      }
    }

    // 6. Add message
    chatRoom.messages.push({
      id: Date.now().toString(),
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
