'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import SharedNavbar from '@/app/components/SharedNavbar';

const statusLabel = {
  PENDING_ADMIN: 'Menunggu Review Admin',
  FORWARDED_TO_VENDOR: 'Diteruskan ke Vendor',
  REFUND_PROCESSED: 'Vendor Selesai Memproses',
  RESOLVED: 'Selesai'
};

export default function AdminComplaintsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');

  const normalizePersonName = useCallback((value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' '), []);
  const normalizeAccountNumber = useCallback((value) => String(value || '').replace(/\D/g, ''), []);

  const fetchComplaints = useCallback(async (preferredId = null) => {
    try {
      const response = await fetch('/api/admin/complaints');
      const result = await response.json();
      if (result.success) {
        const nextComplaints = Array.isArray(result.data) ? result.data : [];
        setComplaints(nextComplaints);
        const nextSelectedId = preferredId || selectedId || nextComplaints[0]?.id || null;
        setSelectedId(nextSelectedId);
        const selected = nextComplaints.find((item) => item.id === nextSelectedId) || nextComplaints[0] || null;
        setNote(selected?.adminNote || '');
      }
    } catch (error) {
      console.error('Error loading admin komplain:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed.role !== 'admin') {
      router.push('/');
      return;
    }
    setUser(parsed);
    fetchComplaints();
  }, [router, fetchComplaints]);

  const selectedComplaint = useMemo(
    () => complaints.find((item) => item.id === selectedId) || null,
    [complaints, selectedId]
  );

  const expectedRecipientName = selectedComplaint?.customerAccountName || '';
  const expectedRecipientAccountNumber = selectedComplaint?.customerAccountNumber || '';
  const expectedRecipientBankName = selectedComplaint?.customerBankName || '';

  async function handleAction(action) {
    if (!selectedComplaint || !user?.id) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorRole: 'admin',
          adminId: user.id,
          action,
          note
        })
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Gagal memperbarui komplain');
      }
      await fetchComplaints(selectedComplaint.id);
    } catch (error) {
      alert(error.message || 'Gagal memperbarui komplain');
    } finally {
      setActionLoading(false);
    }
  }

  const summary = useMemo(() => ({
    pending: complaints.filter((item) => item.status === 'PENDING_ADMIN').length,
    forwarded: complaints.filter((item) => item.status === 'FORWARDED_TO_VENDOR').length,
    processed: complaints.filter((item) => item.status === 'REFUND_PROCESSED').length,
    resolved: complaints.filter((item) => item.status === 'RESOLVED').length
  }), [complaints]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat manajemen keluhan...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <SharedNavbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: '30px' }}>Manajemen Keluhan</h1>
        <p style={{ color: '#475569', margin: '8px 0 20px' }}>
          Admin menjadi mediator tunggal antara pelanggan dan vendor untuk komplain kerusakan maupun pembatalan yang sudah dibayar.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '18px' }}>
          {[
            ['Menunggu Admin', summary.pending, '#fff7ed', '#9a3412'],
            ['Ke Vendor', summary.forwarded, '#eff6ff', '#1d4ed8'],
            ['Diproses Vendor', summary.processed, '#fef3c7', '#92400e'],
            ['Selesai', summary.resolved, '#dcfce7', '#166534']
          ].map(([label, value, background, color]) => (
            <div key={label} style={{ background, color, borderRadius: '14px', padding: '16px', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>{label}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.92fr) minmax(0, 1.08fr)', gap: '18px', alignItems: 'start' }}>
          <section style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>Laporan Masuk</h2>
            </div>
            <div style={{ display: 'grid' }}>
              {complaints.length === 0 ? (
                <div style={{ padding: '18px 20px', color: '#64748b' }}>Belum ada komplain yang tercatat.</div>
              ) : complaints.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(complaint.id);
                    setNote(complaint.adminNote || '');
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '16px 20px',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    background: complaint.id === selectedId ? '#fff7ed' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>
                        {complaint.type === 'pembatalan' ? 'Pembatalan' : 'Kerusakan'}
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '13px', color: '#64748b' }}>
                        {complaint.customerName || 'Customer'} • {complaint.vendorDisplayName || complaint.vendorName || 'Vendor'}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>{statusLabel[complaint.status] || complaint.status}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                    {complaint.invoiceId || complaint.dealId || complaint.transactionId}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e5e7eb', padding: '20px' }}>
            {!selectedComplaint ? (
              <div style={{ color: '#64748b' }}>Pilih komplain untuk melihat detail mediasi.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px', color: '#0f172a' }}>Detail Komplain</h2>
                    <div style={{ color: '#64748b', fontSize: '14px' }}>{selectedComplaint.id}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#f8fafc', color: '#0f172a', fontWeight: '700' }}>
                    {statusLabel[selectedComplaint.status] || selectedComplaint.status}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div><strong>Customer:</strong> {selectedComplaint.customerName || '-'}</div>
                  <div><strong>Vendor:</strong> {selectedComplaint.vendorDisplayName || selectedComplaint.vendorName || '-'}</div>
                  <div><strong>Transaksi:</strong> {selectedComplaint.transactionId}</div>
                  <div><strong>Referensi:</strong> {selectedComplaint.invoiceId || selectedComplaint.dealId || '-'}</div>
                  <div><strong>Tipe:</strong> {selectedComplaint.type}</div>
                  <div><strong>Total:</strong> Rp {Number(selectedComplaint.totalAmount || 0).toLocaleString('id-ID')}</div>
                  <div><strong>Status pembayaran:</strong> {selectedComplaint.paymentStatus || selectedComplaint.transactionStatus || '-'}</div>
                  <div><strong>Layanan:</strong> {selectedComplaint.serviceTitle || '-'}</div>
                </div>

                <div style={{ marginBottom: '14px', padding: '14px', borderRadius: '14px', background: '#fff7ed', color: '#7c2d12', lineHeight: 1.55 }}>
                  {selectedComplaint.description || 'Tidak ada deskripsi tambahan.'}
                </div>

                <div style={{ marginBottom: '14px', padding: '14px', borderRadius: '14px', background: '#ecfeff', color: '#155e75', lineHeight: 1.55, border: '1px solid #bae6fd' }}>
                  <strong>Rekening Tujuan Refund (Customer):</strong><br />
                  Nama Rekening: {expectedRecipientName || '-'}<br />
                  Nomor Rekening: {expectedRecipientAccountNumber || '-'}<br />
                  Bank: {expectedRecipientBankName || '-'}
                </div>

                {selectedComplaint.evidenceUrl && (
                  <a href={selectedComplaint.evidenceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginBottom: '14px', color: '#b45309', fontWeight: '700' }}>
                    Lihat bukti terlampir
                  </a>
                )}

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'grid', gap: '6px', maxWidth: '240px' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>Nominal Refund</span>
                    <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                      Rp {Number(selectedComplaint.totalAmount || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {selectedComplaint.vendorNote && (
                  <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: '#f8fafc', color: '#334155' }}>
                    <strong>Catatan Vendor:</strong><br />
                    {selectedComplaint.vendorNote}
                  </div>
                )}

                {selectedComplaint.refundProofUrl && (
                  <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: '#f0fdf4', color: '#166534' }}>
                    <strong>Detail Pembayaran Refund Vendor:</strong><br />
                    Metode: {selectedComplaint.refundMethod || '-'}<br />
                    Referensi: {selectedComplaint.refundReference || '-'}<br />
                    Waktu bayar: {selectedComplaint.refundPaidAt ? new Date(selectedComplaint.refundPaidAt).toLocaleString('id-ID') : '-'}<br />
                    <a href={selectedComplaint.refundProofUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', textDecoration: 'underline', fontWeight: '700' }}>
                      Lihat bukti refund vendor
                    </a>
                  </div>
                )}

                {selectedComplaint.status === 'REFUND_PROCESSED' && (
                  <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}>
                    <strong>Review Admin:</strong>
                    <div style={{ marginTop: '8px', color: '#475569', lineHeight: 1.75 }}>
                      Admin hanya meninjau bukti refund dan data refund yang dikirim vendor. Verifikasi rekening akhir tidak diperlukan lagi.
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
                  {selectedComplaint.status === 'PENDING_ADMIN' && (
                    <button
                      onClick={() => handleAction('forward_to_vendor')}
                      disabled={actionLoading}
                      style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 16px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Teruskan ke Vendor
                    </button>
                  )}

                  {selectedComplaint.status === 'REFUND_PROCESSED' && (
                    <button
                      onClick={() => handleAction('resolve')}
                      disabled={actionLoading}
                      style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 16px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Selesaikan Komplain
                    </button>
                  )}

                  {selectedComplaint.status === 'FORWARDED_TO_VENDOR' && (
                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: '700' }}>
                      Menunggu vendor mengonfirmasi pemrosesan refund berdasarkan instruksi admin.
                    </div>
                  )}

                  {selectedComplaint.status === 'RESOLVED' && (
                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontWeight: '700' }}>
                      Komplain sudah ditutup dan hasilnya terlihat oleh pelanggan.
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
