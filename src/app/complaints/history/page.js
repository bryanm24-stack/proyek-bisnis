import { redirect } from 'next/navigation';

export default function LegacyComplaintHistoryPage() {
  redirect('/riwayat-transaksi?tab=complaints');
}
