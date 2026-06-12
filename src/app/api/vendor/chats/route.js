import { NextResponse } from 'next/server';


import { readData, writeData } from '@/lib/storage';
function getChatContextKey(chat) {
  return [
    String(chat.serviceId || ''),
    String(chat.customerId || ''),
    String(chat.vendorId || ''),
    String(chat.itemId || '')
  ].join('|');
}

function mergeChatMessages(target, source) {
  const existing = new Set((target.messages || []).map((message) => {
    return message.id || `${message.senderId}|${message.timestamp}|${message.message}`;
  }));

  for (const message of source.messages || []) {
    const messageKey = message.id || `${message.senderId}|${message.timestamp}|${message.message}`;
    if (!existing.has(messageKey)) {
      target.messages.push(message);
      existing.add(messageKey);
    }
  }

  target.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function dedupeChats(chats) {
  const mergedChats = new Map();

  for (const chat of chats) {
    const key = getChatContextKey(chat);
    const existing = mergedChats.get(key);

    if (!existing) {
      mergedChats.set(key, {
        ...chat,
        messages: [...(chat.messages || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      });
      continue;
    }

    if (new Date(chat.createdAt || 0) > new Date(existing.createdAt || 0)) {
      mergedChats.set(key, {
        ...chat,
        messages: [...(existing.messages || [])]
      });
      mergeChatMessages(mergedChats.get(key), chat);
    } else {
      mergeChatMessages(existing, chat);
    }
  }

  return Array.from(mergedChats.values()).sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || a.messages?.[a.messages.length - 1]?.timestamp || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || b.messages?.[b.messages.length - 1]?.timestamp || 0).getTime();
    return bTime - aTime;
  });
}

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

    const chatsData = await readData('chats');
    const chats = chatsData;

    // Filter chats untuk vendor ini - bisa sebagai vendor (vendorId) atau sebagai customer (customerId)
    // Ini memungkinkan vendor menjalin hubungan dengan vendor lain dengan bertindak sebagai customer
    const vendorChats = dedupeChats(
      chats.filter(c => String(c.vendorId) === String(vendorId) || String(c.customerId) === String(vendorId))
    );

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
