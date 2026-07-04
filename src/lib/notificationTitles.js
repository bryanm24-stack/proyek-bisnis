/**
 * Mapping notification types ke judul yang readable dalam Bahasa Indonesia
 */
export const getNotificationTitle = (type) => {
  const titleMap = {
    // Komplain
    'complaint_created': 'Komplain Baru',
    'complaint_forwarded_to_vendor': 'Komplain Diteruskan ke Vendor',
    'complaint_vendor_processed': 'Vendor Memproses Komplain',
    'complaint_resolved': 'Komplain Terselesaikan',
    'complaint_refund_initiated': 'Pengembalian Dana Dimulai',
    'complaint_refund_completed': 'Pengembalian Dana Selesai',

    // Deal/Penawaran
    'deal_pending': 'Penawaran Baru',
    'deal_accepted': 'Penawaran Diterima',
    'deal_rejected': 'Penawaran Ditolak',
    'deal_discount_applied': 'Diskon Diterapkan',

    // Booking
    'booking_confirmed': 'Pemesanan Dikonfirmasi',
    'booking_completed': 'Pemesanan Selesai',
    'booking_cancelled': 'Pemesanan Dibatalkan',

    // Return
    'return_requested': 'Pengembalian Diminta',
    'return_approved': 'Pengembalian Disetujui',
    'return_rejected': 'Pengembalian Ditolak',
    'return_completed': 'Pengembalian Selesai',

    // Chat
    'chat_message': 'Pesan Baru',

    // System
    'payment_received': 'Pembayaran Diterima',
    'payment_pending': 'Pembayaran Tertunda',
  };

  // Normalize type ke lowercase jika belum
  const normalizedType = String(type).toLowerCase();
  return titleMap[normalizedType] || type || 'Notifikasi';
};
