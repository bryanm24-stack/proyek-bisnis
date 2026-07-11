'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import SharedNavbar from '@/app/components/SharedNavbar';

const statusLabel = {
  FORWARDED_TO_VENDOR: 'Instruksi Refund Masuk',
  REFUND_PROCESSED: 'Sudah Dikonfirmasi',
  RESOLVED: 'Selesai Ditutup Admin'
};

export default function VendorComplaintsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesById, setNotesById] = useState({});
  const [methodById, setMethodById] = useState({});
  const [referenceById, setReferenceById] = useState({});
  const [paidAtById, setPaidAtById] = useState({});
  const [proofById, setProofById] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed.role !== 'vendor') {
      router.push('/');
      return;
    }
    setUser(parsed);
    loadComplaints(parsed.id);
  }, [router]);

  async function loadComplaints(vendorId) {
    try {
      const response = await fetch(`/api/vendor/complaints?vendorId=${vendorId}&scope=active`);
      const result = await response.json();
      if (result.success) {
        setComplaints(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Error loading vendor complaints:', error);
    } finally {
      setLoading(false);
    }
  }

  async function submitRefundPayment(complaintId) {
    if (!user?.id) return;
    if (!methodById[complaintId]) {
      alert('Metode refund wajib diisi');
      return;
    }
    if (!proofById[complaintId]) {
      alert('Bukti refund wajib diunggah');
      return;
    }

    setSavingId(complaintId);
    try {
      const form = new FormData();
      form.append('actorRole', 'vendor');
      form.append('vendorId', user.id);
      form.append('action', 'submit_refund_payment');
      form.append('vendorNote', notesById[complaintId] || '');
      form.append('note', notesById[complaintId] || '');
      form.append('refundMethod', methodById[complaintId] || '');
      form.append('refundReference', referenceById[complaintId] || '');
      form.append('refundMetadata', JSON.stringify({
        selectedMethod: methodById[complaintId] || '',
        refundReference: referenceById[complaintId] || ''
      }));
      form.append('refundPaidAt', paidAtById[complaintId] || new Date().toISOString());
      form.append('refundProof', proofById[complaintId]);

      const response = await fetch(`/api/admin/complaints/${complaintId}`, {
        method: 'PATCH',
        body: form
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Gagal mengirim bukti refund');
      }
      await loadComplaints(user.id);
    } catch (error) {
      alert(error.message || 'Gagal mengirim bukti refund');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat instruksi komplain vendor...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <SharedNavbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '28px', color: '#0f172a' }}>Instruksi Komplain Vendor</h1>
        <p style={{ margin: '0 0 20px', color: '#475569' }}>
          Vendor hanya menerima komplain aktif hasil mediasi admin. Riwayat lengkap tersedia di menu Riwayat Transaksi.
        </p>

        {complaints.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px', color: '#64748b' }}>
            Belum ada komplain aktif dari admin.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {complaints.map((complaint) => (
              <article key={complaint.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#0f172a' }}>{complaint.serviceTitle || 'Layanan tanpa judul'}</h2>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>Complaint ID: {complaint.id}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: '800' }}>
                    {statusLabel[complaint.status] || complaint.status}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#334155' }}>
                  <div><strong>Jenis:</strong> {complaint.type}</div>
                  <div><strong>Transaksi:</strong> {complaint.transactionId}</div>
                  <div><strong>Referensi:</strong> {complaint.invoiceId || complaint.dealId || '-'}</div>
                  <div><strong>Nominal refund:</strong> Rp {Number(complaint.refundAmount || 0).toLocaleString('id-ID')}</div>
                </div>

                {complaint.refundProofUrl && (
                  <div style={{ padding: '14px', borderRadius: '14px', background: '#f0fdf4', color: '#166534', lineHeight: 1.5, marginBottom: '12px' }}>
                    <strong>Refund sudah disubmit vendor.</strong><br />
                    Metode: {complaint.refundMethod || '-'}<br />
                    Referensi: {complaint.refundReference || '-'}<br />
                    Waktu bayar: {complaint.refundPaidAt ? new Date(complaint.refundPaidAt).toLocaleString('id-ID') : '-'}<br />
                    <a href={complaint.refundProofUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', textDecoration: 'underline', fontWeight: '700' }}>Lihat bukti refund</a>
                  </div>
                )}

                {/* Show customer bank info for vendor reference (read-only) */}
                {complaint.customerAccountName && (
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#fff7ed', color: '#7c2d12', marginBottom: '12px' }}>
                    <strong>Rekening Tujuan (Customer):</strong><br />
                    Nama: {complaint.customerAccountName}<br />
                    Nomor: {complaint.customerAccountNumber || '-'}<br />
                    Bank: {complaint.customerBankName || '-'}
                  </div>
                )}

                {complaint.description && (
                  <div style={{ padding: '14px', borderRadius: '14px', background: '#f8fafc', color: '#334155', lineHeight: 1.5, marginBottom: '12px' }}>
                    <strong>Ringkasan komplain customer:</strong><br />
                    {complaint.description}
                  </div>
                )}

                {complaint.evidenceUrl && (
                  <a href={complaint.evidenceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginBottom: '12px', color: '#b45309', fontWeight: '700' }}>
                    Lihat bukti komplain
                  </a>
                )}

                <textarea
                  value={notesById[complaint.id] || complaint.vendorNote || ''}
                  onChange={(event) => setNotesById((prev) => ({ ...prev, [complaint.id]: event.target.value }))}
                  placeholder="Catatan pemrosesan refund dari vendor"
                  style={{ width: '100%', minHeight: '88px', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '12px', boxSizing: 'border-box', marginBottom: '12px' }}
                />

                {complaint.status === 'FORWARDED_TO_VENDOR' ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <select
                        value={methodById[complaint.id] || ''}
                        onChange={(event) => {
                          setMethodById((prev) => ({ ...prev, [complaint.id]: event.target.value }));
                          if (event.target.value === 'Transfer Bank' && complaint.vendorAccountNumber) {
                            setReferenceById((prev) => ({ ...prev, [complaint.id]: complaint.vendorAccountNumber }));
                          } else if (event.target.value === 'Cash on Delivery (COD)') {
                            setReferenceById((prev) => ({ ...prev, [complaint.id]: '' }));
                          }
                        }}
                        style={{ borderRadius: '12px', border: '1px solid #cbd5e1', padding: '12px', background: '#fff' }}
                      >
                        <option value="">Pilih metode refund</option>
                        <option value="Transfer Bank">Transfer Bank</option>
                        <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                      </select>

                      {methodById[complaint.id] === 'Transfer Bank' && complaint.vendorAccountNumber && (
                        <div style={{ padding: '12px', borderRadius: '12px', background: '#ecfeff', border: '1px solid #bae6fd', color: '#0c4a6e' }}>
                          <div style={{ fontWeight: '700', marginBottom: '8px' }}>📌 Data Rekening Bank Anda:</div>
                          <div style={{ marginBottom: '6px' }}>
                            <strong>Nomor Rekening:</strong> {complaint.vendorAccountNumber}
                          </div>
                          {complaint.vendorAccountHolder && (
                            <div>
                              <strong>Nama Pengirim:</strong> {complaint.vendorAccountHolder}
                            </div>
                          )}
                          {complaint.vendorBankName && (
                            <div>
                              <strong>Bank:</strong> {complaint.vendorBankName}
                            </div>
                          )}
                        </div>
                      )}

                      {methodById[complaint.id] === 'Cash on Delivery (COD)' && (
                        <div style={{ padding: '12px', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
                          <div style={{ fontWeight: '700' }}>📍 Refund via Tunai saat COD</div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>Pembeli akan menerima uang tunai saat pengiriman.</div>
                        </div>
                      )}

                      {methodById[complaint.id] === 'Transfer Bank' && (
                        <input
                          type="text"
                          placeholder="Nomor referensi transfer (opsional - override nomor rekening di atas jika berbeda)"
                          value={referenceById[complaint.id] || ''}
                          onChange={(event) => setReferenceById((prev) => ({ ...prev, [complaint.id]: event.target.value }))}
                          style={{ borderRadius: '12px', border: '1px solid #cbd5e1', padding: '12px' }}
                        />
                      )}

                      <input
                        type="datetime-local"
                        value={paidAtById[complaint.id] || ''}
                        onChange={(event) => setPaidAtById((prev) => ({ ...prev, [complaint.id]: event.target.value }))}
                        style={{ borderRadius: '12px', border: '1px solid #cbd5e1', padding: '12px' }}
                      />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setProofById((prev) => ({ ...prev, [complaint.id]: event.target.files?.[0] || null }))}
                      style={{ borderRadius: '12px', border: '1px solid #cbd5e1', padding: '12px', background: '#fff' }}
                    />
                    <button
                      onClick={() => submitRefundPayment(complaint.id)}
                      disabled={savingId === complaint.id}
                      style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 16px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      {savingId === complaint.id ? 'Mengirim Bukti Refund...' : 'Sudah Refund (Kirim Bukti)'}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px', borderRadius: '12px', background: complaint.status === 'REFUND_PROCESSED' ? '#dcfce7' : '#f8fafc', color: complaint.status === 'REFUND_PROCESSED' ? '#166534' : '#475569', fontWeight: '700' }}>
                    {complaint.status === 'REFUND_PROCESSED'
                      ? 'Bukti refund sudah terkirim. Menunggu verifikasi admin sebelum komplain ditutup.'
                      : 'Komplain ini sudah ditutup admin.'}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
