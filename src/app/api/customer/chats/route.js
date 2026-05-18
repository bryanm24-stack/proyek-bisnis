import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

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
    const customerChats = dedupeChats(
      chats.filter(c => String(c.customerId) === String(customerId))
    );

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
