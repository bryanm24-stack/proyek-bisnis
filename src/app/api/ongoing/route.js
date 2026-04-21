import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// GET - Get ongoing deals
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole'); // 'customer' or 'vendor'

    if (!userId || !userRole) {
      return NextResponse.json({
        success: false,
        message: 'userId dan userRole diperlukan'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const servicesPath = path.join(process.cwd(), 'services.json');
    const chatsPath = path.join(process.cwd(), 'chats.json');
    const usersPath = path.join(process.cwd(), 'users.json');

    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    const chatsData = await fs.readFile(chatsPath, 'utf-8');
    const usersData = await fs.readFile(usersPath, 'utf-8');

    const deals = JSON.parse(dealsData);
    const services = JSON.parse(servicesData);
    const chats = JSON.parse(chatsData);
    const users = JSON.parse(usersData);

    let ongoingDeals = [];

    if (userRole === 'customer') {
      // Get deals where customer has accepted and status is agreed atau complain
      // Card tetap muncul meskipun ada complain
      ongoingDeals = deals.filter(d => 
        d.customerId === userId && 
        d.customerAccepted === true &&
        (d.status === 'agreed' || d.status === 'complain')
      );
    } else if (userRole === 'vendor') {
      // Get deals where vendor has accepted and status is agreed atau complain
      // Card tetap muncul meskipun ada complain
      ongoingDeals = deals.filter(d => 
        d.vendorId === userId && 
        d.vendorAccepted === true &&
        (d.status === 'agreed' || d.status === 'complain')
      );
    }

    // Enrich deals dengan informasi lengkap
    const enrichedDeals = ongoingDeals.map(deal => {
      const chat = chats.find(c => c.id === deal.chatId);
      const service = services.find(s => s.id === deal.serviceId);
      
      let otherUser = null;
      if (userRole === 'customer') {
        otherUser = users.find(u => u.id === deal.vendorId);
      } else {
        otherUser = users.find(u => u.id === deal.customerId);
      }

      return {
        ...deal,
        service,
        otherUser,
        chat,
        customerConfirmed: deal.customerConfirmed || false,
        vendorConfirmed: deal.vendorConfirmed || false,
        complains: deal.complains || []
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedDeals
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting ongoing deals:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// POST - Submit complain
export async function POST(request) {
  try {
    const body = await request.json();
    const { dealId, customerId, vendorId, photo, reason } = body;

    if (!dealId || !customerId || !photo || !reason) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi!'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    let deals = JSON.parse(dealsData);

    // Find the deal
    const dealIndex = deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Deal tidak ditemukan'
      }, { status: 404 });
    }

    // Add complain
    const complain = {
      id: `complain_${Date.now()}`,
      customerId,
      vendorId,
      photo,
      reason,
      createdAt: new Date().toISOString(),
      resolved: false
    };

    if (!deals[dealIndex].complains) {
      deals[dealIndex].complains = [];
    }
    deals[dealIndex].complains.push(complain);

    // Update status if not already in complain status
    if (deals[dealIndex].status !== 'complain') {
      deals[dealIndex].status = 'complain';
    }

    await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Complain berhasil dikirim',
      data: complain
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting complain:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}

// PUT - Update deal status (confirm)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { dealId, userId, userRole, action } = body;

    if (!dealId || !userId || !userRole || !action) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi!'
      }, { status: 400 });
    }

    if (!['confirm', 'complete'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Action hanya bisa confirm atau complete'
      }, { status: 400 });
    }

    const dealsPath = path.join(process.cwd(), 'deals.json');
    const dealsData = await fs.readFile(dealsPath, 'utf-8');
    let deals = JSON.parse(dealsData);

    // Find the deal
    const dealIndex = deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Deal tidak ditemukan'
      }, { status: 404 });
    }

    const deal = deals[dealIndex];

    if (action === 'confirm') {
      if (userRole === 'customer') {
        deal.customerConfirmed = true;
      } else if (userRole === 'vendor') {
        // Vendor hanya bisa confirm jika customer sudah confirm
        if (!deal.customerConfirmed) {
          return NextResponse.json({
            success: false,
            message: 'Customer harus confirm terlebih dahulu'
          }, { status: 400 });
        }
        deal.vendorConfirmed = true;
        deal.status = 'completed';
      }
    } else if (action === 'complete') {
      deal.status = 'completed';
    }

    await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Status deal berhasil diupdate',
      data: deal
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server.'
    }, { status: 500 });
  }
}
