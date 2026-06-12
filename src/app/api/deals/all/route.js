import { NextResponse } from 'next/server';


import { readData } from '@/lib/storage';

export async function GET(request) {
  try {

    const deals = await readData('deals');
    const chats = await readData('chats');
    const services = await readData('services');
    const vendorRegistrations = await readData('vendor_registrations');
    const users = await readData('users');

    console.log('API: Services loaded:', services.length, 'services');
    console.log('API: Services sample:', services.slice(0, 2).map(s => ({ id: s.id, title: s.title, price: s.price })));

    // Enrich deals dengan informasi detail
    const enrichedDeals = deals.map(deal => {
      const chat = chats.find(c => c.id === deal.chatId);
      const service = services.find(s => s.id === deal.serviceId);
      const vendor = users.find(u => u.id === deal.vendorId);
      const vendorReg = vendorRegistrations.find(vr => vr.vendorId === deal.vendorId);

      // Debug untuk deal tertentu
      if (deal.id === '1775917475078') {
        console.log('DEBUG - Deal 1775917475078:');
        console.log('  serviceId:', deal.serviceId);
        console.log('  service found:', !!service);
        console.log('  service.price:', service?.price);
        console.log('  vendorId:', deal.vendorId);
        console.log('  vendor found:', !!vendor);
        console.log('  vendor name:', vendor?.name);
      }

      // Tentukan item name dari layanan
      let itemName = 'N/A';
      if (vendorReg?.type === 'barang') {
        itemName = vendorReg?.namaBarang || 'Barang';
      } else if (vendorReg?.type === 'jasa') {
        itemName = vendorReg?.spesialisasi || 'Jasa';
      }

      // Jika tidak ada vendorReg, gunakan service title
      if (!itemName || itemName === 'N/A') {
        itemName = service?.title || vendorReg?.namaBarang || vendorReg?.spesialisasi || 'Layanan';
      }

      const vendorName = vendor?.name || vendor?.vendorName || chat?.vendorName || vendorReg?.vendorName || vendorReg?.namaToko || 'Unknown';

      return {
        ...deal,
        itemName: itemName,
        vendorName,
        totalPrice: service?.price || 0,
        customerName: chat?.customerName || 'Unknown',
        // Add service details untuk payment page
        description: service?.description || 'N/A',
        detailDescription: service?.detailDescription || service?.description || 'N/A',
        rating: service?.rating || 0,
        rentCount: service?.rentCount || '0',
        price: service?.price || 0,
        jenisBarang: service?.jenisBarang,
        spesifikBarang: service?.spesifikBarang,
        kebijakanKerusakan: service?.kebijakanKerusakan,
        dendaKeterlambatan: service?.dendaKeterlambatan,
        syaratKetentuan: service?.syaratKetentuan,
        jumlahBarang: service?.jumlahBarang,
        lokasi: service?.lokasi
      };
    });

    return NextResponse.json(enrichedDeals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json([], { status: 200 });
  }
}
