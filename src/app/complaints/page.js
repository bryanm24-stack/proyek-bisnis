'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import SharedNavbar from '@/app/components/SharedNavbar';
import styles from './complaints.module.css';

const complaintTypes = [
  {
    value: 'kerusakan',
    title: 'Kerusakan Barang / Jasa',
    description: 'Laporkan kerusakan, kualitas jasa buruk, atau hasil layanan yang tidak sesuai.'
  },
  {
    value: 'pembatalan',
    title: 'Pembatalan',
    description: 'Untuk transaksi yang sudah dibayar dan perlu dimediasi admin sebelum refund diproses.'
  }
];

const statusTheme = {
  PENDING_ADMIN: { label: 'Menunggu Admin', background: '#fff7ed', color: '#9a3412' },
  FORWARDED_TO_VENDOR: { label: 'Instruksi ke Vendor', background: '#eff6ff', color: '#1d4ed8' },
  REFUND_PROCESSED: { label: 'Diproses Vendor', background: '#fef3c7', color: '#92400e' },
  RESOLVED: { label: 'Selesai', background: '#dcfce7', color: '#166534' }
};

export default function ComplaintsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [confirmingId, setConfirmingId] = useState(null);
  const [referenceId, setReferenceId] = useState('');
  const [type, setType] = useState('kerusakan');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [submitterLabel, setSubmitterLabel] = useState('Pengguna');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        router.push('/login');
        return;
      }
      const parsed = JSON.parse(raw);
      if (!['customer', 'member', 'vendor'].includes(parsed.role)) {
        router.push('/');
        return;
      }
      setUser(parsed);
      setSubmitterLabel(parsed.role === 'vendor' ? 'Vendor' : 'Customer');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;
    loadComplaints(user.id);
  }, [user?.id]);

  async function loadComplaints(userId) {
    setListLoading(true);
    setListError('');
    try {
      const response = await fetch(`/api/complaints?userId=${userId}&scope=active`);
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Gagal memuat komplain aktif');
      }
      setComplaints(Array.isArray(result.data) ? result.data : []);
    } catch (loadError) {
      setListError(loadError.message || 'Gagal memuat komplain aktif');
    } finally {
      setListLoading(false);
    }
  }

  function handleFileChange(event) {
    setEvidenceFiles(Array.from(event.target.files || []));
  }

  async function handleConfirmReceipt(complaintId) {
    if (!user?.id) return;
    setConfirmingId(complaintId);
    try {
      const response = await fetch(`/api/admin/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorRole: 'customer',
          actorId: user.id,
          action: 'customer_confirm_receipt'
        })
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Gagal mengonfirmasi penerimaan');
      }
      await loadComplaints(user.id);
      alert('Terima kasih, Anda telah mengonfirmasi penerimaan hasil komplain/refund.');
    } catch (submitError) {
      setError(submitError.message || 'Gagal mengonfirmasi penerimaan');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.id) return;
    if (!referenceId.trim()) {
      setError('Tagihan / Deal ID wajib diisi');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('referenceId', referenceId.trim());
      form.append('userId', user.id);
      form.append('type', type);
      form.append('description', description.trim());
      evidenceFiles.forEach((file) => form.append('evidence', file));

      const response = await fetch('/api/complaints', {
        method: 'POST',
        body: form
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Gagal mengajukan komplain');
      }

      setReferenceId('');
      setDescription('');
      setEvidenceFiles([]);
      await loadComplaints(user.id);
      alert(result.message || 'Komplain berhasil diajukan');
    } catch (submitError) {
      setError(submitError.message || 'Gagal mengajukan komplain');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat halaman komplain...</div>;
  }

  return (
    <div className={styles.page}>
      <SharedNavbar />
      <main className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.kicker}>Komplain Terpisah Dari Retur</span>
          <h1 className={styles.title}>Buat Laporan Komplain</h1>
          <p className={styles.subtitle}>
            Halaman ini dipisahkan dari retur agar komplain kerusakan dan pembatalan tidak tercampur dengan proses pengembalian biasa.
            Komplain bisa diajukan oleh customer maupun vendor (saat menjadi penyewa), dan semua mediasi berjalan melalui admin.
          </p>
        </div>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <h2 className={styles.panelTitle}>Buat Laporan Komplain ({submitterLabel})</h2>
              <p className={styles.panelDesc}>Isi referensi transaksi yang valid lalu pilih jenis komplain yang sesuai.</p>

              <div className={styles.alert}>
                <strong>Perhatian:</strong> jenis <strong>Pembatalan</strong> dipakai untuk transaksi yang sudah dibayar dan akan otomatis dibuat sebagai draft mediasi admin.
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label className={styles.label}>Tagihan / Deal ID</label>
                  <input
                    className={styles.input}
                    placeholder="Contoh: #INV-1778 atau DEAL-123"
                    value={referenceId}
                    onChange={(event) => setReferenceId(event.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Jenis Komplain</label>
                  <div className={styles.switchRow}>
                    {complaintTypes.map((item) => {
                      const active = item.value === type;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          className={`${styles.switchCard} ${active ? styles.switchCardActive : ''}`}
                          onClick={() => setType(item.value)}
                        >
                          <div className={styles.switchTitle}>{item.title}</div>
                          <div className={styles.switchText}>{item.description}</div>
                        </button>
                      );
                    })}
                  </div>
                  <select className={styles.select} value={type} onChange={(event) => setType(event.target.value)}>
                    <option value="kerusakan">Kerusakan Barang / Jasa</option>
                    <option value="pembatalan">Pembatalan</option>
                  </select>
                  <span className={styles.hint}>Dropdown tetap disediakan agar spesifikasi input eksplisit, tetapi kartu pilihan dibuat berbeda agar tidak tertukar dengan retur.</span>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Deskripsi Komplain (opsional)</label>
                  <textarea
                    className={styles.textarea}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={type === 'pembatalan'
                      ? 'Tuliskan alasan pembatalan, contoh: jadwal batal, layanan tidak dapat dipenuhi, atau kebutuhan refund.'
                      : 'Jelaskan kerusakan atau masalah layanan yang Anda alami.'}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Foto Bukti</label>
                  <input className={styles.fileInput} type="file" accept="image/*" multiple onChange={handleFileChange} />
                  <div className={styles.fileNote}>
                    Bukti visual bersifat opsional, tetapi sangat membantu admin saat memediasi komplain dengan vendor.
                  </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <button className={styles.submit} type="submit" disabled={submitting}>
                  {submitting ? 'Mengirim Komplain...' : 'Ajukan Komplain'}
                </button>
              </form>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <h2 className={styles.panelTitle}>Komplain Aktif Anda / Vendor</h2>
              <p className={styles.panelDesc}>Halaman ini fokus untuk komplain aktif. Riwayat lengkap ada di menu Riwayat Transaksi.</p>

              {listLoading ? (
                <div className={styles.empty}>Memuat komplain aktif...</div>
              ) : listError ? (
                <div className={styles.error}>{listError}</div>
              ) : complaints.length === 0 ? (
                <div className={styles.empty}>Tidak ada komplain aktif. Cek menu Riwayat Transaksi untuk daftar selesai.</div>
              ) : (
                <div className={styles.list}>
                  {complaints.map((complaint) => {
                    const theme = statusTheme[complaint.status] || statusTheme.PENDING_ADMIN;
                    return (
                      <article key={complaint.id} className={styles.card}>
                        <div className={styles.cardTop}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1f2937' }}>
                              {complaint.type === 'pembatalan' ? 'Komplain Pembatalan' : 'Komplain Kerusakan'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                              Referensi: {complaint.invoiceId || complaint.dealId || complaint.transactionId}
                            </div>
                          </div>
                          <span className={styles.badge} style={{ background: theme.background, color: theme.color }}>
                            {theme.label}
                          </span>
                        </div>

                        <div className={styles.meta}>
                          <div>Vendor: {complaint.vendorDisplayName || complaint.vendorName || '-'}</div>
                          <div>Layanan: {complaint.serviceTitle || '-'}</div>
                          <div>Total transaksi: Rp {Number(complaint.totalAmount || 0).toLocaleString('id-ID')}</div>
                          <div>Dibuat: {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString('id-ID') : '-'}</div>
                        </div>

                        <div className={styles.description}>
                          {complaint.description || 'Tidak ada deskripsi tambahan.'}
                        </div>

                        {complaint.adminNote && (
                          <div className={styles.noteBlock}>
                            <strong>Catatan Admin:</strong><br />
                            {complaint.adminNote}
                          </div>
                        )}

                        {complaint.vendorNote && (
                          <div className={styles.noteBlock}>
                            <strong>Catatan Vendor:</strong><br />
                            {complaint.vendorNote}
                          </div>
                        )}

                        {complaint.refundProofUrl && (
                          <div className={styles.noteBlock}>
                            <strong>Refund sudah dibayar vendor:</strong><br />
                            Metode: {complaint.refundMethod || '-'}<br />
                            Referensi: {complaint.refundReference || '-'}<br />
                            Waktu bayar: {complaint.refundPaidAt ? new Date(complaint.refundPaidAt).toLocaleString('id-ID') : '-'}<br />
                            <a className={styles.evidenceLink} href={complaint.refundProofUrl} target="_blank" rel="noreferrer">
                              Lihat bukti refund vendor
                            </a>
                          </div>
                        )}

                        {complaint.evidenceUrl && (
                          <a className={styles.evidenceLink} href={complaint.evidenceUrl} target="_blank" rel="noreferrer">
                            Lihat bukti terlampir
                          </a>
                        )}

                        {complaint.status === 'RESOLVED' && !complaint.customerConfirmedAt && (
                          <button
                            type="button"
                            onClick={() => handleConfirmReceipt(complaint.id)}
                            disabled={confirmingId === complaint.id}
                            style={{ marginTop: '10px', border: 'none', borderRadius: '10px', padding: '10px 12px', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {confirmingId === complaint.id ? 'Mengonfirmasi...' : 'Konfirmasi Penerimaan'}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
