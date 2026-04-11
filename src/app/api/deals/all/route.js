import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const readJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

export async function GET(request) {
  try {
    const dealsPath = path.join(process.cwd(), 'deals.json');
    const chatsPath = path.join(process.cwd(), 'chats.json');
    const servicesPath = path.join(process.cwd(), 'services.json');
    const vendorRegistrationsPath = path.join(process.cwd(), 'vendor_registrations.json');
    const usersPath = path.join(process.cwd(), 'users.json');

    const deals = await readJsonFile(dealsPath);
    const chats = await readJsonFile(chatsPath);
    const services = await readJsonFile(servicesPath);
    const vendorRegistrations = await readJsonFile(vendorRegistrationsPath);
    const users = await readJsonFile(usersPath);

    // Enrich deals dengan informasi detail
    const enrichedDeals = deals.map(deal => {
      const chat = chats.find(c => c.id === deal.chatId);
      const service = services.find(s => s.id === deal.serviceId);
      const vendor = users.find(u => u.id === deal.vendorId);
      const vendorReg = vendorRegistrations.find(vr => vr.vendorId === deal.vendorId);

      // Tentukan item name dari layanan
      let itemName = 'N/A';
      if (vendorReg?.type === 'barang') {
        itemName = vendorReg?.namaBarang || 'Barang';
      } else if (vendorReg?.type === 'jasa') {
        itemName = vendorReg?.spesialisasi || 'Jasa';
      }

      // Jika tidak ada vendorReg, gunakan service title
      if (!itemName || itemName === 'N/A') {
        itemName = service?.title || 'Layanan';
      }

      return {
        ...deal,
        itemName: itemName,
        vendorName: vendor?.name || vendor?.vendorName || 'Unknown',
        totalPrice: service?.price || 0,
        customerName: chat?.customerName || 'Unknown'
      };
    });

    return NextResponse.json(enrichedDeals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json([], { status: 200 });
  }
}
