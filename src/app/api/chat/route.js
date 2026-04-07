import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// GET - Get chat conversation between customer and vendor
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const customerId = searchParams.get('customerId');

    if (!serviceId || !customerId) {
      return NextResponse.json({
        success: false,
        message: 'serviceId dan customerId diperlukan'
      }, { status: 400 });
    }

    const chatsPath = path.join(process.cwd(), 'chats.json');
    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);

    const chatRoom = chats.find(
      c => c.serviceId === serviceId && c.customerId === customerId
    );

    return NextResponse.json({
      success: true,
      data: chatRoom || null
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting chat:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// POST - Send chat message or create new chat room
export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, serviceTitle, vendorId, vendorName, customerId, customerName, message } = body;

    if (!serviceId || !vendorId || !customerId || !message) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi!'
      }, { status: 400 });
    }

    const chatsPath = path.join(process.cwd(), 'chats.json');
    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const chats = JSON.parse(chatsData);

    // Cari chat room yang sudah ada
    let chatRoom = chats.find(
      c => c.serviceId === serviceId && c.customerId === customerId
    );

    if (!chatRoom) {
      // Buat chat room baru
      chatRoom = {
        id: Date.now().toString(),
        serviceId,
        serviceTitle,
        vendorId,
        vendorName,
        customerId,
        customerName,
        messages: [],
        createdAt: new Date().toISOString(),
        dealStatus: null // pending, approved, rejected
      };
      chats.push(chatRoom);
    }

    // Tambah pesan baru
    chatRoom.messages.push({
      id: Date.now().toString(),
      senderId: customerId,
      senderName: customerName,
      message,
      timestamp: new Date().toISOString()
    });

    await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil dikirim',
      data: chatRoom
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending chat:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
